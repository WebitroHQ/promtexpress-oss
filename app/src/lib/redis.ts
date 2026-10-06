/**
 * FAZ 4 (2026-05-03) — Redis singleton.
 *
 * Single ioredis client used by BullMQ queue, cache layer, and rate-limit.
 * Environment:
 *   REDIS_URL — full connection URI (redis://host:port[/db]) — production
 *   REDIS_HOST / REDIS_PORT / REDIS_DB — granular fallback for local dev
 *
 * In production Redis runs as a dedicated
 * Docker container on port 6383 (port 6379-6382 occupied by other projects).
 *
 * Connection is reused across the Next.js app process. BullMQ requires a
 * dedicated bclient connection; we expose `getRedisConnection()` factory so
 * BullMQ can spin its own connection while the app cache reuses the singleton.
 */

import IORedis, { type Redis, type RedisOptions } from "ioredis";

let cachedRedis: Redis | null = null;

function buildOptions(): RedisOptions | string {
  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }
  return {
    host: process.env.REDIS_HOST ?? "localhost",
    port: Number(process.env.REDIS_PORT ?? "6379"),
    db: Number(process.env.REDIS_DB ?? "0"),
    maxRetriesPerRequest: null, // BullMQ requirement
    enableReadyCheck: false,
  };
}

export function getRedis(): Redis {
  if (cachedRedis) return cachedRedis;
  const opts = buildOptions();
  cachedRedis =
    typeof opts === "string"
      ? new IORedis(opts, { maxRetriesPerRequest: null, enableReadyCheck: false })
      : new IORedis(opts);
  cachedRedis.on("error", (err) => {
    console.error("[redis] error", err.message);
  });
  return cachedRedis;
}

/**
 * BullMQ requires its own connection (it issues blocking commands). Use this
 * factory in queue/worker setup, NOT the singleton.
 */
export function createBullConnection(): Redis {
  const opts = buildOptions();
  return typeof opts === "string"
    ? new IORedis(opts, { maxRetriesPerRequest: null, enableReadyCheck: false })
    : new IORedis(opts);
}

export async function pingRedis(): Promise<boolean> {
  try {
    const r = getRedis();
    const pong = await r.ping();
    return pong === "PONG";
  } catch {
    return false;
  }
}
