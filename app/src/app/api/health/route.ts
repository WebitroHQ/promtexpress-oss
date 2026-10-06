import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { getRedis } from "@/lib/redis";
import { getGenerationQueue } from "@/lib/queue/generation-queue";

/**
 * Liveness/health probe endpoint.
 *
 * Plan 2026-05-08 step 6 (C1 evidence — `/api/health` did not exist before).
 * Probed by:
 *   - Cloudflare / nginx upstream health check (so a brown-out node is taken
 *     out of rotation instead of serving 5xx).
 *   - UptimeRobot / Statuspage external monitor.
 *   - Manual curl during deploy smoke (Adım 11.2 / Adım 12 §7.8).
 *
 * Each subsystem check is wrapped in a 500ms timeout so a stuck dependency
 * cannot stall the probe (plan rule 4 — health endpoint must never block
 * the request loop). All failures are caught — overall response is 200 if
 * every dep is reachable, otherwise 503 with a per-dep breakdown.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CHECK_TIMEOUT_MS = 500;

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), CHECK_TIMEOUT_MS),
    ),
  ]);
}

async function checkDb(): Promise<boolean> {
  try {
    await withTimeout(db.$queryRaw`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

async function checkRedis(): Promise<boolean> {
  try {
    const r = getRedis();
    const pong = await withTimeout(r.ping());
    return pong === "PONG";
  } catch {
    return false;
  }
}

async function checkQueue(): Promise<boolean> {
  try {
    const q = getGenerationQueue();
    const counts = await withTimeout(q.getJobCounts("waiting", "active"));
    return typeof counts.waiting === "number" && typeof counts.active === "number";
  } catch {
    return false;
  }
}

export async function GET() {
  const [dbOk, redisOk, queueOk] = await Promise.all([checkDb(), checkRedis(), checkQueue()]);
  const ok = dbOk && redisOk && queueOk;

  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      db: dbOk,
      redis: redisOk,
      queue: queueOk,
      timestamp: new Date().toISOString(),
      uptimeSec: Math.round(process.uptime()),
    },
    {
      status: ok ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    },
  );
}
