"use client";

import * as React from "react";
import { usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { trackPageView } from "@/lib/analytics/track";

/**
 * Mounted once in (public) layout. Tracks every SPA route change.
 * - Captures referrer + UTM params on first load
 * - Fires durationMs on unload via beacon
 *
 * Admin pages (/pr/yonet) are NOT mounted to keep admin traffic out of analytics.
 */
export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastPathRef = React.useRef<string | null>(null);
  const enterTimeRef = React.useRef<number>(Date.now());

  React.useEffect(() => {
    if (!pathname) return;

    // Skip admin paths — admin traffic should not pollute analytics
    if (pathname.startsWith("/pr/yonet")) return;

    const fullPath = searchParams?.toString()
      ? `${pathname}?${searchParams.toString()}`
      : pathname;

    // Send duration for the previous page (if any)
    if (lastPathRef.current && lastPathRef.current !== fullPath) {
      const durationMs = Date.now() - enterTimeRef.current;
      trackPageView({
        path: lastPathRef.current,
        durationMs,
      });
    }

    // Track new view
    if (lastPathRef.current !== fullPath) {
      lastPathRef.current = fullPath;
      enterTimeRef.current = Date.now();

      const referrer = typeof document !== "undefined" ? document.referrer || null : null;
      const utmSource = searchParams?.get("utm_source") ?? null;
      const utmMedium = searchParams?.get("utm_medium") ?? null;
      const utmCampaign = searchParams?.get("utm_campaign") ?? null;

      trackPageView({
        path: fullPath,
        referrer,
        utmSource,
        utmMedium,
        utmCampaign,
      });
    }
  }, [pathname, searchParams]);

  // Final unload — beacon will fire even if page closes
  React.useEffect(() => {
    const handler = () => {
      if (lastPathRef.current) {
        trackPageView({
          path: lastPathRef.current,
          durationMs: Date.now() - enterTimeRef.current,
        });
      }
    };
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
  }, []);

  return null;
}
