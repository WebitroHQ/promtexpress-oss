/**
 * Cookie/consent preference shape stored in localStorage.
 *
 * Plan 2026-05-08 step 5 — three categories surfaced to the user:
 *   - necessary  → always true (session, theme, csrf — strictly required).
 *   - analytics  → PageViewTracker, Cloudflare Insights.
 *   - marketing  → reserved for future ad/remarketing scripts. Already wired
 *                  at storage level so adding scripts later does not break
 *                  the legal flow (plan rule 5 — no half-solutions).
 *
 * The shape is versioned (`version`) so a future shape change can re-prompt
 * users without losing data.
 */

export const CONSENT_STORAGE_KEY = "pe.cookie-consent";
export const CONSENT_SHAPE_VERSION = 1;

export type ConsentCategory = "necessary" | "analytics" | "marketing";

export interface ConsentRecord {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
  version: number;
}

export function isValidConsent(value: unknown): value is ConsentRecord {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.necessary === true &&
    typeof v.analytics === "boolean" &&
    typeof v.marketing === "boolean" &&
    typeof v.decidedAt === "string" &&
    v.version === CONSENT_SHAPE_VERSION
  );
}
