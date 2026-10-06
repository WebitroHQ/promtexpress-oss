/**
 * Client-side analytics tracker (no React deps; works in event handlers).
 * Posts to /api/analytics/track via sendBeacon (or fetch fallback).
 */

const ENDPOINT = "/api/analytics/track";

function send(payload: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  const body = JSON.stringify(payload);
  // sendBeacon: reliable on page unload; ~64KB limit
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    try {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon(ENDPOINT, blob);
      if (ok) return;
    } catch {
      // fall through to fetch
    }
  }

  // Fetch fallback (no await — fire-and-forget)
  fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}

export function trackPageView(input: {
  path: string;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  durationMs?: number | null;
}): void {
  send({ kind: "view", ...input });
}

export function trackEvent(name: string, meta?: Record<string, unknown>): void {
  send({
    kind: "event",
    type: "click",
    name,
    path: typeof window !== "undefined" ? window.location.pathname : undefined,
    meta,
  });
}
