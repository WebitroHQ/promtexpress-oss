import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateBearer, assertApiKeyRateLimit } from "@/server/api/bearer-auth";
import { requireScope } from "@/server/api/require-scope";
import {
  runGenerationV4,
  InsufficientCreditsError,
  MissingAiKeyError,
  RateLimitError,
  IterationLimitError,
  PipelineError,
} from "@/lib/pipeline/v2";
import { EngineError } from "@/lib/engines/types";
import { logApiCall, type LogContext } from "@/lib/api-logging";
import {
  FEEDBACK_MAX_LEN,
  FEEDBACK_MIN_LEN,
  INTENT_MAX_LEN,
  INTENT_MIN_LEN,
} from "@/lib/limits";

const BodySchema = z.object({
  intent: z.string().min(INTENT_MIN_LEN).max(INTENT_MAX_LEN),
  modality: z.enum(["text", "code", "image", "video", "audio", "music"]),
  targetEngineId: z.string().optional().nullable(),
  answers: z
    .array(
      z.object({
        question: z.string().min(1).max(500),
        answer: z.string().min(1).max(1000),
      }),
    )
    .max(10)
    .optional(),
  iteration: z
    .object({
      ofPromptId: z.string().min(1),
      feedback: z.string().min(FEEDBACK_MIN_LEN).max(FEEDBACK_MAX_LEN),
    })
    .optional()
    .nullable(),
  cachedIntent: z
    .object({
      domain: z.string(),
      language: z.string(),
      scenario: z.enum(["A", "B", "C"]),
      missing_params: z.array(z.string()),
      chip_questions: z.array(z.object({ label: z.string(), options: z.array(z.string()) })),
      ambiguity_clarifications: z.array(z.string()),
      psych_signals: z.object({
        expertise: z.enum(["novice", "intermediate", "expert"]),
        tone: z.enum(["casual", "professional", "frustrated", "neutral"]),
        specificity: z.number(),
      }),
      entities: z
        .object({
          brand: z.string().optional(),
          product_or_service: z.string().optional(),
          occasion: z.string().optional(),
          offer: z
            .object({
              kind: z.enum(["discount", "bundle", "freebie", "other"]),
              value: z.string(),
            })
            .optional(),
          render_text: z
            .object({
              primary: z.string().optional(),
              secondary: z.string().optional(),
              cta: z.string().optional(),
            })
            .optional(),
          audience: z.string().optional(),
          forbidden: z.array(z.string()).optional(),
        })
        .optional()
        .default({}),
      deliverables: z
        .array(
          z.object({
            kind: z.string(),
            aspect: z.string().optional(),
            resolution: z.string().optional(),
            notes: z.string().optional(),
          }),
        )
        .optional()
        .default([{ kind: "default" }]),
      language_constraints: z
        .object({
          glyphs: z.array(z.string()).optional(),
          keep_intent_language: z.boolean().optional(),
        })
        .optional()
        .default({}),
    })
    .optional()
    .nullable(),
});

async function handle(req: Request, ctx: { logCtx: LogContext }): Promise<Response> {
  const auth = await authenticateBearer(req.headers.get("authorization"));
  const scopeFail = requireScope(auth, "generate");
  if (scopeFail) return scopeFail;
  // requireScope returned null → auth.ok is true here.
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  ctx.logCtx = { apiKeyId: auth.apiKeyId, userId: auth.userId };

  try {
    await assertApiKeyRateLimit(auth.apiKeyId, auth.rateLimit);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: "API key rate limit exceeded", retryAfterSec: err.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(err.retryAfterSec) } },
      );
    }
    throw err;
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (raw && typeof raw === "object") {
    if ("engineId" in raw) {
      return NextResponse.json(
        { error: "engineId is no longer accepted. The generator engine is admin-controlled via AgentRoleAssignment. Use targetEngineId for the destination AI." },
        { status: 400 },
      );
    }
    if ("level" in raw) {
      return NextResponse.json(
        { error: "level is no longer accepted. All generations run at professional quality (single tier)." },
        { status: 400 },
      );
    }
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(raw);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", details: err instanceof z.ZodError ? err.flatten() : null },
      { status: 400 },
    );
  }

  try {
    const result = await runGenerationV4({
      userId: auth.userId,
      intent: body.intent,
      modality: body.modality,
      targetEngineId: body.targetEngineId ?? null,
      answers: body.answers,
      iteration: body.iteration ?? null,
      source: "api",
      cachedIntent: body.cachedIntent ?? null,
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof MissingAiKeyError) {
      return NextResponse.json({ error: err.message, code: err.code, settingsUrl: "/settings#ai-keys" }, { status: 412 });
    }
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Rate limit exceeded", retryAfterSec: err.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(err.retryAfterSec) } },
      );
    }
    if (err instanceof InsufficientCreditsError) {
      return NextResponse.json(
        { error: "Insufficient credits", remaining: err.total - err.used, required: err.cost },
        { status: 402 },
      );
    }
    if (err instanceof IterationLimitError) {
      return NextResponse.json({ error: "Iteration limit reached" }, { status: 429 });
    }
    if (err instanceof PipelineError) {
      return NextResponse.json(
        { error: `Pipeline error at layer ${err.layer}`, message: err.message },
        { status: 503 },
      );
    }
    if (err instanceof EngineError) {
      console.error("[/api/v1/generate] engine error", {
        provider: err.provider,
        statusCode: err.statusCode,
        message: err.message,
      });
      return NextResponse.json(
        { error: `Engine error (${err.provider})`, message: err.message },
        { status: err.statusCode ?? 503 },
      );
    }
    console.error("[/api/v1/generate] unexpected:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const start = Date.now();
  const ctx: { logCtx: LogContext } = { logCtx: {} };
  let res: Response;
  try {
    res = await handle(req, ctx);
  } catch (err) {
    res = NextResponse.json({ error: "Internal error" }, { status: 500 });
    console.error("[/api/v1/generate] uncaught:", err);
  }
  void logApiCall(req, res, Date.now() - start, ctx.logCtx);
  return res;
}
