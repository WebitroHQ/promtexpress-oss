import { headers } from "next/headers";

/**
 * Read the client IP from server-action / route-handler context.
 * Order matches the production reverse-proxy chain:
 *   Cloudflare → Nginx → Next.js
 * `cf-connecting-ip` is set by Cloudflare; `x-real-ip` by Nginx;
 * `x-forwarded-for` is the standard fallback. First non-empty wins.
 *
 * Returns null when no header is available (server-rendered without HTTP
 * context, or local edge cases) — callers should treat null as "unknown IP"
 * and fall back to fail-open behaviour.
 */
export async function getRequestIp(): Promise<string | null> {
  try {
    const h = await headers();
    return (
      h.get("cf-connecting-ip") ??
      h.get("x-real-ip") ??
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      null
    );
  } catch {
    return null;
  }
}
