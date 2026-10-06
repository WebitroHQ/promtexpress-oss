"use client";

/**
 * Cookie / consent banner.
 *
 * Plan 2026-05-08 step 5 — KVKK + GDPR ePrivacy compliance:
 *   - Surfaces three categories on day one (necessary / analytics / marketing)
 *     so the legal flow is complete (plan rule 5 — no half-solutions).
 *   - Persists the user's decision in localStorage so the banner does not
 *     reappear on every visit.
 *   - Dispatches a custom `pe.consent-updated` event so already-mounted
 *     ConsentGate instances react immediately (no full reload required).
 *   - SSR safe: returns null during server render and during the first
 *     client tick (until useEffect fires). Plan rule 4 — no hydration arıza.
 *
 * Strings: English only (plan rule 1). i18n keys are scoped to
 * `cookieConsent.*`; en.json is canonical, tr.json provides translation.
 */

import * as React from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  CONSENT_STORAGE_KEY,
  CONSENT_SHAPE_VERSION,
  type ConsentRecord,
  isValidConsent,
} from "@/lib/consent/types";

function dispatchConsentUpdated() {
  try {
    window.dispatchEvent(new CustomEvent("pe.consent-updated"));
  } catch {
    /* environment without CustomEvent (very old) — ignore */
  }
}

function persist(record: ConsentRecord) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
    dispatchConsentUpdated();
  } catch {
    /* localStorage may be disabled — banner stays visible, no harm */
  }
}

function readExisting(): ConsentRecord | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidConsent(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function CookieConsentBanner() {
  const [mounted, setMounted] = React.useState(false);
  const [decided, setDecided] = React.useState<boolean | null>(null);
  const [customizing, setCustomizing] = React.useState(false);
  const [analytics, setAnalytics] = React.useState(false);
  const [marketing, setMarketing] = React.useState(false);

  React.useEffect(() => {
    // Initial mount: hydrate React state from localStorage. Suppression for
    // `react-you-might-not-need-an-effect` is intentional — we're syncing
    // with an external store (localStorage), which is the canonical use of
    // useEffect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setDecided(readExisting() !== null);
  }, []);

  if (!mounted || decided === true) return null;

  const buildRecord = (a: boolean, m: boolean): ConsentRecord => ({
    necessary: true,
    analytics: a,
    marketing: m,
    decidedAt: new Date().toISOString(),
    version: CONSENT_SHAPE_VERSION,
  });

  const acceptAll = () => {
    persist(buildRecord(true, true));
    setDecided(true);
  };
  const rejectAll = () => {
    persist(buildRecord(false, false));
    setDecided(true);
  };
  const saveCustom = () => {
    persist(buildRecord(analytics, marketing));
    setDecided(true);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie preferences"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-surface shadow-2xl"
    >
      <div className="mx-auto flex max-w-[1100px] flex-col gap-3 px-4 py-4 md:flex-row md:items-start md:justify-between md:gap-6 md:py-5">
        <div className="text-sm text-text-muted leading-relaxed md:flex-1">
          <p className="font-medium text-text mb-1">We value your privacy</p>
          <p>
            We use strictly necessary cookies for authentication and core site
            functions. With your consent, we also use analytics and marketing
            cookies. Read our{" "}
            <Link href="/legal?tab=cookies" className="text-primary hover:underline">
              Cookie Policy
            </Link>{" "}
            and{" "}
            <Link href="/legal?tab=privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>

          {customizing && (
            <div className="mt-3 space-y-2 rounded-md border border-border bg-surface-2 px-3 py-2">
              <label className="flex items-start gap-2 cursor-not-allowed opacity-70">
                <input type="checkbox" checked readOnly className="mt-0.5 accent-primary" />
                <div>
                  <span className="font-medium text-text">Necessary</span>
                  <p className="text-xs">
                    Required for sign-in, security, and core site features. Always on.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary"
                  checked={analytics}
                  onChange={(e) => setAnalytics(e.target.checked)}
                />
                <div>
                  <span className="font-medium text-text">Analytics</span>
                  <p className="text-xs">
                    Anonymous usage tracking that helps us improve the product.
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-primary"
                  checked={marketing}
                  onChange={(e) => setMarketing(e.target.checked)}
                />
                <div>
                  <span className="font-medium text-text">Marketing</span>
                  <p className="text-xs">
                    Used for measuring the success of marketing campaigns. None active today.
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-stretch">
          {customizing ? (
            <>
              <Button onClick={saveCustom} className="md:w-44">
                Save preferences
              </Button>
              <Button variant="secondary" onClick={() => setCustomizing(false)} className="md:w-44">
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button onClick={acceptAll} className="md:w-44">
                Accept all
              </Button>
              <Button variant="secondary" onClick={rejectAll} className="md:w-44">
                Reject non-essential
              </Button>
              <Button
                variant="ghost"
                onClick={() => setCustomizing(true)}
                className="md:w-44"
              >
                Customize
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
