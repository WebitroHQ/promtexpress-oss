import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  runGenerationV4,
  InsufficientCreditsError,
  MissingAiKeyError,
  RateLimitError,
  IterationLimitError,
  PipelineError,
} from "@/lib/pipeline/v2";
import { EngineError } from "@/lib/engines/types";
import { getRequireEmailVerification } from "@/server/queries/app-settings";
import { enqueueGenerationJob } from "@/lib/queue/generation-queue";
import { assertIpRateLimit } from "@/lib/pipeline/v2/rate-limit";
import { randomUUID } from "node:crypto";
import { userHasActiveAiKey } from "@/server/queries/ai-keys";
import {
  FEEDBACK_MAX_LEN,
  FEEDBACK_MIN_LEN,
  INTENT_MAX_LEN,
  INTENT_MIN_LEN,
} from "@/lib/limits";

const BodySchema = z.object({
  intent: z.string().min(INTENT_MIN_LEN).max(INTENT_MAX_LEN),
  modality: z.enum(["text", "code", "image", "video", "audio", "music", "math", "slides", "diagram", "3d", "document"]),
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
  /**
   * 2026-05-12 confabulation fix — kullanıcı clarification sorularını cevaplamadan
   * (scenario=B + missing_params) synthesize'e geçmek isterse açıkça onaylar.
   * Sunucu false ya da yoksa scenario=B && answers boş && missing_params.length>0
   * durumunda 422 LOW_CONFIDENCE_ACK_REQUIRED döner. Plan §1.
   */
  acknowledgeLowConfidence: z.boolean().optional().default(false),
  /** F1 — analyze sonucunu UI'dan re-use; Layer 2 atlanır. */
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
      // Yeni alanlar (entity-aware synthesis). UI eski shape gönderirse default'la dol.
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

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Email verification gate (operator can toggle via admin)
  if (!session.user.emailVerified && (await getRequireEmailVerification())) {
    return NextResponse.json(
      {
        error: "EMAIL_NOT_VERIFIED",
        message: "Email verification is required to generate prompts.",
        email: session.user.email ?? null,
        verifyUrl: "/auth/verify",
      },
      { status: 403 },
    );
  }

  // FAZ 5 (2026-05-03) — per-IP rate limit (10 req / 60s, Redis token bucket).
  // Defends against multi-account abuse. Fails open if Redis is down.
  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;
  try {
    await assertIpRateLimit(ip);
  } catch (err) {
    if (err instanceof MissingAiKeyError) {
      return NextResponse.json({ error: err.message, code: err.code, settingsUrl: "/settings#ai-keys" }, { status: 412 });
    }
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: "Too many requests from this IP", retryAfterSec: err.retryAfterSec },
        { status: 429, headers: { "Retry-After": String(err.retryAfterSec) } },
      );
    }
    // unexpected — log and continue (fail open)
    console.error("[/api/generate] ip rate-limit unexpected error:", err);
  }

  let body: z.infer<typeof BodySchema>;
  try {
    const json = await req.json();
    body = BodySchema.parse(json);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        details: err instanceof z.ZodError ? err.flatten() : null,
      },
      { status: 400 },
    );
  }

  // 2026-05-12 confabulation fix — server-side low-confidence gate.
  // cachedIntent UI'den geliyor (analyze response'undan). scenario=B + missing_params
  // var + answers boş + ack false ise synthesize'a geçmeyi engelle.
  if (
    body.cachedIntent &&
    body.cachedIntent.scenario === "B" &&
    body.cachedIntent.missing_params.length > 0 &&
    (!body.answers || body.answers.length === 0) &&
    !body.acknowledgeLowConfidence &&
    !body.iteration // iteration re-run muafiyet
  ) {
    return NextResponse.json(
      {
        error: "LOW_CONFIDENCE_ACK_REQUIRED",
        message:
          "Intent requires clarification. Either answer the chip questions or set acknowledgeLowConfidence=true to proceed with low confidence.",
        scenario: body.cachedIntent.scenario,
        missingParams: body.cachedIntent.missing_params,
        chipQuestions: body.cachedIntent.chip_questions,
      },
      { status: 422 },
    );
  }

  // FAZ 4 (2026-05-03) — async queue path. When enabled, returns 202 + jobId.
  // Client polls /api/generate/[jobId] or subscribes to /api/generate/[jobId]/stream.
  // When disabled (default), falls back to legacy synchronous path (current behavior).
  // Bring-your-own-key: fail fast here instead of queueing a job that cannot run.
  if (!(await userHasActiveAiKey(session.user.id))) {
    const err = new MissingAiKeyError();
    return NextResponse.json({ error: err.message, code: err.code, settingsUrl: "/settings#ai-keys" }, { status: 412 });
  }

  if (process.env.GENERATION_QUEUE_ENABLED === "true") {
    try {
      const idempotencyKey = `${session.user.id}-${randomUUID()}`;
      const { jobId } = await enqueueGenerationJob({
        userId: session.user.id,
        intent: body.intent,
        modality: body.modality,
        targetEngineId: body.targetEngineId ?? null,
        cachedIntent: body.cachedIntent ?? undefined,
        iteration: body.iteration ?? null,
        idempotencyKey,
        enqueuedAt: Date.now(),
      });
      return NextResponse.json(
        { jobId, status: "queued", pollUrl: `/api/generate/${jobId}`, streamUrl: `/api/generate/${jobId}/stream` },
        { status: 202 },
      );
    } catch (err) {
      console.error("[/api/generate] enqueue failed:", err);
      return NextResponse.json(
        { error: "Queue unavailable", message: err instanceof Error ? err.message : "unknown" },
        { status: 503 },
      );
    }
  }

  try {
    const result = await runGenerationV4({
      userId: session.user.id,
      intent: body.intent,
      modality: body.modality,
      targetEngineId: body.targetEngineId ?? null,
      answers: body.answers,
      iteration: body.iteration ?? null,
      source: "web",
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
      return NextResponse.json(
        { error: "Iteration limit reached for this prompt" },
        { status: 429 },
      );
    }
    // 2026-05-12 (Garantili Teslimat v2) — UI hata mesajı sanitizasyonu.
    // K9 kanıtı: önceki kod `err.message`'i (örn. "Synthesizer timeout after
    // 90000ms") doğrudan UI'a gönderiyordu. Pipeline iç jargonu son
    // kullanıcıya ASLA sızmamalı. İç detaylar console.error'a, kullanıcıya
    // user-friendly TR/EN mesaj.
    if (err instanceof PipelineError) {
      console.error("[/api/generate] pipeline error", {
        layer: err.layer,
        message: err.message,
      });
      return NextResponse.json(
        {
          error: "generation_unavailable",
          message_tr:
            "Üretim şu an tamamlanamadı. Lütfen birkaç saniye sonra tekrar deneyin. Krediniz düşmedi.",
          message_en:
            "We couldn't complete this generation right now. Please try again in a few seconds. Your credit was not charged.",
        },
        { status: 503 },
      );
    }
    if (err instanceof EngineError) {
      console.error("[/api/generate] engine error", {
        provider: err.provider,
        statusCode: err.statusCode,
        message: err.message,
      });
      return NextResponse.json(
        {
          error: "engine_unavailable",
          message_tr:
            "AI sağlayıcı geçici olarak yanıt vermiyor. Lütfen biraz sonra tekrar deneyin. Krediniz düşmedi.",
          message_en:
            "The AI provider is temporarily unavailable. Please try again shortly. Your credit was not charged.",
        },
        // 2026-05-04 — Default 503 (upstream unavailable). 502 yalnız gerçek
        // bad-gateway semantik (provider adapter level explicit set) için.
        { status: err.statusCode ?? 503 },
      );
    }
    console.error("[/api/generate] unexpected error:", err);
    return NextResponse.json(
      {
        error: "internal_error",
        message_tr:
          "Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin. Krediniz düşmedi.",
        message_en:
          "An unexpected error occurred. Please try again. Your credit was not charged.",
      },
      { status: 500 },
    );
  }
}
