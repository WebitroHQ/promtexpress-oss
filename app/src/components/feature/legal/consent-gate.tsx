"use client";

/**
 * Renders children only if the user has given consent for the given category.
 *
 * Plan 2026-05-08 step 5 — wraps PageViewTracker (and any future analytics /
 * marketing scripts) so non-essential trackers are NEVER mounted before the
 * user has granted explicit consent.
 *
 * SSR safety (plan rule 4 — no arıza): on the server the component renders
 * `null`. The first client paint also renders `null` until `useEffect` reads
 * localStorage; this avoids hydration mismatches and prevents a "flash of
 * tracker" before consent is read.
 */

import * as React from "react";
import {
  CONSENT_STORAGE_KEY,
  type ConsentCategory,
  type ConsentRecord,
  isValidConsent,
} from "@/lib/consent/types";

interface Props {
  category: Exclude<ConsentCategory, "necessary">;
  children: React.ReactNode;
}

export function ConsentGate({ category, children }: Props) {
  const [granted, setGranted] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const read = (): ConsentRecord | null => {
      try {
        const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return isValidConsent(parsed) ? parsed : null;
      } catch {
        return null;
      }
    };

    // Initial read syncs React state with the external store (localStorage).
    // The lint rule `react-you-might-not-need-an-effect` flags setState in
    // useEffect, but here we are explicitly synchronising with an external
    // system — see `storage` / `pe.consent-updated` listeners below. This is
    // the documented use case for useEffect; suppress the false positive.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGranted(read()?.[category] ?? false);

    // React to runtime changes — banner writes to the same key.
    const handleStorage = (e: StorageEvent) => {
      if (e.key !== CONSENT_STORAGE_KEY) return;
      setGranted(read()?.[category] ?? false);
    };
    const handleCustom = () => setGranted(read()?.[category] ?? false);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("pe.consent-updated", handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("pe.consent-updated", handleCustom);
    };
  }, [category]);

  if (granted !== true) return null;
  return <>{children}</>;
}
