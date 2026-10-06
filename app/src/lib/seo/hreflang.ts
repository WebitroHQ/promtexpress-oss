// SEO surface — single-locale URL space.
// D1+D2 (2026-05-11): EN is the canonical/indexable default. TR renders at
// the SAME URL via cookie (localePrefix:"never" in src/i18n/routing.ts) and
// is therefore not a separately indexable surface — we don't emit a tr-TR
// hreflang alternate because there is no distinct TR URL to point at.
// Re-add tr-TR alternate when a future PR migrates routes into
// `app/[locale]/*` and switches localePrefix to "as-needed".

export const SEO_BASE_URL = "https://promtexpress.com";

export type HreflangMap = Record<string, string>;

function trimSlash(p: string): string {
  return p === "/" ? "" : p.replace(/\/+$/, "");
}

export function buildHreflangMap(pathname: string): HreflangMap {
  const url = `${SEO_BASE_URL}${trimSlash(pathname)}`;
  return {
    "en-US": url,
    "x-default": url,
  };
}

// Canonical always points at the canonical EN URL (the only indexable
// surface) per D1 (2026-05-11).
export function buildCanonical(pathname: string): string {
  return `${SEO_BASE_URL}${trimSlash(pathname)}`;
}
