/**
 * GET /api/generate/[jobId]/queue-info  (FAZ D1 — 2026-05-04)
 *
 * Returns the job's current queue position and an estimated wait time so the
 * client can render "Sıradasın: 47 • ~3 dk" while waiting on SSE events.
 *
 * Position calculation: BullMQ doesn't expose direct position lookup, so we
 * fetch the waiting-list slice and walk it to find this job. Capped at 200
 * entries to keep the call cheap.
 *
 * ETA: position / activeWorkerCount × avgJobMs (rolling, in Redis under
 * `metrics:gen:avg_job_ms`). Falls back to 30s when no rolling sample exists.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGenerationQueue } from "@/lib/queue/generation-queue";
import { getRedis } from "@/lib/redis";

const POSITION_SCAN_LIMIT = 200;
const DEFAULT_AVG_JOB_MS = 30_000;
const WORKER_INSTANCES = 2;
const WORKER_CONCURRENCY = 8;
const TOTAL_PARALLEL_SLOTS = WORKER_INSTANCES * WORKER_CONCURRENCY;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { jobId } = await params;
  if (!jobId) return NextResponse.json({ error: "Missing jobId" }, { status: 400 });

  const queue = getGenerationQueue();
  const job = await queue.getJob(jobId);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.data?.userId && job.data.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const state = await job.getState();

  // Already running or terminal — no queue position
  if (state !== "waiting" && state !== "delayed") {
    return NextResponse.json({
      ok: true,
      jobId,
      state,
      position: 0,
      etaSeconds: 0,
      waitingCount: 0,
    });
  }

  const [waitingJobs, waitingCount] = await Promise.all([
    queue.getWaiting(0, POSITION_SCAN_LIMIT - 1),
    queue.getWaitingCount(),
  ]);

  let position = waitingJobs.findIndex((j) => j.id === jobId);
  if (position === -1) {
    // Job exists in the waiting set but is past our scan window.
    position = POSITION_SCAN_LIMIT;
  } else {
    position = position + 1; // 1-indexed for human display
  }

  // Avg job duration (rolling) from Redis — set elsewhere by worker on completion.
  let avgJobMs = DEFAULT_AVG_JOB_MS;
  try {
    const r = getRedis();
    const stored = await r.get("metrics:gen:avg_job_ms");
    if (stored) {
      const n = Number(stored);
      if (Number.isFinite(n) && n > 0) avgJobMs = n;
    }
  } catch {
    /* fall through to default */
  }

  const etaSeconds = Math.max(
    1,
    Math.round((position / TOTAL_PARALLEL_SLOTS) * (avgJobMs / 1000)),
  );

  return NextResponse.json({
    ok: true,
    jobId,
    state,
    position,
    etaSeconds,
    waitingCount,
    parallelSlots: TOTAL_PARALLEL_SLOTS,
  });
}
