import { NextResponse } from "next/server";
import { authenticateBearer, assertApiKeyRateLimit } from "@/server/api/bearer-auth";
import { requireScope } from "@/server/api/require-scope";
import { RateLimitError } from "@/lib/pipeline/v2/rate-limit";
import { getPromptHistory } from "@/server/queries/prompts";
import { logApiCall } from "@/lib/api-logging";

export async function GET(req: Request) {
  const start = Date.now();
  const auth = await authenticateBearer(req.headers.get("authorization"));
  const scopeFail = requireScope(auth, "read");
  if (scopeFail) {
    void logApiCall(req, scopeFail, Date.now() - start);
    return scopeFail;
  }
  if (!auth.ok) {
    const res = NextResponse.json({ error: auth.error }, { status: auth.status });
    void logApiCall(req, res, Date.now() - start);
    return res;
  }

  try {
    await assertApiKeyRateLimit(auth.apiKeyId, auth.rateLimit);
  } catch (err) {
    if (err instanceof RateLimitError) {
      const res = NextResponse.json(
        { error: "API key rate limit exceeded", retryAfterSec: err.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(err.retryAfterSec) } },
      );
      void logApiCall(req, res, Date.now() - start, { apiKeyId: auth.apiKeyId, userId: auth.userId });
      return res;
    }
    throw err;
  }

  const url = new URL(req.url);
  const page = Math.max(0, Number(url.searchParams.get("page") ?? 0));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
  const modality = url.searchParams.get("modality") ?? undefined;

  const data = await getPromptHistory(auth.userId, { page, pageSize, modality: modality ?? "All" });

  const res = NextResponse.json({
    rows: data.rows,
    total: data.total,
    page,
    pageSize,
  });
  void logApiCall(req, res, Date.now() - start, { apiKeyId: auth.apiKeyId, userId: auth.userId });
  return res;
}
