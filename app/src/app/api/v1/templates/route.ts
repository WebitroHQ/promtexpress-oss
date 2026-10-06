import { NextResponse } from "next/server";
import { TemplateStatus } from "@prisma/client";
import { authenticateBearer, assertApiKeyRateLimit } from "@/server/api/bearer-auth";
import { requireScope } from "@/server/api/require-scope";
import { RateLimitError } from "@/lib/pipeline/v2/rate-limit";
import { db } from "@/db/client";
import { logApiCall, type LogContext } from "@/lib/api-logging";

export async function GET(req: Request) {
  const start = Date.now();
  let logCtx: LogContext = {};
  let res: Response;

  const auth = await authenticateBearer(req.headers.get("authorization"));
  const scopeFail = requireScope(auth, "read");
  if (scopeFail) {
    void logApiCall(req, scopeFail, Date.now() - start);
    return scopeFail;
  }
  if (!auth.ok) {
    res = NextResponse.json({ error: auth.error }, { status: auth.status });
  } else {
    logCtx = { apiKeyId: auth.apiKeyId, userId: auth.userId };

    try {
      await assertApiKeyRateLimit(auth.apiKeyId, auth.rateLimit);
    } catch (err) {
      if (err instanceof RateLimitError) {
        res = NextResponse.json(
          { error: "API key rate limit exceeded", retryAfterSec: err.retryAfterSec },
          { status: 429, headers: { "Retry-After": String(err.retryAfterSec) } },
        );
        void logApiCall(req, res, Date.now() - start, logCtx);
        return res;
      }
      throw err;
    }

    const url = new URL(req.url);
    const modality = url.searchParams.get("modality");

    const rows = await db.promptTemplate.findMany({
      where: {
        status: TemplateStatus.PUBLISHED,
        ...(modality ? { modality } : {}),
      },
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        modality: true,
        engine: true,
        variables: true,
        version: true,
      },
    });

    res = NextResponse.json({ templates: rows });
  }

  void logApiCall(req, res, Date.now() - start, logCtx);
  return res;
}
