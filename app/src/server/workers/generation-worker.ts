/**
 * BullMQ worker that runs queued generations (see src/lib/queue/generation-queue.ts).
 * Bundled into scripts/worker.bundled.cjs by `pnpm worker:bundle` and started by PM2.
 */
import { Worker, type Job } from "bullmq";
import { createBullConnection, getRedis } from "@/lib/redis";
import {
  GENERATION_QUEUE_NAME,
  type GenerationJobData,
  type GenerationJobResult,
} from "@/lib/queue/generation-queue";
import {
  runGenerationV4,
  InsufficientCreditsError,
  IterationLimitError,
  MissingAiKeyError,
  PipelineError,
  RateLimitError,
  type GenerationInputV4,
} from "@/lib/pipeline/v2";

const EMA_ALPHA = 0.2;

/** Rolling average job duration, read by the API to estimate queue wait. */
async function recordJobDuration(ms: number): Promise<void> {
  if (!Number.isFinite(ms) || ms <= 0) return;
  try {
    const r = getRedis();
    const prev = await r.get("metrics:gen:avg_job_ms");
    const prevMs = prev ? Number(prev) : 0;
    const next = prevMs > 0 ? Math.round(prevMs * (1 - EMA_ALPHA) + ms * EMA_ALPHA) : ms;
    await r.set("metrics:gen:avg_job_ms", String(next), "EX", 6 * 60 * 60);
  } catch {
    // Metrics are best effort.
  }
}

async function processJob(job: Job<GenerationJobData, GenerationJobResult>): Promise<GenerationJobResult> {
  const { userId, intent, modality, targetEngineId, cachedIntent, iteration } = job.data;
  const t0 = Date.now();
  try {
    await job.updateProgress({ stage: "started", at: Date.now() });
    const result = await runGenerationV4({
      userId,
      intent,
      modality,
      targetEngineId: targetEngineId ?? null,
      cachedIntent: cachedIntent ?? null,
      iteration: iteration ?? null,
      source: "web",
    } as GenerationInputV4);
    await job.updateProgress({ stage: "done", at: Date.now() });
    await recordJobDuration(Date.now() - t0);
    return { ok: true, result };
  } catch (err) {
    if (err instanceof MissingAiKeyError) {
      return { ok: false, error: err.message, errorCode: err.code };
    }
    if (err instanceof InsufficientCreditsError) {
      return { ok: false, error: err.message, errorCode: "INSUFFICIENT_CREDITS" };
    }
    if (err instanceof IterationLimitError) {
      return { ok: false, error: err.message, errorCode: "ITERATION_LIMIT" };
    }
    if (err instanceof RateLimitError) {
      return { ok: false, error: err.message, errorCode: "RATE_LIMIT" };
    }
    if (err instanceof PipelineError) {
      return { ok: false, error: err.message, errorCode: `PIPELINE_LAYER_${err.layer}` };
    }
    throw err;
  }
}

export function startGenerationWorker(): Worker<GenerationJobData, GenerationJobResult> {
  const concurrency = Number(process.env.GENERATION_WORKER_CONCURRENCY ?? "8");
  const worker = new Worker<GenerationJobData, GenerationJobResult>(GENERATION_QUEUE_NAME, processJob, {
    connection: createBullConnection(),
    concurrency,
    // 4 minutes: the synthesizer can take 60-180s plus retries.
    lockDuration: 240_000,
    lockRenewTime: 60_000,
  });
  worker.on("completed", (job) => {
    console.log(`[gen-worker] completed jobId=${job.id} userId=${job.data.userId}`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[gen-worker] failed jobId=${job?.id} userId=${job?.data.userId}: ${err.message}`);
  });
  worker.on("error", (err) => {
    console.error(`[gen-worker] error: ${err.message}`);
  });
  console.log(`[gen-worker] started (concurrency=${concurrency})`);
  return worker;
}
