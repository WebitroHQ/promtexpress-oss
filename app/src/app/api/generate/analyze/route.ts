import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { analyzeIntent, MissingAiKeyError, RateLimitError, PipelineError } from "@/lib/pipeline/v2";
import { EngineError } from "@/lib/engines/types";
import { getRequireEmailVerification } from "@/server/queries/app-settings";
import { INTENT_MAX_LEN, INTENT_MIN_LEN } from "@/lib/limits";

const BodySchema = z.object({
  intent: z.string().min(INTENT_MIN_LEN).max(INTENT_MAX_LEN),
  modality: z.enum(["text", "code", "image", "video", "audio", "music"]),
  targetEngineId: z.string().optional().nullable(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.user.emailVerified && (await getRequireEmailVerification())) {
    return NextResponse.json(
      {
        error: "EMAIL_NOT_VERIFIED",
        message: "Email verification is required.",
        email: session.user.email ?? null,
        verifyUrl: "/auth/verify",
      },
      { status: 403 },
    );
  }
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", details: err instanceof z.ZodError ? err.flatten() : null },
      { status: 400 },
    );
  }

  try {
    const result = await analyzeIntent({
      userId: session.user.id,
      intent: body.intent,
      modality: body.modality,
      targetEngineId: body.targetEngineId ?? null,
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
    if (err instanceof PipelineError) {
      return NextResponse.json(
        { error: `Pipeline error at layer ${err.layer}`, message: err.message },
        { status: 503 },
      );
    }
    if (err instanceof EngineError) {
      console.error("[/api/generate/analyze] engine error", {
        provider: err.provider,
        statusCode: err.statusCode,
        message: err.message,
      });
      return NextResponse.json(
        { error: `Engine error (${err.provider})`, message: err.message },
        { status: err.statusCode ?? 503 },
      );
    }
    console.error("[/api/generate/analyze] unexpected:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
