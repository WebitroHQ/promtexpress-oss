/**
 * Bearer-token auth for /api/v1/* public endpoints.
 *
 * Token format: `pe_<env>_<random>`. We HMAC-SHA256 the plain token with a
 * server-wide pepper (API_KEY_PEPPER) before lookup. DB stores only hashes;
 * the plain key is shown to the user once at create time.
 *
 * Lazy upgrade: rows that still hold the legacy unsalted SHA-256 hash are
 * detected on first auth and rewritten to the peppered HMAC form. Existing
 * users are never forced to re-issue.
 *
 * lastUsedAt is touched at most once per 60 s (fire-and-forget) to keep the
 * write rate bounded under 2K RPS load.
 *
 * Per-key rate limit (Redis token bucket, 1-minute window) is enforced at the
 * route layer via assertApiKeyRateLimit() — fail-open if Redis is unavailable
 * (matches assertIpRateLimit in @/lib/pipeline/v2/rate-limit).
 */
import { createHash, createHmac } from "node:crypto";
import { db } from "@/db/client";
import { getRedis } from "@/lib/redis";
import { RateLimitError } from "@/lib/pipeline/v2/rate-limit";

export type Scope = "read" | "generate" | "admin";

export interface ApiKeyAuth {
  ok: true;
  userId: string;
  apiKeyId: string;
  rateLimit: number;
  scopes: Scope[];
}
export interface ApiKeyAuthFail {
  ok: false;
  status: number;
  error: string;
}

function getPepper(): string {
  const pepper = process.env.API_KEY_PEPPER;
  if (!pepper || pepper.length < 32) {
    throw new Error("API_KEY_PEPPER is not configured (min 32 chars)");
  }
  return pepper;
}

/**
 * Current hashing scheme: HMAC-SHA256(pepper, plain).
 * Used at issue time and at lookup time.
 */
export function hashApiKey(plain: string): string {
  return createHmac("sha256", getPepper()).update(plain).digest("hex");
}

/**
 * Legacy hashing scheme (pre-2026-05-07): plain SHA-256 with no pepper.
 * Looked up only as a fallback during lazy upgrade.
 */
function hashApiKeyLegacy(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

const LAST_USED_THROTTLE_MS = 60_000;

export async function authenticateBearer(
  authHeader: string | null,
): Promise<ApiKeyAuth | ApiKeyAuthFail> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { ok: false, status: 401, error: "Missing Bearer token" };
  }
  const plain = authHeader.slice(7).trim();
  if (!plain) return { ok: false, status: 401, error: "Empty bearer token" };

  // Try peppered HMAC first (current scheme)
  const peppered = hashApiKey(plain);
  let row = await db.apiKey.findUnique({ where: { keyHash: peppered } });

  // Fall back to legacy plain SHA-256 and lazy-upgrade on hit
  if (!row) {
    const legacy = hashApiKeyLegacy(plain);
    if (legacy !== peppered) {
      const legacyRow = await db.apiKey.findUnique({ where: { keyHash: legacy } });
      if (legacyRow) {
        // Rewrite hash to peppered form (fire-and-forget — race with another
        // request is harmless: both writes produce the same value).
        db.apiKey
          .update({ where: { id: legacyRow.id }, data: { keyHash: peppered } })
          .catch(() => {});
        row = legacyRow;
      }
    }
  }

  if (!row || !row.isActive) {
    return { ok: false, status: 401, error: "Invalid or inactive API key" };
  }
  if (row.revokedAt) {
    return { ok: false, status: 401, error: "API key revoked" };
  }
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) {
    return { ok: false, status: 401, error: "API key expired" };
  }

  // Throttled lastUsedAt touch
  const now = Date.now();
  const stale = !row.lastUsedAt || row.lastUsedAt.getTime() < now - LAST_USED_THROTTLE_MS;
  if (stale) {
    db.apiKey
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date(now) } })
      .catch(() => {});
  }

  return {
    ok: true,
    userId: row.userId,
    apiKeyId: row.id,
    rateLimit: row.rateLimit,
    scopes: row.scopes as Scope[],
  };
}

/**
 * Per-key Redis token bucket (1-minute window). Limit is taken from the
 * ApiKey.rateLimit column (default 100/min). Fails open when Redis is
 * unconfigured or unreachable, matching assertIpRateLimit's stance — a Redis
 * outage must not block legitimate API traffic.
 */
export async function assertApiKeyRateLimit(
  apiKeyId: string,
  limit: number,
): Promise<void> {
  const hasRedisCfg = !!(process.env.REDIS_URL || process.env.REDIS_HOST);
  if (!hasRedisCfg) return;
  try {
    const r = getRedis();
    const key = `rl:apikey:${apiKeyId}`;
    const n = await r.incr(key);
    if (n === 1) {
      await r.expire(key, 60);
    }
    if (n > limit) {
      throw new RateLimitError(60);
    }
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    console.warn(
      "[bearer-auth] redis per-key check failed (fail open):",
      err instanceof Error ? err.message : err,
    );
  }
}
