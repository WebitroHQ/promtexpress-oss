import { z } from "zod";
import { db } from "@/db/client";
import { resolveEngine } from "@/lib/engines/registry";
import { resolveRoleEngine } from "@/lib/pipeline/v2/role-engine";
import { extractJson } from "@/lib/pipeline/v2/json-extract";
import { loadRoleBrief, composeSystemPromptWithExemplars } from "@/lib/pipeline/v2/role-brief";
import { buildDistillerUserPrompt } from "./distiller-prompt";

// ── Zod Schema ──────────────────────────────────────────────────────────────

const SourceQuote = z.object({
  text: z.string().min(10),
  contextHint: z.string().optional(),
});

// Shared fields (as plain object to avoid .extend() discriminatedUnion issues)
const BaseFields = {
  targetSlug: z.string().nullable().optional(),
  rationale: z.string().min(20),
  sourceQuotes: z.array(SourceQuote).min(1),
};

const ConstitutionPayload = z.object({
  versionLabel: z.string(),
  bodyMarkdown: z.string().min(50),
  changelogNote: z.string(),
});

const PersonaPayload = z.object({
  domainSlug: z.string(),
  name: z.string(),
  body: z.string().min(50),
  jargon: z.array(z.string()).default([]),
  frameworks: z.array(z.string()).default([]),
  antiPatterns: z.array(z.string()).default([]),
});

const AntiPatternPayload = z.object({
  domainSlug: z.string().nullable(),
  pattern: z.string().min(2),
  isRegex: z.boolean().default(false),
  severity: z.enum(["info", "warn", "error"]).default("warn"),
  rationale: z.string().min(20),
});

const ExemplarPayload = z.object({
  domainSlug: z.string().nullable().optional(),
  modality: z.enum(["text", "code", "image", "video", "audio", "music"]).default("text"),
  title: z.string(),
  promptText: z.string().min(20),
  notes: z.string().nullable().optional(),
});

const Proposal = z.discriminatedUnion("type", [
  z.object({ ...BaseFields, type: z.literal("CONSTITUTION_UPDATE"), payload: ConstitutionPayload }),
  z.object({ ...BaseFields, type: z.literal("PERSONA_UPDATE"), payload: PersonaPayload }),
  z.object({ ...BaseFields, type: z.literal("ANTIPATTERN"), payload: AntiPatternPayload }),
  z.object({ ...BaseFields, type: z.literal("EXEMPLAR"), payload: ExemplarPayload }),
]);

const DistillerOutput = z.object({ proposals: z.array(Proposal) });

// ── Types ────────────────────────────────────────────────────────────────────

export type DistillSnapshotResult = {
  distillationsCreated: number;
  byType: Record<"CONSTITUTION_UPDATE" | "PERSONA_UPDATE" | "ANTIPATTERN" | "EXEMPLAR", number>;
  rawResponseLength: number;
  errors: string[];
};

// ── Main function ─────────────────────────────────────────────────────────────

export async function distillSnapshot(snapshotId: string): Promise<DistillSnapshotResult> {
  const byType: DistillSnapshotResult["byType"] = {
    CONSTITUTION_UPDATE: 0,
    PERSONA_UPDATE: 0,
    ANTIPATTERN: 0,
    EXEMPLAR: 0,
  };
  const errors: string[] = [];

  const snapshot = await db.trainingSnapshot.findUnique({
    where: { id: snapshotId },
    include: { resource: true },
  });
  if (!snapshot) throw new Error(`TrainingSnapshot not found: ${snapshotId}`);

  // Idempotency
  const existingCount = await db.trainingDistillation.count({
    where: { snapshotIds: { has: snapshotId } },
  });
  if (existingCount > 0) {
    return { distillationsCreated: 0, byType, rawResponseLength: 0, errors: [] };
  }

  const roleResolved = await resolveRoleEngine("DISTILLER", 6);
  // RoleBrief'i ortak loader üzerinden çek (cache + outputSchema + exemplars)
  const roleBrief = await loadRoleBrief("DISTILLER", 6);

  const engine = await resolveEngine(roleResolved.engineId);
  const userPrompt = buildDistillerUserPrompt(snapshot, snapshot.resource);

  // Direktif #10: Few-shot exemplars ortak helper ile system prompt'a eklenir
  // (synthesizer/intent-analyzer ile aynı format → motor tutarlı davranış görür).
  const systemPromptWithExamples = composeSystemPromptWithExemplars(roleBrief);

  // Adapter'a outputSchema ve generous maxTokens geçir — DistillerOutput çoklu
  // proposal içerebilir (4 proposal × ~500 token = ~2000), 8192 emniyetli üst sınır.
  // Eğer motor meta'sında daha düşük cap varsa adapter onu uygular (eski davranış).
  const output = await engine.adapter.generate({
    systemPrompt: systemPromptWithExamples,
    userMessage: userPrompt,
    responseFormat: "json",
    outputSchema: (roleBrief.outputSchema ?? undefined) as Record<string, unknown> | undefined,
    maxTokens: 8192,
  });

  const rawResponse = output.text;
  const rawParsed = extractJson<unknown>(rawResponse);
  if (!rawParsed) {
    const snippet = rawResponse.slice(0, 300);
    console.error("[distiller] non-JSON output (first 300):", snippet);
    errors.push(`non-JSON output: ${snippet}`);
    return { distillationsCreated: 0, byType, rawResponseLength: rawResponse.length, errors };
  }

  // LLM may return bare array instead of { proposals: [...] }
  const parsed = Array.isArray(rawParsed) ? { proposals: rawParsed } : rawParsed;

  let proposals: z.infer<typeof Proposal>[];

  const validated = DistillerOutput.safeParse(parsed);
  if (validated.success) {
    proposals = validated.data.proposals;
  } else {
    // Log extracted parsed object for diagnosis (not raw string)
    console.error("[distiller] schema validation failed (issues):", JSON.stringify(validated.error.issues).slice(0, 500));
    console.error("[distiller] parsed proposals[0] type:", JSON.stringify((parsed as { proposals?: unknown[] })?.proposals?.[0]));
    // Per-proposal fallback: skip invalid proposals instead of failing the whole batch
    const rawProposals = (parsed as { proposals?: unknown[] })?.proposals;
    if (!Array.isArray(rawProposals) || rawProposals.length === 0) {
      errors.push(`Distiller schema invalid: ${JSON.stringify(validated.error.issues).slice(0, 200)}`);
      return { distillationsCreated: 0, byType, rawResponseLength: rawResponse.length, errors };
    }
    proposals = [];
    for (const raw of rawProposals) {
      const p = Proposal.safeParse(raw);
      if (p.success) {
        proposals.push(p.data);
      } else {
        errors.push(`Skipped invalid proposal: ${JSON.stringify(p.error.issues).slice(0, 200)}`);
      }
    }
    if (proposals.length === 0) {
      return { distillationsCreated: 0, byType, rawResponseLength: rawResponse.length, errors };
    }
  }

  let distillationsCreated = 0;

  for (const proposal of proposals) {
    // sourceQuotes halüsinasyon savunması
    const invalidQuotes = proposal.sourceQuotes.filter(
      (q) => !snapshot.rawText.includes(q.text),
    );
    if (invalidQuotes.length > 0) {
      errors.push(
        `Proposal (${proposal.type}) skipped: ${invalidQuotes.length} quote(s) not found in rawText`,
      );
      continue;
    }

    await db.trainingDistillation.create({
      data: {
        resourceId: snapshot.resourceId,
        snapshotIds: [snapshotId],
        type: proposal.type,
        targetSlug: proposal.targetSlug ?? null,
        proposalJson: { type: proposal.type, targetSlug: proposal.targetSlug ?? null, payload: proposal.payload },
        rationale: proposal.rationale,
        sourceQuotes: proposal.sourceQuotes as object[],
        status: "PENDING",
      },
    });

    byType[proposal.type]++;
    distillationsCreated++;
  }

  return { distillationsCreated, byType, rawResponseLength: rawResponse.length, errors };
}
