/**
 * POST /api/admin/engines/[id]/qualify (FAZ C4 — 2026-05-04)
 *
 * Runs the engine through the golden intent fixture set and returns a 0-100
 * quality score. Result is persisted to AiEngine.lastQualificationJson so
 * the admin panel can display it as a badge / "production ready" gate.
 *
 * Scoring per fixture (max 4 points):
 *   +1 if response is non-empty and parses cleanly
 *   +1 if response length ≥ expectations.minLength
 *   +1 if all expectations.mustContain tokens appear (case-insensitive)
 *   +1 if no expectations.mustNotContain token appears
 * Final score = (sum / (n * 4)) * 100
 *
 * Cost note: each fixture = 1 adapter.generate() call → ~$0.01-0.30 per
 * engine qualification depending on model. Admin-triggered only; never
 * auto-fired.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { resolveEngine, invalidateEngineCache } from "@/lib/engines/registry";
import goldenFixtures from "@/test/golden/fixtures/intents.json";

interface Fixture {
  id: string;
  modality: string;
  intent: string;
  expectations: {
    minLength: number;
    mustContain?: string[];
    mustNotContain?: string[];
    language?: string;
  };
}

const QUALIFY_SYSTEM_PROMPT = `You are a top-tier prompt engineer. Given a user intent, produce a single, complete, copy-paste-ready prompt that captures the intent exactly.
Output ONLY the prompt text — no preamble, no JSON wrapper, no markdown fences. The prompt must be self-contained: role, task, constraints, output format.
Length: at least 200 characters. Preserve all named entities (brand names, percentages, exact quoted strings) verbatim.`;

const FIXTURE_TIMEOUT_MS = 90_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`${label} timed out`)), ms)),
  ]);
}

function scoreOne(text: string, fx: Fixture): { score: number; max: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;
  const max = 4;

  if (text && text.trim().length > 0) {
    score++;
  } else {
    reasons.push("empty response");
  }

  if (text.length >= fx.expectations.minLength) {
    score++;
  } else {
    reasons.push(`length ${text.length} < ${fx.expectations.minLength}`);
  }

  const lower = text.toLowerCase();
  const must = fx.expectations.mustContain ?? [];
  const allHit = must.every((tok) => lower.includes(tok.toLowerCase()));
  if (allHit) {
    score++;
  } else {
    const missing = must.filter((tok) => !lower.includes(tok.toLowerCase()));
    reasons.push(`missing tokens: ${missing.join(", ")}`);
  }

  const forbid = fx.expectations.mustNotContain ?? [];
  const noForbidden = !forbid.some((tok) => lower.includes(tok.toLowerCase()));
  if (noForbidden) {
    score++;
  } else {
    const present = forbid.filter((tok) => lower.includes(tok.toLowerCase()));
    reasons.push(`forbidden tokens present: ${present.join(", ")}`);
  }

  return { score, max, reasons };
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Missing engine id" }, { status: 400 });

  // Bust cache so a freshly-edited engine (key/model) is reloaded.
  invalidateEngineCache(id);
  const { adapter, meta } = await resolveEngine(id);

  const fixtures = goldenFixtures as Fixture[];
  const startedAt = Date.now();
  const perFixture: Array<{
    id: string;
    modality: string;
    score: number;
    max: number;
    reasons: string[];
    error?: string;
    latencyMs: number;
  }> = [];
  let totalScore = 0;
  let totalMax = 0;
  let okCount = 0;
  let errCount = 0;

  for (const fx of fixtures) {
    const t0 = Date.now();
    try {
      const upstream = await withTimeout(
        adapter.generate({
          systemPrompt: QUALIFY_SYSTEM_PROMPT,
          userMessage: `INTENT (modality=${fx.modality}):\n${fx.intent}`,
          maxTokens: meta.maxOutputTokens
            ? Math.min(2048, meta.maxOutputTokens)
            : 2048,
          temperature: 0.3,
        }),
        FIXTURE_TIMEOUT_MS,
        `fixture ${fx.id}`,
      );
      const result = scoreOne(upstream.text ?? "", fx);
      perFixture.push({
        id: fx.id,
        modality: fx.modality,
        score: result.score,
        max: result.max,
        reasons: result.reasons,
        latencyMs: Date.now() - t0,
      });
      totalScore += result.score;
      totalMax += result.max;
      okCount++;
    } catch (err) {
      perFixture.push({
        id: fx.id,
        modality: fx.modality,
        score: 0,
        max: 4,
        reasons: ["adapter error"],
        error: err instanceof Error ? err.message.slice(0, 200) : String(err),
        latencyMs: Date.now() - t0,
      });
      totalMax += 4;
      errCount++;
    }
  }

  const finalScore = totalMax === 0 ? 0 : Math.round((totalScore / totalMax) * 100);
  const passing = finalScore >= 70;
  const elapsed = Date.now() - startedAt;

  const qualification = {
    score: finalScore,
    passing,
    ranAt: Date.now(),
    elapsedMs: elapsed,
    fixtureCount: fixtures.length,
    okCount,
    errCount,
    perFixture,
  };

  await db.aiEngine.update({
    where: { id },
    data: { lastQualificationJson: qualification as object },
  });

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "engine.qualify",
      targetType: "AiEngine",
      targetId: id,
      meta: { score: finalScore, passing, elapsedMs: elapsed },
    },
  });

  return NextResponse.json({
    ok: true,
    engineId: id,
    engineName: meta.name,
    ...qualification,
  });
}

export const maxDuration = 600;
