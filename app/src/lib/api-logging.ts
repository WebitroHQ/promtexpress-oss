import { db } from "@/db/client";

export type LogContext = {
  apiKeyId?: string | null;
  userId?: string | null;
};

export async function logApiCall(
  req: Request,
  res: Response,
  ms: number,
  ctx: LogContext = {},
): Promise<void> {
  try {
    const url = new URL(req.url);
    const ipHeader = req.headers.get("x-forwarded-for");
    const ip = ipHeader ? ipHeader.split(",")[0]!.trim() : req.headers.get("x-real-ip");
    await db.apiCallLog.create({
      data: {
        apiKeyId: ctx.apiKeyId ?? null,
        userId: ctx.userId ?? null,
        method: req.method,
        path: url.pathname,
        status: res.status,
        latencyMs: Math.max(0, Math.round(ms)),
        ip: ip ?? null,
        ua: req.headers.get("user-agent") ?? null,
      },
    });
  } catch (e) {
    console.error("[api-logging] logApiCall failed:", e);
  }
}

export function withApiLogging<T extends (req: Request, ...rest: never[]) => Promise<Response>>(
  handler: T,
  contextResolver?: (req: Request) => LogContext | Promise<LogContext>,
): T {
  return (async (req: Request, ...rest: never[]) => {
    const start = Date.now();
    let res: Response;
    try {
      res = await handler(req, ...rest);
    } catch (err) {
      const ms = Date.now() - start;
      const ctx = contextResolver ? await contextResolver(req) : {};
      await logApiCall(req, new Response(null, { status: 500 }), ms, ctx);
      throw err;
    }
    const ms = Date.now() - start;
    const ctx = contextResolver ? await contextResolver(req) : {};
    void logApiCall(req, res, ms, ctx);
    return res;
  }) as T;
}

/**
 * Delete logs older than N days. Manual cleanup helper (call from cron / admin job).
 */
export async function cleanupOldApiLogs(daysToKeep = 7): Promise<number> {
  const cutoff = new Date(Date.now() - daysToKeep * 86400000);
  const result = await db.apiCallLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  return result.count;
}
