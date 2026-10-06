"use client";

import * as React from "react";
import {
  CONSENT_STORAGE_KEY,
  type ConsentRecord,
  isValidConsent,
} from "@/lib/consent/types";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Google Consent Mode v2 (Advanced) state updater.
 *
 * Reads the user's consent decision from localStorage and pushes the
 * corresponding `gtag('consent','update',...)` call. Listens to the
 * `pe.consent-updated` custom event (dispatched by CookieConsentBanner) so
 * a fresh decision is propagated to Google Ads/Analytics in real time
 * without a page reload.
 *
 * The default consent state ('denied' on all signals) is set inline by
 * GoogleAdsTag before gtag.js loads — this component only handles updates.
 */
export function ConsentModeUpdater() {
  React.useEffect(() => {
    const sync = () => {
      if (typeof window === "undefined" || !window.gtag) return;

      let record: ConsentRecord | null = null;
      try {
        const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (isValidConsent(parsed)) record = parsed;
        }
      } catch {
        /* ignore */
      }

      if (!record) return;

      window.gtag("consent", "update", {
        ad_storage: record.marketing ? "granted" : "denied",
        ad_user_data: record.marketing ? "granted" : "denied",
        ad_personalization: record.marketing ? "granted" : "denied",
        analytics_storage: record.analytics ? "granted" : "denied",
      });
    };

    // Initial sync on mount (existing decision before component loaded).
    sync();

    // React to runtime updates from the cookie banner.
    const onUpdate = () => sync();
    window.addEventListener("pe.consent-updated", onUpdate);

    // Cross-tab sync via storage event.
    const onStorage = (e: StorageEvent) => {
      if (e.key === CONSENT_STORAGE_KEY) sync();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("pe.consent-updated", onUpdate);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
