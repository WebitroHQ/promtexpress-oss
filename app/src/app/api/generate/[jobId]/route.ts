/**
 * FAZ 4 (2026-05-03) — Job status poller.
 *
 * GET /api/generate/[jobId] → returns current status:
 *   { status: 'queued' | 'active' | 'completed' | 'failed' | 'unknown',
 *     progress?: { stage, at },
 *     result?: GenerationJobResult,
 *     failedReason?: string }
 *
 * Auth: only the user who enqueued can read (job.data.userId === session.user.id).
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getGenerationQueue } from "@/lib/queue/generation-queue";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { jobId } = await params;
  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  try {
    const queue = getGenerationQueue();
    const job = await queue.getJob(jobId);
    if (!job) {
      return NextResponse.json({ status: "unknown" }, { status: 404 });
    }
    if (job.data?.userId && job.data.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const state = await job.getState();
    return NextResponse.json({
      status: state, // 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused'
      progress: job.progress ?? null,
      result: job.returnvalue ?? null,
      failedReason: job.failedReason ?? null,
      attemptsMade: job.attemptsMade,
    });
  } catch (err) {
    console.error("[/api/generate/jobId] status error:", err);
    return NextResponse.json(
      { error: "Status fetch failed", message: err instanceof Error ? err.message : "unknown" },
      { status: 503 },
    );
  }
}
