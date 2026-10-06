/**
 * FAZ C3 (2026-05-04) — Engine capability tier policy.
 *
 * Each AiEngine carries an admin-set capabilityTier (S/A/B/C). Roles in the
 * pipeline declare a minimum tier; admin cannot assign an under-tier engine
 * to a role without ranking up the model first.
 *
 * Tier intuition (the AiEngine.capabilityTier doc-comment lists examples):
 *   S — flagship reasoning + 100K+ context (Opus 4, GPT-5 class)
 *   A — strong general purpose (Sonnet 4, GPT-4o, Gemini Pro)
 *   B — solid mid-tier (Haiku, GPT-4o-mini, Deepseek-chat)
 *   C — small / edge models (7B-class, embedder-only)
 *
 * NULL tier = unclassified; the guard PASSES (legacy compatibility).
 * Admin should classify all engines via /pr/yonet/engines edit form.
 */
import { AgentRoleSlug } from "@prisma/client";

export type Tier = "S" | "A" | "B" | "C";

export const TIER_RANK: Record<Tier, number> = { S: 4, A: 3, B: 2, C: 1 };

/**
 * Minimum tier required per role. Synthesizer demands the most because it
 * authors the final prompt; intent + safety are routine; embedder/distiller
 * are mechanical and a small model is acceptable.
 */
export const ROLE_MIN_TIER: Record<AgentRoleSlug, Tier> = {
  INTENT_ANALYZER: "B",
  SYNTHESIZER: "A",
  SAFETY_CHECKER: "B",
  EMBEDDER: "C",
  DISTILLER: "A",
};

export function isTier(value: unknown): value is Tier {
  return value === "S" || value === "A" || value === "B" || value === "C";
}

/**
 * Returns true when `engineTier` meets `minTier` (or when engineTier is
 * unclassified — null — so legacy behavior is preserved).
 */
export function tierMeetsRequirement(
  engineTier: string | null | undefined,
  minTier: Tier,
): boolean {
  if (!engineTier) return true; // unclassified = pass (legacy)
  if (!isTier(engineTier)) return true; // unknown label = pass (don't break)
  return TIER_RANK[engineTier] >= TIER_RANK[minTier];
}

export interface TierGuardResult {
  ok: boolean;
  reason?: string;
}

export function checkRoleTier(args: {
  roleSlug: AgentRoleSlug;
  engineTier: string | null | undefined;
  engineName: string;
}): TierGuardResult {
  const min = ROLE_MIN_TIER[args.roleSlug];
  if (tierMeetsRequirement(args.engineTier, min)) return { ok: true };
  return {
    ok: false,
    reason: `Engine "${args.engineName}" is tier ${args.engineTier} but role ${args.roleSlug} requires ≥ ${min}. Upgrade the engine's capabilityTier from /pr/yonet/engines or pick a stronger model.`,
  };
}
