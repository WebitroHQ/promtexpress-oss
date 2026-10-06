/**
 * Returns 1-3 character abbreviation for a provider name.
 * Deterministic, no assumptions: derived from the provider string itself.
 *
 * Examples:
 *  "OpenAI"            -> "OA"
 *  "Anthropic"         -> "AN"
 *  "Black Forest Labs" -> "BL"
 *  "01.ai"             -> "01"
 *  "xAI"               -> "XA"
 *  "Higgsfield"        -> "HI"
 */
export function providerInitials(provider: string | null | undefined): string {
  if (!provider) return "?";
  const cleaned = provider.replace(/[._-]/g, " ");
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Returns chip background and foreground colors for a provider.
 * If `brandColor` (admin-set) is provided, uses it. Otherwise returns a
 * generic surface treatment (no assumed brand colors — Y3 varsayım yasak).
 */
export function providerChipColor(brandColor?: string | null): {
  bg: string;
  fg: string;
  border: string;
} {
  if (brandColor && /^#[0-9a-fA-F]{6}$/.test(brandColor)) {
    return { bg: brandColor, fg: "#ffffff", border: brandColor };
  }
  return {
    bg: "var(--pe-surface-2, rgba(255,255,255,0.05))",
    fg: "var(--pe-text, currentColor)",
    border: "var(--pe-border, rgba(255,255,255,0.1))",
  };
}
