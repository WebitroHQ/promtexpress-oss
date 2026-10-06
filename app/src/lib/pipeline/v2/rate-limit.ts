/**
 * Rate limit — multiple buckets.
 *
 * 1. Per-user: 5 events/60s sliding window.
 *    - 2026-05-04 (FAZ A5): primary path = Redis sorted-set sliding window
 *      (`rl:user:<id>`). Cuts CreditLedger COUNT from hot path under 2K
 *      concurrent load.
 *    - Fallback: DB COUNT (legacy path) when Redis is unconfigured or fails.
 *      Fail-open is intentional — Redis outage must not block users while
 *      DB rate-limit still enforces the same ceiling.
 * 2. Per-IP (Redis token bucket): 10 requests/60s, multi-account abuse guard.
 */
import { db } from "@/db/client";
import { getRedis } from "@/lib/redis";

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSec: number) {
    super(`Rate limit: try again in ${retryAfterSec}s`);
    this.name = "RateLimitError";
  }
}

const WINDOW_SEC = 60;
const MAX_PER_USER = 5;
const MAX_PER_IP = 10;

async function dbRateLimitFallback(userId: string): Promise<void> {
  const since = new Date(Date.now() - WINDOW_SEC * 1000);
  const count = await db.creditLedger.count({
    where: {
      userId,
      reason: { in: ["PROMPT_GENERATION", "API_USAGE"] },
      createdAt: { gte: since },
    },
  });
  if (count >= MAX_PER_USER) {
    throw new RateLimitError(WINDOW_SEC);
  }
}

export async function assertRateLimit(userId: string): Promise<void> {
  const hasRedisCfg = !!(process.env.REDIS_URL || process.env.REDIS_HOST);
  if (!hasRedisCfg) {
    return dbRateLimitFallback(userId);
  }
  try {
    const r = getRedis();
    const key = `rl:user:${userId}`;
    const now = Date.now();
    const cutoff = now - WINDOW_SEC * 1000;
    const member = `${now}:${Math.random().toString(36).slice(2, 8)}`;

    const pipeline = r.multi();
    pipeline.zremrangebyscore(key, 0, cutoff);
    pipeline.zadd(key, now, member);
    pipeline.zcard(key);
    pipeline.expire(key, WINDOW_SEC * 2);
    const results = await pipeline.exec();
    if (!results) throw new Error("redis multi exec returned null");

    // results = [[err,res], ...]; index 2 is zcard
    const zcardEntry = results[2];
    const count = (zcardEntry && (zcardEntry[1] as number)) ?? 0;
    if (count > MAX_PER_USER) {
      throw new RateLimitError(WINDOW_SEC);
    }
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    console.warn(
      "[rate-limit] redis user-bucket failed → DB fallback:",
      err instanceof Error ? err.message : err,
    );
    return dbRateLimitFallback(userId);
  }
}

/**
 * Per-IP token bucket via Redis INCR + EXPIRE. Atomic: pipeline emulated via
 * MULTI is unnecessary because EXPIRE is set on first INCR result (==1).
 *
 * Call from /api/generate route handler with the request IP.
 * If Redis is unavailable, fails open (allow request) — does NOT block the
 * legacy sync path on Redis outage.
 */
export async function assertIpRateLimit(ip: string | null): Promise<void> {
  if (!ip) return;
  const hasRedisCfg = !!(process.env.REDIS_URL || process.env.REDIS_HOST);
  if (!hasRedisCfg) return;
  try {
    const r = getRedis();
    const key = `rl:ip:${ip}`;
    const n = await r.incr(key);
    if (n === 1) {
      await r.expire(key, WINDOW_SEC);
    }
    if (n > MAX_PER_IP) {
      throw new RateLimitError(WINDOW_SEC);
    }
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    // Redis down — fail open (don't block users)
    console.warn("[rate-limit] redis check failed (fail open):", err instanceof Error ? err.message : err);
  }
}
