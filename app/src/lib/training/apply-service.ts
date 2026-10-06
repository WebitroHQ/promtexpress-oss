import crypto from "crypto";
import { z } from "zod";
import { db } from "@/db/client";
import { embedText, saveEmbedding } from "@/lib/library/embedding";

export type ApplyResult =
  | { ok: true; appliedToId: string; targetTable: "Constitution" | "ExpertPersona" | "AntiPatternRule" | "PromptExemplar" }
  | { ok: false; error: string };

// Proposal shape re-validation (defense against corrupt DB data)
const ProposalEnvelope = z.object({
  type: z.enum(["CONSTITUTION_UPDATE", "PERSONA_UPDATE", "ANTIPATTERN", "EXEMPLAR"]),
  targetSlug: z.string().nullable().optional(),
  payload: z.record(z.unknown()),
});

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

export async function applyDistillation(
  distillationId: string,
  adminId: string,
): Promise<ApplyResult> {
  const dist = await db.trainingDistillation.findUnique({
    where: { id: distillationId },
  });
  if (!dist) return { ok: false, error: `Distillation ${distillationId} not found` };
  if (dist.status !== "APPROVED") return { ok: false, error: `status is ${dist.status}, expected APPROVED` };

  // Idempotent
  if (dist.appliedAt && dist.appliedToId) {
    const targetTable = typeToTable(dist.type);
    return { ok: true, appliedToId: dist.appliedToId, targetTable };
  }

  const envelope = ProposalEnvelope.safeParse(dist.proposalJson);
  if (!envelope.success) {
    return { ok: false, error: `proposalJson invalid: ${envelope.error.message}` };
  }

  const { type, payload } = envelope.data;
  let appliedToId: string;
  let targetTable: "Constitution" | "ExpertPersona" | "AntiPatternRule" | "PromptExemplar";

  try {
    if (type === "CONSTITUTION_UPDATE") {
      const p = ConstitutionPayload.parse(payload);
      appliedToId = await applyConstitution(p, adminId, distillationId);
      targetTable = "Constitution";
    } else if (type === "PERSONA_UPDATE") {
      const p = PersonaPayload.parse(payload);
      appliedToId = await applyPersona(p, adminId);
      targetTable = "ExpertPersona";
    } else if (type === "ANTIPATTERN") {
      const p = AntiPatternPayload.parse(payload);
      appliedToId = await applyAntiPattern(p, adminId);
      targetTable = "AntiPatternRule";
    } else if (type === "EXEMPLAR") {
      const p = ExemplarPayload.parse(payload);
      appliedToId = await applyExemplar(p, adminId);
      targetTable = "PromptExemplar";
    } else {
      return { ok: false, error: `Unknown type: ${type}` };
    }
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  await db.trainingDistillation.update({
    where: { id: distillationId },
    data: { status: "APPLIED", appliedAt: new Date(), appliedToId },
  });

  return { ok: true, appliedToId, targetTable };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function typeToTable(type: string): "Constitution" | "ExpertPersona" | "AntiPatternRule" | "PromptExemplar" {
  switch (type) {
    case "CONSTITUTION_UPDATE": return "Constitution";
    case "PERSONA_UPDATE": return "ExpertPersona";
    case "ANTIPATTERN": return "AntiPatternRule";
    case "EXEMPLAR": return "PromptExemplar";
    default: return "PromptExemplar";
  }
}

async function applyConstitution(
  payload: z.infer<typeof ConstitutionPayload>,
  adminId: string,
  distillationId: string,
): Promise<string> {
  return db.$transaction(async (tx) => {
    await tx.constitution.updateMany({ where: { isActive: true }, data: { isActive: false } });
    // Ensure unique version label
    const versionLabel = await ensureUniqueVersion(tx, payload.versionLabel, distillationId);
    const created = await tx.constitution.create({
      data: {
        version: versionLabel,
        content: payload.bodyMarkdown,
        changelog: payload.changelogNote,
        isActive: true,
        createdBy: adminId,
        activatedAt: new Date(),
      },
    });
    return created.id;
  });
}

async function ensureUniqueVersion(
  tx: Parameters<Parameters<typeof db.$transaction>[0]>[0],
  label: string,
  distillationId: string,
): Promise<string> {
  const exists = await tx.constitution.findUnique({ where: { version: label } });
  return exists ? `${label}-${distillationId.slice(0, 6)}` : label;
}

async function applyPersona(
  payload: z.infer<typeof PersonaPayload>,
  adminId: string,
): Promise<string> {
  const result = await db.expertPersona.upsert({
    where: { domainSlug: payload.domainSlug },
    create: {
      domainSlug: payload.domainSlug,
      name: payload.name,
      body: payload.body,
      jargon: payload.jargon,
      frameworks: payload.frameworks,
      antiPatterns: payload.antiPatterns,
      updatedBy: adminId,
    },
    update: {
      name: payload.name,
      body: payload.body,
      jargon: payload.jargon,
      frameworks: payload.frameworks,
      antiPatterns: payload.antiPatterns,
      updatedBy: adminId,
    },
  });
  return result.id;
}

async function applyAntiPattern(
  payload: z.infer<typeof AntiPatternPayload>,
  adminId: string,
): Promise<string> {
  const created = await db.antiPatternRule.create({
    data: {
      domainSlug: payload.domainSlug,
      pattern: payload.pattern,
      isRegex: payload.isRegex,
      severity: payload.severity,
      rationale: payload.rationale,
      isActive: true,
      updatedBy: adminId,
    },
  });
  return created.id;
}

async function applyExemplar(
  payload: z.infer<typeof ExemplarPayload>,
  adminId: string,
): Promise<string> {
  const promptHash = crypto.createHash("sha256").update(payload.promptText, "utf8").digest("hex");

  // Idempotent: same prompt hash → return existing
  const existing = await db.promptExemplar.findUnique({ where: { promptHash } });
  if (existing) return existing.id;

  const created = await db.promptExemplar.create({
    data: {
      source: "training_distillation",
      modality: payload.modality,
      prompt: payload.promptText,
      promptHash,
      contentLength: payload.promptText.length,
      title: payload.title,
      notes: payload.notes ?? null,
      intentTags: payload.domainSlug != null && payload.domainSlug.length > 0 ? [payload.domainSlug] : [],
      // Direktif #10: Admin onayından geçen exemplar VERIFIED'dır.
      // RAG pipeline (rag.ts) "GOLD" | "VERIFIED" filtresi kullanır.
      // REVIEW state ekstra bir moderation step DEĞİL — admin approveDistillation
      // zaten kalite kontrolüdür.
      status: "VERIFIED",
    },
  });

  // Embed the new exemplar
  const embResult = await embedText(payload.promptText);
  if (embResult) {
    await saveEmbedding(created.id, embResult);
  }

  return created.id;
}
