/**
 * v4 PROMPT ENGINE — Main orchestrator
 *
 * 6 layers, 2 AI calls (intent-analyzer + synthesizer; safety opt.).
 *
 * Direktif:
 *   #1 Her kullanıcı pro çıktı (level kademe yok)
 *   #6 Profesyonel prompt mühendisi kalibresi
 *   #8 Kod ile yapılabilen %100 kod
 *
 * Flow:
 *   1. preprocess (KOD)
 *   2. intent-analyzer (AI #1, rol)
 *   3. context-assembly (KOD + RAG embed)
 *   4. synthesizer (AI #2, rol)
 *   5. validator (KOD + opt. AI safety)
 *   6. format (KOD) + persist (Prompt + CreditLedger + GenerationTrace)
 */
import { Prisma, CreditReason } from "@prisma/client";
import { db } from "@/db/client";
import { creditCost } from "@/lib/credit-cost";
import { MissingAiKeyError, runWithUserEngine } from "@/lib/engines/user-key";
import { computeUserBalance, debitCredits } from "@/lib/credits/balance";
import { assertRateLimit, RateLimitError } from "./rate-limit";
import { preprocess } from "./1-preprocess";
import { runIntentAnalyzer } from "./2-intent-analyzer";
import { assembleContext } from "./3-context-assembly";
import { runSynthesizer } from "./4-synthesizer";
import { runValidator } from "./5-validator";
import { finalize } from "./6-format";
import { mergeRequiredClarifiers } from "./clarifier-merge";
import {
  computeIntentCacheKey,
  getCachedResult,
  setCachedResult,
  type CachedPipelineResult,
} from "@/lib/cache/intent-cache";
import { getPipelineTimeouts } from "./timeouts";
import { createDefaultIntentAnalysis } from "./2-intent-analyzer";
import type {
  GenerationInputV4,
  GenerationResultV4,
  TargetEngineInfo,
} from "./types";
import { PipelineError } from "./types";

export class InsufficientCreditsError extends Error {
  constructor(
    public readonly used: number,
    public readonly total: number,
    public readonly cost: number,
  ) {
    super(`Insufficient credits: ${cost} required, ${total - used} remaining`);
    this.name = "InsufficientCreditsError";
  }
}

export class IterationLimitError extends Error {
  constructor(public readonly max: number) {
    super(`Iteration limit reached (max ${max})`);
    this.name = "IterationLimitError";
  }
}

/**
 * F4 — Layer-bazlı timeout. AI çağrısı belirli süreyi aşarsa pipeline iptal,
 * net hata döner (504 yerine 503 + mesaj).
 */
function withTimeout<T>(p: Promise<T>, ms: number, layer: 1 | 2 | 3 | 4 | 5 | 6, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, rej) =>
      setTimeout(() => rej(new PipelineError(`${label} timeout after ${ms}ms`, layer)), ms),
    ),
  ]);
}

// 2026-05-04 (Layer Timeout Architecture) — Hardcoded LAYER_TIMEOUTS removed.
// Timeouts are read from AppSetting via getPipelineTimeouts() (5min cache).
// Defaults: intent 60s, synth 90s, safety 30s. Admin tunes from
// /pr/yonet/system-settings → invalidates via /api/admin/cache/bust scope=context.

export { RateLimitError, MissingAiKeyError };
export type { GenerationInputV4, GenerationResultV4 };

/**
 * AnalyzeOnly — sadece preprocess + intent-analyzer çalıştırır, kredi düşmez.
 * UI Ekran 2'de (chip soruları gösterme) öncesinde çağrılır.
 */
export interface AnalyzeInput {
  userId: string;
  intent: string;
  modality: import("./types").Modality;
  targetEngineId?: string | null;
}

export interface AnalyzeResult {
  scenario: "A" | "B" | "C";
  domain: string;
  language: string;
  chipQuestions: import("./types").ChipQuestion[];
  ambiguityClarifications: string[];
  psychSignals: import("./types").IntentAnalysis["psych_signals"];
  /**
   * F1 — UI bunu generate isteğinde cachedIntent olarak geri gönderir,
   * Layer 2 yeniden çalışmaz.
   */
  intentAnalysis: import("./types").IntentAnalysis;
}

export async function analyzeIntent(input: AnalyzeInput): Promise<AnalyzeResult> {
  return runWithUserEngine(input.userId, () => analyzeIntentInner(input));
}

async function analyzeIntentInner(input: AnalyzeInput): Promise<AnalyzeResult> {
  await assertRateLimit(input.userId);

  let target: TargetEngineInfo | null = null;
  if (input.targetEngineId) {
    const t = await db.targetEngine.findUnique({
      where: { id: input.targetEngineId },
      select: {
        id: true,
        slug: true,
        name: true,
        provider: true,
        modality: true,
        promptStyleHint: true,
        preferredLanguage: true,
        charLimit: true,
        preferredFormat: true,
        requiresEnglish: true,
        negativePromptSupport: true,
        structuredFieldSpec: true,
        parameterHints: true,
        authoringTipsMd: true,
      },
    });
    if (t) target = t;
  }

  const pre = preprocess(input.intent, input.modality);
  // Layer Timeout Architecture: runIntentAnalyzer never throws (graceful
  // degradation built-in). withTimeout outer wrapper removed for Layer 2 to
  // eliminate the asymmetry where outer timeout would trump inner defaults.
  let ia: import("./types").IntentAnalysis;
  try {
    const r = await runIntentAnalyzer({ pre, modality: input.modality, target });
    ia = r.analysis;
  } catch (err) {
    console.warn("[analyzeIntent] runIntentAnalyzer threw — using defaults", {
      error: err instanceof Error ? err.message : err,
    });
    ia = createDefaultIntentAnalysis(pre, input.modality);
  }

  // FAZ 3 (2026-05-03) — IntentClarifierRule deterministic backstop.
  // LLM may have skipped a required dimension (vocals/instrumental, doc_type, …).
  // Merge required rules from DB unless already asked or already in user intent.
  const mergedChips = await mergeRequiredClarifiers(input.modality, input.intent, ia.chip_questions);
  // If we added clarifiers, keep scenario at B (ask questions) instead of A.
  const scenario = mergedChips.length > ia.chip_questions.length && ia.scenario === "A" ? "B" : ia.scenario;

  return {
    scenario,
    domain: ia.domain,
    language: ia.language,
    chipQuestions: mergedChips,
    ambiguityClarifications: ia.ambiguity_clarifications,
    psychSignals: ia.psych_signals,
    intentAnalysis: { ...ia, chip_questions: mergedChips, scenario },
  };
}

async function readCredits(
  client: Prisma.TransactionClient | typeof db,
  userId: string,
): Promise<{ available: number; planSlug: string | null }> {
  // Plan 2026-05-08 hardcode-cleanup — slug fallback kaldırıldı. Subscription
  // yoksa planSlug = null; calculateCost null planı default değerler
  // (iterationFreeCount=0, multiplier=1, maxIter=null) ile karşılar.
  // Tek gerçek kaynak: /pr/yonet/plans (Plan tablosu) — kod-level slug yok.
  const sub = await client.subscription.findUnique({
    where: { userId },
    select: { plan: { select: { slug: true } } },
  });
  const planSlug = sub?.plan.slug ?? null;
  const balance = await computeUserBalance(userId, client);
  return { available: balance.available, planSlug };
}

/**
 * Plan-bazlı iterasyon kredi maliyeti (Karar #5).
 * Karar #1: her iterasyon = yeni üretim = yeniden kredi.
 * Plan override: iterationFreeCount sayısına kadar 0, sonra costMultiplier.
 */
async function calculateCost(args: {
  modality: string;
  isIteration: boolean;
  iterationOf: string | null;
  planSlug: string | null;
  userId: string;
}): Promise<{ cost: number; iterationCount: number; maxReached: boolean }> {
  const baseCost = creditCost(args.modality);

  if (!args.isIteration || !args.iterationOf) {
    return { cost: baseCost, iterationCount: 0, maxReached: false };
  }

  // İterasyon: aynı prompt üzerinde önceki iterasyon sayısı
  // Plan 2026-05-08 hardcode-cleanup — args.planSlug null ise plan lookup
  // atlanır ve default değerler (freeCount=0, multiplier=1, maxIter=null)
  // kullanılır. Tüm Plan satırları bu değerlerle yaratılıyor zaten.
  const plan = args.planSlug
    ? await db.plan.findUnique({
        where: { slug: args.planSlug },
        select: {
          iterationFreeCount: true,
          iterationCostMultiplier: true,
          maxIterationsPerPrompt: true,
        },
      })
    : null;
  const freeCount = plan?.iterationFreeCount ?? 0;
  const multiplier = Number(plan?.iterationCostMultiplier ?? 1);
  const maxIter = plan?.maxIterationsPerPrompt ?? null;

  // İterasyon zinciri sayısı
  const iterationCount = await db.generationTrace.count({
    where: { iterationOf: args.iterationOf, userId: args.userId },
  });

  if (maxIter !== null && iterationCount >= maxIter) {
    return { cost: 0, iterationCount, maxReached: true };
  }

  if (iterationCount < freeCount) {
    return { cost: 0, iterationCount, maxReached: false };
  }

  const cost = Math.max(0, Math.round(baseCost * multiplier));
  return { cost, iterationCount, maxReached: false };
}

export async function runGenerationV4(
  input: GenerationInputV4,
): Promise<GenerationResultV4> {
  return runWithUserEngine(input.userId, () => runGenerationV4Inner(input));
}

async function runGenerationV4Inner(
  input: GenerationInputV4,
): Promise<GenerationResultV4> {
  const startedAt = Date.now();

  // 0. Rate limit + credit pre-check
  await assertRateLimit(input.userId);
  const preCredits = await readCredits(db, input.userId);
  const isIteration = !!input.iteration?.ofPromptId;

  const costInfo = await calculateCost({
    modality: input.modality,
    isIteration,
    iterationOf: input.iteration?.ofPromptId ?? null,
    planSlug: preCredits.planSlug,
    userId: input.userId,
  });

  if (costInfo.maxReached) {
    throw new IterationLimitError(0);
  }

  if (preCredits.available < costInfo.cost) {
    throw new InsufficientCreditsError(0, preCredits.available, costInfo.cost);
  }

  // ── FAZ B2 (2026-05-04) — Intent semantic cache check.
  // Iteration mode bypasses cache (cache key = null). Cache is global (no
  // userId in key) — same intent text/modality/target/answers → same output.
  // On hit: persist + ledger still run, Layers 1-5 skipped.
  const cacheKey = computeIntentCacheKey({
    intent: input.intent,
    modality: input.modality,
    targetEngineId: input.targetEngineId ?? null,
    answers: input.answers ?? [],
    iteration: input.iteration ?? null,
  });
  const cached = await getCachedResult(cacheKey);
  if (cached) {
    return persistCachedResult({
      input,
      cached,
      costInfo,
      isIteration,
      startedAt,
    });
  }

  // Resolve target engine
  let target: TargetEngineInfo | null = null;
  if (input.targetEngineId) {
    const t = await db.targetEngine.findUnique({
      where: { id: input.targetEngineId },
      select: {
        id: true,
        slug: true,
        name: true,
        provider: true,
        modality: true,
        promptStyleHint: true,
        preferredLanguage: true,
        charLimit: true,
        preferredFormat: true,
        requiresEnglish: true,
        negativePromptSupport: true,
        structuredFieldSpec: true,
        parameterHints: true,
        authoringTipsMd: true,
      },
    });
    if (t) target = t;
  }

  // F10 — Layer-bazlı süre ölçümü (debug + admin paneli)
  const layerLatencies: Record<string, number> = {};
  const tick = (label: string, fn: () => unknown | Promise<unknown>) => {
    const t0 = Date.now();
    return Promise.resolve(fn()).finally(() => {
      layerLatencies[label] = Date.now() - t0;
    });
  };

  // ── Layer 1
  const pre = (await tick("L1", () => preprocess(input.intent, input.modality))) as ReturnType<
    typeof preprocess
  >;

  // ── Layer 2 (AI #1) — F1: cachedIntent varsa atla
  // Layer Timeout Architecture: runIntentAnalyzer'a outer withTimeout YOK —
  // içsel adapter timeout (60s default, AppSetting'den) + graceful defaults.
  // Pipeline asla layer 2'de patlamaz.
  let intentAnalysis: import("./types").IntentAnalysis;
  let intentEngine: import("./modality-engine").ResolvedLayerEngine | null = null;
  let intentCacheHit = false;
  if (input.cachedIntent) {
    intentAnalysis = input.cachedIntent;
    intentCacheHit = true;
    layerLatencies["L2"] = 0;
  } else {
    try {
      const r = (await tick("L2", () =>
        runIntentAnalyzer({ pre, modality: input.modality, target }),
      )) as Awaited<ReturnType<typeof runIntentAnalyzer>>;
      intentAnalysis = r.analysis;
      intentEngine = r.engine;
    } catch (err) {
      console.warn("[runGenerationV4] runIntentAnalyzer threw — using defaults", {
        error: err instanceof Error ? err.message : err,
      });
      intentAnalysis = createDefaultIntentAnalysis(pre, input.modality);
      intentEngine = null;
    }
  }

  // ── Layer 3 (KOD + RAG embed)
  const context = (await tick("L3", () =>
    assembleContext({
      intentText: pre.cleanText,
      intentAnalysis,
      modality: input.modality,
      target,
      answers: input.answers ?? [],
      iteration: input.iteration ?? null,
    }),
  )) as Awaited<ReturnType<typeof assembleContext>>;

  // ── Layer 4 (AI #2) — modality-bazlı maxTokens (G4)
  // Layer Timeout: synth budget AppSetting'den (default 90s).
  const timeouts = await getPipelineTimeouts();
  const synthRes = (await tick("L4", () =>
    withTimeout(
      runSynthesizer({ context, modality: input.modality }),
      timeouts.synth,
      4,
      "Synthesizer",
    ),
  )) as Awaited<ReturnType<typeof runSynthesizer>>;
  const synthesis = synthRes.output;
  const synthEngine = synthRes.engine;
  const synthAttemptsLog = synthRes.attemptsLog ?? [];

  // ── Layer 5 (KOD + opt. AI safety)
  // 2026-05-12 confabulation fix — Plan §6.a hallucination detector için
  // intentText + userAnswers + deliverableKind iletilir.
  // 2026-05-12 (Garantili Teslimat v2) — withTimeout sarmalı eklendi.
  // K11 kanıtı: timeouts.safety (30s default) tanımlıydı ama Layer 5'te
  // uygulanmıyordu. Validator AI safety pass yapan adapter çağrısı yaparsa
  // hanging request'e karşı koruma şart.
  const valRes = (await tick("L5", () =>
    withTimeout(
      runValidator({
        prompt: synthesis.prompt,
        modality: input.modality,
        target,
        domainSlug: intentAnalysis.domain,
        intentAnalysis: {
          entities: intentAnalysis.entities,
          deliverables: intentAnalysis.deliverables,
          language_constraints: intentAnalysis.language_constraints,
        },
        synthesis: { prompts: synthesis.prompts },
        intentText: input.intent,
        userAnswers: input.answers,
        deliverableKind: intentAnalysis.deliverables[0]?.kind,
      }),
      timeouts.safety,
      5,
      "Validator",
    ),
  )) as Awaited<ReturnType<typeof runValidator>>;
  const validation = valRes.result;
  const safetyEngine = valRes.engine;

  // ── Layer 6 (KOD)
  const final = (await tick("L6", () => finalize({ synthesis, validation, target }))) as ReturnType<
    typeof finalize
  >;

  const totalLatencyMs = Date.now() - startedAt;

  // Persist (Serializable)
  const { promptId, traceId, creditsRemaining } = await db.$transaction(
    async (tx) => {
      // Re-check credits inside tx (race-fix)
      const credits = await readCredits(tx, input.userId);
      if (credits.available < costInfo.cost) {
        throw new InsufficientCreditsError(0, credits.available, costInfo.cost);
      }

      // FAZ 5 (2026-05-03) — iteration counter race-fix.
      // Re-read iteration count INSIDE the Serializable TX. If two concurrent
      // iterations on the same prompt fired during the LLM call window, only the
      // first one to reach this point counts; subsequent ones see a higher count
      // and may exceed maxIter — throw IterationLimitError.
      if (isIteration && input.iteration?.ofPromptId) {
        // Plan 2026-05-08 hardcode-cleanup — slug null'sa plan lookup atlanır,
        // maxIter NULL kabul edilir (sınırsız).
        const planRow = preCredits.planSlug
          ? await tx.plan.findUnique({
              where: { slug: preCredits.planSlug },
              select: { maxIterationsPerPrompt: true },
            })
          : null;
        const liveCount = await tx.generationTrace.count({
          where: { iterationOf: input.iteration.ofPromptId, userId: input.userId },
        });
        if (planRow?.maxIterationsPerPrompt != null && liveCount >= planRow.maxIterationsPerPrompt) {
          throw new IterationLimitError(liveCount);
        }
      }

      // 2026-05-12 — Plan §7. REJECT/BLOCK'ta Prompt.creditsUsed=0 (kredi düşmedi).
      // 2026-05-12 (Garantili Teslimat v2): synthesizer best-effort `degraded`
      // teslimatlarda da kredi alınmaz — kullanıcı tam kaliteli olmayan çıktı
      // için ücretlendirilmez. UI ayrı bir "regenerate?" banner gösterir.
      const promptRowCreditsUsed =
        validation.decision === "BLOCK" ||
        validation.decision === "REJECT" ||
        synthesis.degraded === true
          ? 0
          : costInfo.cost;
      const prompt = await tx.prompt.create({
        data: {
          userId: input.userId,
          targetEngineId: target?.id ?? null,
          title: input.intent.slice(0, 80),
          userInput: input.intent,
          result: final.promptText,
          engine: "v4-pipeline",
          modality: input.modality,
          language: pre.language,
          creditsUsed: promptRowCreditsUsed,
          tags: [],
          answers: (input.answers ?? []) as unknown as Prisma.InputJsonValue,
          validationScore: final.validationScore,
          validationNotes:
            final.validationIssues.length > 0
              ? ({ issues: final.validationIssues } as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        },
      });

      const trace = await tx.generationTrace.create({
        data: {
          promptId: prompt.id,
          userId: input.userId,
          iterationOf: input.iteration?.ofPromptId ?? null,
          modality: input.modality,
          targetEngineId: target?.id ?? null,
          preprocessJson: {
            language: pre.language,
            charCount: pre.charCount,
            piiMasked: pre.piiMasked,
          } as Prisma.InputJsonValue,
          intentJson: intentAnalysis as unknown as Prisma.InputJsonValue,
          contextJson: {
            exemplarIds: context.exemplarIds,
            personaSlug: context.personaSlug,
            constitutionVersion: context.constitutionVersion,
          } as Prisma.InputJsonValue,
          synthesisJson: synthesis as unknown as Prisma.InputJsonValue,
          validationJson: validation as unknown as Prisma.InputJsonValue,
          finalJson: {
            promptText: final.promptText,
            layerLatencies,
            intentCacheHit,
            // 2026-05-12 (Garantili Teslimat v2) — synthesis quality telemetry.
            degraded: synthesis.degraded === true,
            qualityIssues: synthesis.qualityIssues ?? [],
            engineAttempts: synthAttemptsLog,
          } as unknown as Prisma.InputJsonValue,
          engineSourcesJson: {
            intent: intentEngine,
            synth: synthEngine,
            safety: safetyEngine,
          } as unknown as Prisma.InputJsonValue,
          totalLatencyMs,
          status:
            validation.decision === "BLOCK"
              ? "blocked"
              : validation.decision === "REJECT"
                ? "rejected"
                : "ok",
        },
      });

      // 2026-05-12 confabulation fix — Plan §7. REJECT (subject hallucination)
      // veya BLOCK durumlarında kredi DÜŞÜLMEZ.
      // 2026-05-12 (Garantili Teslimat v2) — synthesizer.degraded === true
      // durumunda da kredi düşmez. Plan v2 §F (K10 kanıtı). Kerem precedent:
      // hallucinated parfüm prompt'u için 20 kredi manuel refund'lanmıştı.
      const skipDebit =
        validation.decision === "BLOCK" ||
        validation.decision === "REJECT" ||
        synthesis.degraded === true;
      if (costInfo.cost > 0 && !skipDebit) {
        await debitCredits({
          tx,
          userId: input.userId,
          cost: costInfo.cost,
          reason:
            input.source === "api" ? CreditReason.API_USAGE : CreditReason.PROMPT_GENERATION,
          meta: {
            promptId: prompt.id,
            traceId: trace.id,
            isIteration,
            iterationCount: costInfo.iterationCount,
            targetEngineId: target?.id ?? null,
          } as Prisma.InputJsonValue,
        });
      }

      return {
        promptId: prompt.id,
        traceId: trace.id,
        // 2026-05-12 — Plan §7. REJECT/BLOCK'ta kredi düşmedi, available aynen.
        creditsRemaining: skipDebit
          ? credits.available
          : Math.max(0, credits.available - costInfo.cost),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  // FAZ B2 — write to intent cache (fire-and-forget; cache disabled if key=null)
  // 2026-05-12 — REJECT'i de cache'leme (uydurma çıktı tekrar servis edilmesin).
  // 2026-05-12 (Garantili Teslimat v2) — degraded best-effort sonuçları da
  // cache'leme; aynı intent'in tekrarında yeniden full chain çalışsın ki
  // o sırada engine sağlığı düzelmişse acceptable çıktı üretilebilsin.
  if (
    validation.decision !== "BLOCK" &&
    validation.decision !== "REJECT" &&
    synthesis.degraded !== true
  ) {
    await setCachedResult(cacheKey, {
      promptText: final.promptText,
      assumptions: final.assumptions,
      validationScore: final.validationScore,
      validationIssues: final.validationIssues,
      intentAnalysis,
      preprocessJson: {
        language: pre.language,
        charCount: pre.charCount,
        piiMasked: pre.piiMasked,
      },
      synthesisJson: synthesis as unknown,
      validationJson: validation as unknown,
      contextJson: {
        exemplarIds: context.exemplarIds,
        personaSlug: context.personaSlug,
        constitutionVersion: context.constitutionVersion,
      },
      engineSourcesJson: { intent: intentEngine, synth: synthEngine, safety: safetyEngine },
      originalLatencyMs: totalLatencyMs,
      cachedAt: Date.now(),
    });
  }

  // 2026-05-12 — Plan §7. REJECT/BLOCK'ta creditsUsed=0 (kredi düşmedi).
  // 2026-05-12 (Garantili Teslimat v2) — degraded best-effort de creditsUsed=0.
  const effectiveCreditsUsed =
    validation.decision === "BLOCK" ||
    validation.decision === "REJECT" ||
    synthesis.degraded === true
      ? 0
      : costInfo.cost;

  return {
    promptId,
    output: final.promptText,
    creditsUsed: effectiveCreditsUsed,
    creditsRemaining,
    latencyMs: totalLatencyMs,
    validationScore: final.validationScore,
    validationIssues: final.validationIssues,
    assumptions: final.assumptions,
    traceId,
    scenario: intentAnalysis.scenario,
    chipQuestions: intentAnalysis.chip_questions,
    ambiguityClarifications: intentAnalysis.ambiguity_clarifications,
    recentEntry: {
      id: promptId,
      mod: input.modality,
      title: input.intent.slice(0, 80),
      userInput: input.intent,
      date: "just now",
    },
  };
}

/**
 * FAZ B2 — Intent cache hit fast-path. Skips Layers 1-5; performs only
 * Persist (Prompt + GenerationTrace + CreditLedger) inside Serializable TX.
 * Returns the same GenerationResultV4 shape as full pipeline.
 */
async function persistCachedResult(args: {
  input: GenerationInputV4;
  cached: CachedPipelineResult;
  costInfo: { cost: number; iterationCount: number; maxReached: boolean };
  isIteration: boolean;
  startedAt: number;
}): Promise<GenerationResultV4> {
  const { input, cached, costInfo, isIteration, startedAt } = args;

  const { promptId, traceId, creditsRemaining } = await db.$transaction(
    async (tx) => {
      const credits = await readCredits(tx, input.userId);
      if (credits.available < costInfo.cost) {
        throw new InsufficientCreditsError(0, credits.available, costInfo.cost);
      }

      const prompt = await tx.prompt.create({
        data: {
          userId: input.userId,
          targetEngineId: input.targetEngineId ?? null,
          title: input.intent.slice(0, 80),
          userInput: input.intent,
          result: cached.promptText,
          engine: "v4-pipeline",
          modality: input.modality,
          language: cached.preprocessJson.language,
          creditsUsed: costInfo.cost,
          tags: [],
          answers: (input.answers ?? []) as unknown as Prisma.InputJsonValue,
          validationScore: cached.validationScore,
          validationNotes:
            cached.validationIssues.length > 0
              ? ({ issues: cached.validationIssues } as Prisma.InputJsonValue)
              : Prisma.JsonNull,
        },
      });

      const trace = await tx.generationTrace.create({
        data: {
          promptId: prompt.id,
          userId: input.userId,
          iterationOf: input.iteration?.ofPromptId ?? null,
          modality: input.modality,
          targetEngineId: input.targetEngineId ?? null,
          preprocessJson: cached.preprocessJson as Prisma.InputJsonValue,
          intentJson: cached.intentAnalysis as unknown as Prisma.InputJsonValue,
          contextJson: cached.contextJson as unknown as Prisma.InputJsonValue,
          synthesisJson: cached.synthesisJson as Prisma.InputJsonValue,
          validationJson: cached.validationJson as Prisma.InputJsonValue,
          finalJson: {
            promptText: cached.promptText,
            cacheHit: true,
            cachedAt: cached.cachedAt,
            originalLatencyMs: cached.originalLatencyMs,
          } as Prisma.InputJsonValue,
          engineSourcesJson: cached.engineSourcesJson as Prisma.InputJsonValue,
          totalLatencyMs: Date.now() - startedAt,
          status: "ok",
        },
      });

      if (costInfo.cost > 0) {
        await debitCredits({
          tx,
          userId: input.userId,
          cost: costInfo.cost,
          reason:
            input.source === "api" ? CreditReason.API_USAGE : CreditReason.PROMPT_GENERATION,
          meta: {
            promptId: prompt.id,
            traceId: trace.id,
            isIteration,
            iterationCount: costInfo.iterationCount,
            targetEngineId: input.targetEngineId ?? null,
            cacheHit: true,
          } as Prisma.InputJsonValue,
        });
      }

      return {
        promptId: prompt.id,
        traceId: trace.id,
        creditsRemaining: Math.max(0, credits.available - costInfo.cost),
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );

  return {
    promptId,
    output: cached.promptText,
    creditsUsed: costInfo.cost,
    creditsRemaining,
    latencyMs: Date.now() - startedAt,
    validationScore: cached.validationScore,
    validationIssues: cached.validationIssues,
    assumptions: cached.assumptions,
    traceId,
    scenario: cached.intentAnalysis.scenario,
    chipQuestions: cached.intentAnalysis.chip_questions,
    ambiguityClarifications: cached.intentAnalysis.ambiguity_clarifications,
    recentEntry: {
      id: promptId,
      mod: input.modality,
      title: input.intent.slice(0, 80),
      userInput: input.intent,
      date: "just now",
    },
  };
}

export { PipelineError };
