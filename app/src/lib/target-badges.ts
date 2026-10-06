export type TargetBadge = "new" | "flagship" | "fast" | "reasoning";

const FLAGSHIP_RX = /\b(Pro|Ultra|Max|Opus|Large|Master)\b/i;
const FAST_RX = /\b(Mini|Nano|Flash|Lite|Turbo|Schnell|Haiku|Fast)\b/i;
const REASONING_RX = /\b(o[0-9]|R1|Reasoning|Think(?:ing)?|Deep)\b/i;

export interface BadgeInput {
  name: string;
  createdAt: Date | string;
  releasedAt?: Date | string | null;
  tier?: string | null;
  capabilities?: string[] | null;
}

/**
 * Infers UI badges deterministically from name/timestamps.
 * Admin-set `tier` and `capabilities` override the regex inference.
 */
export function inferBadges(input: BadgeInput): TargetBadge[] {
  const out: TargetBadge[] = [];

  const refDate = input.releasedAt ?? input.createdAt;
  const ageDays =
    (Date.now() - new Date(refDate).getTime()) / (24 * 60 * 60 * 1000);
  if (ageDays >= 0 && ageDays < 30) out.push("new");

  // Flagship: admin override > regex inference
  if (input.tier === "flagship") out.push("flagship");
  else if (input.tier !== "legacy" && FLAGSHIP_RX.test(input.name))
    out.push("flagship");

  // Fast: admin capability > regex
  if (input.capabilities?.includes("fast")) out.push("fast");
  else if (FAST_RX.test(input.name)) out.push("fast");

  // Reasoning: admin capability > regex
  if (input.capabilities?.includes("reasoning")) out.push("reasoning");
  else if (REASONING_RX.test(input.name)) out.push("reasoning");

  return out;
}

export const BADGE_LABELS: Record<TargetBadge, { label: string; emoji: string }> = {
  new: { label: "Yeni", emoji: "✨" },
  flagship: { label: "Flagship", emoji: "👑" },
  fast: { label: "Hızlı", emoji: "⚡" },
  reasoning: { label: "Akıl yürütme", emoji: "🧠" },
};
