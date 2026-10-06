/**
 * FAZ 4 (2026-05-03) — BullMQ generation queue.
 *
 * /api/generate POST → enqueue job → 202 + jobId
 * Worker (separate PM2 process) consumes → runGenerationV4 → result stored
 *   in DB (Prompt + GenerationTrace) and Redis (job result for fast read)
 * /api/generate/[jobId] GET → poll status
 * /api/generate/[jobId]/stream → SSE relay of progress events
 *
 * Why queue: synthesizer takes 60-180s. Synchronous HTTP request hits Cloudflare
 * 100s timeout (524). Queue decouples request from work; client polls/SSE.
 */

import { Queue, type JobsOptions } from "bullmq";
import { createBullConnection } from "@/lib/redis";

export const GENERATION_QUEUE_NAME = "generation";

export interface GenerationJobData {
  userId: string;
  intent: string;
  modality: string;
  targetEngineId: string | null;
  cachedIntent?: unknown;
  iteration?: { ofPromptId: string; feedback: string } | null;
  /** Idempotency: unique per user-action; prevents duplicate enqueue if client retries POST. */
  idempotencyKey: string;
  /** Used to filter user's own jobs (auth check by API). */
  enqueuedAt: number;
}

export interface GenerationJobResult {
  ok: boolean;
  /** Full GenerationResultV4 (so frontend can use it as-is when ok=true). */
  result?: unknown;
  error?: string;
  errorCode?: string;
}

let cachedQueue: Queue<GenerationJobData, GenerationJobResult> | null = null;

export function getGenerationQueue(): Queue<GenerationJobData, GenerationJobResult> {
  if (cachedQueue) return cachedQueue;
  cachedQueue = new Queue<GenerationJobData, GenerationJobResult>(GENERATION_QUEUE_NAME, {
    connection: createBullConnection(),
    defaultJobOptions: {
      attempts: 1, // do NOT auto-retry — synthesizer retries internally; double-billing risk on auto-retry
      removeOnComplete: { age: 3600, count: 1000 }, // keep 1h or last 1000
      removeOnFail: { age: 86400, count: 500 }, // keep 24h or last 500 for debugging
    },
  });
  return cachedQueue;
}

export async function enqueueGenerationJob(
  data: GenerationJobData,
  opts?: JobsOptions,
): Promise<{ jobId: string }> {
  const q = getGenerationQueue();
  const job = await q.add("run", data, {
    jobId: data.idempotencyKey,
    ...opts,
  });
  return { jobId: job.id ?? data.idempotencyKey };
}
