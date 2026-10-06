/**
 * RoleBrief loader — DB'den rolün system prompt + few-shot exemplar'ını çeker.
 * Synthesizer dışındaki rollerde ayrıca RoleBrief hocası (Constitution değil).
 */
import { db } from "@/db/client";
import { AgentRoleSlug } from "@prisma/client";
import { PipelineError } from "./types";

export interface LoadedRoleBrief {
  roleSlug: AgentRoleSlug;
  version: string;
  systemPrompt: string;
  outputSchema: unknown;
  exemplars: Array<{ input: unknown; output: unknown }>;
}

const CACHE = new Map<AgentRoleSlug, { value: LoadedRoleBrief; exp: number }>();
const TTL_MS = 5 * 60 * 1000; // 5 min

export async function loadRoleBrief(
  roleSlug: AgentRoleSlug,
  layer: 1 | 2 | 3 | 4 | 5 | 6,
): Promise<LoadedRoleBrief> {
  const now = Date.now();
  const hit = CACHE.get(roleSlug);
  if (hit && hit.exp > now) return hit.value;

  const row = await db.roleBrief.findUnique({
    where: { roleSlug },
    select: {
      roleSlug: true,
      version: true,
      systemPrompt: true,
      outputSchema: true,
      exemplars: true,
      isActive: true,
    },
  });

  if (!row || !row.isActive) {
    throw new PipelineError(
      `RoleBrief not found or inactive for role: ${roleSlug}. Seed seems incomplete.`,
      layer,
    );
  }

  const value: LoadedRoleBrief = {
    roleSlug: row.roleSlug,
    version: row.version,
    systemPrompt: row.systemPrompt,
    outputSchema: row.outputSchema,
    exemplars: Array.isArray(row.exemplars)
      ? (row.exemplars as Array<{ input: unknown; output: unknown }>)
      : [],
  };
  CACHE.set(roleSlug, { value, exp: now + TTL_MS });
  return value;
}

/**
 * F5 — composed system prompt cache. Aynı (roleSlug + version) için derlenmiş
 * string'i 1 saat cache'ler; her request'te JSON.stringify x N exemplar tekrar
 * etmez.
 */
const COMPOSED_CACHE = new Map<string, { value: string; exp: number }>();
const COMPOSED_TTL_MS = 60 * 60 * 1000;

/**
 * Render exemplar.output for the model.
 *
 * 2026-05-05 — Hybrid v5 plain-text alignment: SYNTHESIZER outputs raw prompt
 * text, NOT JSON. The seed may store output in three shapes:
 *   1. string                                       — raw prompt text (plain-text mode, preferred)
 *   2. { prompt: string, ... }                      — legacy single-deliverable JSON envelope
 *   3. { prompts: [{deliverable, aspect?, prompt}], ... } — legacy multi-deliverable
 *
 * For shape 2/3 we UNWRAP to the plain-text format the Synthesizer actually
 * produces (separator-joined for multi-deliverable). This lets seed data stay
 * structured while the model sees the exact target format.
 *
 * For non-Synthesizer roles whose output is genuinely JSON (e.g. INTENT_ANALYZER),
 * we fall back to JSON.stringify so behavior is unchanged.
 */
function renderExemplarOutput(out: unknown, roleSlug: string): string {
  if (typeof out === "string") return out;
  if (
    roleSlug === "SYNTHESIZER" &&
    out !== null &&
    typeof out === "object"
  ) {
    const o = out as { prompt?: unknown; prompts?: unknown };
    if (Array.isArray(o.prompts) && o.prompts.length > 0) {
      const parts = (o.prompts as Array<{ deliverable?: unknown; aspect?: unknown; prompt?: unknown }>)
        .map((p) => {
          const kind = typeof p.deliverable === "string" ? p.deliverable : "default";
          const aspect = typeof p.aspect === "string" ? p.aspect : null;
          const sep = aspect ? `---DELIVERABLE: ${kind}, ${aspect}---` : `---DELIVERABLE: ${kind}---`;
          const text = typeof p.prompt === "string" ? p.prompt : "";
          return `${sep}\n${text}`;
        })
        .filter((s) => s.length > 0);
      if (parts.length === 1) {
        // Single deliverable — emit prompt only, no separator (per system prompt rule).
        const onlyText = (o.prompts as Array<{ prompt?: unknown }>)[0]?.prompt;
        if (typeof onlyText === "string") return onlyText;
      }
      if (parts.length > 1) return parts.join("\n\n");
    }
    if (typeof o.prompt === "string") return o.prompt;
  }
  // Fallback — JSON shape preserved for non-Synthesizer roles or unknown shape.
  return JSON.stringify(out, null, 2);
}

/**
 * RoleBrief'in few-shot exemplar'larını system prompt'a ekler.
 * Direktif #10: Few-shot in-context learning ile küçük model bile rol davranışını
 * tutar. SYNTHESIZER için OUTPUT plain-text raw render edilir; diğer roller
 * için JSON shape korunur (geri uyumluluk).
 */
export function composeSystemPromptWithExemplars(
  brief: LoadedRoleBrief,
): string {
  const key = `${brief.roleSlug}:${brief.version}`;
  const now = Date.now();
  const hit = COMPOSED_CACHE.get(key);
  if (hit && hit.exp > now) return hit.value;

  let value: string;
  if (brief.exemplars.length === 0) {
    value = brief.systemPrompt;
  } else {
    const exemplarBlock = brief.exemplars
      .map((ex, i) => {
        const inJson = JSON.stringify(ex.input, null, 2);
        const outRendered = renderExemplarOutput(ex.output, brief.roleSlug);
        const outBlock =
          brief.roleSlug === "SYNTHESIZER"
            ? `OUTPUT (the exact prompt to emit, raw text — no JSON, no fences):\n${outRendered}`
            : `OUTPUT:\n${outRendered}`;
        return `### Example ${i + 1}\n\nINPUT:\n${inJson}\n\n${outBlock}`;
      })
      .join("\n\n---\n\n");
    value = `${brief.systemPrompt}\n\n# Few-Shot Examples\n\n${exemplarBlock}`;
  }

  COMPOSED_CACHE.set(key, { value, exp: now + COMPOSED_TTL_MS });
  return value;
}

/** Cache invalidation — admin RoleBrief güncellediğinde çağrılır. */
export function invalidateRoleBriefCache(roleSlug?: AgentRoleSlug): void {
  if (roleSlug) {
    CACHE.delete(roleSlug);
    // Composed cache'te bu role'ün tüm version'larını sil
    for (const key of COMPOSED_CACHE.keys()) {
      if (key.startsWith(`${roleSlug}:`)) COMPOSED_CACHE.delete(key);
    }
  } else {
    CACHE.clear();
    COMPOSED_CACHE.clear();
  }
}
