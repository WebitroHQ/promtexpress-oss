/**
 * SSE stream of job progress + completion (FAZ B3 — 2026-05-04 — event-driven).
 *
 * GET /api/generate/[jobId]/stream → text/event-stream
 *
 * Events:
 *   - connected: { jobId }                       (initial)
 *   - progress:  { stage, at }                   (each progress update)
 *   - completed: { result }                      (terminal)
 *   - failed:    { reason }                      (terminal)
 *
 * Closes after completed/failed or after 10 min idle.
 *
 * Architecture: BullMQ QueueEvents (Redis pub/sub) singleton dispatches to
 * per-jobId listeners. Replaces the prior 1s polling loop — Redis read load
 * drops from ~1 RPS per active SSE connection to one shared subscription.
 *
 * IMPORTANT: nginx must NOT buffer this route — set proxy_buffering off
 * for /api/generate/.+/stream (handled by /etc/nginx/conf.d/promtexpress.com.conf
 * since 2026-05-04 A1).
 */

import { auth } from "@/lib/auth";
import { QueueEvents } from "bullmq";
import { GENERATION_QUEUE_NAME, getGenerationQueue } from "@/lib/queue/generation-queue";
import { createBullConnection } from "@/lib/redis";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SSE_HEADERS: HeadersInit = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

const MAX_DURATION_MS = 10 * 60 * 1000;

interface Listener {
  send: (event: string, data: unknown) => void;
  close: () => void;
  userId: string;
}

const listeners = new Map<string, Set<Listener>>();
let queueEventsSingleton: QueueEvents | null = null;

function getQueueEvents(): QueueEvents {
  if (queueEventsSingleton) return queueEventsSingleton;
  const qe = new QueueEvents(GENERATION_QUEUE_NAME, {
    connection: createBullConnection(),
  });

  qe.on("progress", ({ jobId, data }) => {
    dispatch(jobId, "progress", data ?? null, false);
  });
  qe.on("completed", ({ jobId, returnvalue }) => {
    let parsed: unknown = returnvalue;
    if (typeof returnvalue === "string") {
      try {
        parsed = JSON.parse(returnvalue);
      } catch {
        /* leave as string */
      }
    }
    dispatch(jobId, "completed", { result: parsed }, true);
  });
  qe.on("failed", ({ jobId, failedReason }) => {
    dispatch(jobId, "failed", { reason: failedReason ?? "unknown" }, true);
  });
  qe.on("error", (err) => {
    console.error("[sse-stream] QueueEvents error:", err.message);
  });

  queueEventsSingleton = qe;
  return qe;
}

function dispatch(jobId: string, event: string, data: unknown, terminal: boolean): void {
  const set = listeners.get(jobId);
  if (!set || set.size === 0) return;
  for (const l of set) {
    try {
      l.send(event, data);
      if (terminal) l.close();
    } catch (err) {
      console.warn("[sse-stream] send failed:", err instanceof Error ? err.message : err);
    }
  }
  if (terminal) listeners.delete(jobId);
}

function register(jobId: string, listener: Listener): () => void {
  let set = listeners.get(jobId);
  if (!set) {
    set = new Set();
    listeners.set(jobId, set);
  }
  set.add(listener);
  return () => {
    const s = listeners.get(jobId);
    if (!s) return;
    s.delete(listener);
    if (s.size === 0) listeners.delete(jobId);
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { jobId } = await params;
  if (!jobId) {
    return new Response("Missing jobId", { status: 400 });
  }

  const queue = getGenerationQueue();
  const job = await queue.getJob(jobId);
  if (!job) {
    return new Response("Not found", { status: 404 });
  }
  if (job.data?.userId && job.data.userId !== session.user.id) {
    return new Response("Forbidden", { status: 403 });
  }

  // Initialize subscriber early (idempotent)
  getQueueEvents();

  const userId = session.user.id;

  // Shared state — cancel() (client disconnect) needs access alongside start()
  let closed = false;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  let unregister: (() => void) | null = null;
  let controllerRef: ReadableStreamDefaultController<Uint8Array> | null = null;
  const encoder = new TextEncoder();

  const send = (event: string, data: unknown) => {
    if (closed || !controllerRef) return;
    try {
      controllerRef.enqueue(
        encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
      );
    } catch {
      /* controller closed */
    }
  };

  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (unregister) {
      unregister();
      unregister = null;
    }
    if (controllerRef) {
      try {
        controllerRef.close();
      } catch {
        /* already closed */
      }
    }
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controllerRef = controller;

      send("connected", { jobId });

      timeoutHandle = setTimeout(() => {
        send("failed", { reason: "Stream timeout (10 min)" });
        cleanup();
      }, MAX_DURATION_MS);

      const initialState = await job.getState();
      if (initialState === "completed") {
        if (job.progress != null) send("progress", job.progress);
        send("completed", { result: job.returnvalue });
        cleanup();
        return;
      }
      if (initialState === "failed") {
        send("failed", { reason: job.failedReason ?? "unknown" });
        cleanup();
        return;
      }

      if (job.progress != null && job.progress !== 0) {
        send("progress", job.progress);
      }

      unregister = register(jobId, { userId, send, close: cleanup });
    },
    cancel() {
      // Client disconnected — release listener slot and timer
      cleanup();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
