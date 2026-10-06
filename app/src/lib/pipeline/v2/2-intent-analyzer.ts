/**
 * Layer 2 — INTENT ANALYZER (1 AI call, fast model)
 *
 * Rol: INTENT_ANALYZER (admin /pr/yonet/agent-roles'tan motor atar)
 * Görev: Intent → { domain, scenario, missing_params, chip_questions, psych }
 *
 * Direktif #1: Hangi motorun çalışacağı admin kararı (resolveRoleEngine).
 * Direktif #10: RoleBrief few-shot exemplar'lar küçük model için kalibre tutar.
 */
import { db } from "@/db/client";
import { resolveEngine } from "@/lib/engines/registry";
import {
  resolveLayerEngineSet,
  runWithEngineFallback,
  type ResolvedLayerEngine,
} from "./modality-engine";
import { loadRoleBrief, composeSystemPromptWithExemplars } from "./role-brief";
import { extractJson } from "./json-extract";
import { repairJson } from "./json-repair";
import type { IntentAnalysis, PreprocessOutput, Modality, TargetEngineInfo } from "./types";
import { PipelineError } from "./types";
import { getPipelineTimeouts } from "./timeouts";

/**
 * Intent-analyzer'ın asla pipeline'ı çökertmemesi için kullanılan default
 * IntentAnalysis. Layer Timeout Architecture (2026-05-04): adapter timeout,
 * parse fail veya engine fail durumunda kullanılır.
 *
 * Exported: src/lib/pipeline/v2/index.ts'de hem analyzeIntent hem
 * runGenerationV4 katmanları graceful degradation için import eder.
 */
export function createDefaultIntentAnalysis(pre: PreprocessOutput, modality: Modality): IntentAnalysis {
  return {
    domain: "general",
    language: pre.language,
    scenario: "A", // skip clarification chips
    missing_params: [],
    chip_questions: [],
    ambiguity_clarifications: [],
    psych_signals: { expertise: "intermediate", tone: "neutral", specificity: 0.5 },
    entities: {},
    deliverables: [{ kind: "default" }],
    language_constraints: {},
  };
}

/** Promise'ı belirli ms içinde tamamlanmazsa null döndürür (rejection değil). */
function withSoftTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export async function runIntentAnalyzer(args: {
  pre: PreprocessOutput;
  modality: Modality;
  target: TargetEngineInfo | null;
  /** Optional pre-resolved engine. If omitted, the layer resolves its own. */
  resolved?: ResolvedLayerEngine;
}): Promise<{ analysis: IntentAnalysis; engine: ResolvedLayerEngine }> {
  const { pre, modality, target } = args;

  // Domain hints — DB'den aktif persona slug'ları
  const personas = await db.expertPersona.findMany({
    where: { isActive: true },
    select: { domainSlug: true },
    orderBy: { sortOrder: "asc" },
    take: 50,
  });
  const domainHints = personas.map((p) => p.domainSlug);

  // RoleBrief + few-shot (engine-bağımsız; chain'in tüm motorlarında aynı kullanılır)
  const brief = await loadRoleBrief("INTENT_ANALYZER", 2);
  const systemPrompt = composeSystemPromptWithExemplars(brief);

  const userPayload = {
    intent: pre.cleanText,
    modality,
    targetEngine: target
      ? { slug: target.slug, name: target.name, provider: target.provider }
      : null,
    domainHints,
    entityHints: pre.entityHints,
  };

  // Helper: single-engine intent attempt (returns parsed analysis or null).
  const callIntent = async (
    adapter: Awaited<ReturnType<typeof resolveEngine>>["adapter"],
    meta: Awaited<ReturnType<typeof resolveEngine>>["meta"],
  ): Promise<IntentAnalysis | null> => {
    const intentMaxTokens = meta.maxOutputTokens
      ? Math.min(1024, meta.maxOutputTokens)
      : 1024;
    const upstream = await adapter.generate({
      systemPrompt,
      userMessage: JSON.stringify(userPayload),
      maxTokens: intentMaxTokens,
      temperature: 0,
      responseFormat: "json",
      outputSchema: (brief.outputSchema ?? undefined) as Record<string, unknown> | undefined,
    });
    let p = extractJson<IntentAnalysis>(upstream.text);
    if (!p) {
      p = await repairJson<IntentAnalysis>({
        adapter,
        modelId: meta.modelId,
        schema: (brief.outputSchema ?? undefined) as Record<string, unknown> | undefined,
        originalSystemPrompt: systemPrompt,
        originalUserMessage: JSON.stringify(userPayload),
        failedOutput: upstream.text,
        layer: 2,
        maxTokens: intentMaxTokens,
      });
    }
    return p;
  };

  // Layer Timeout Architecture (2026-05-04) — Intent-analyzer ASLA pipeline'ı
  // çökertmez. Adapter timeout (DB'den, default 60s), parse fail veya engine
  // chain fail durumunda createDefaultIntentAnalysis() kullanılır.
  const { intent: intentTimeoutMs } = await getPipelineTimeouts();
  const buildDefaults = () => createDefaultIntentAnalysis(pre, modality);

  let resolved: ResolvedLayerEngine;
  let parsed: IntentAnalysis | null = null;
  if (args.resolved) {
    resolved = args.resolved;
    try {
      const { adapter, meta } = await resolveEngine(resolved.engineId);
      parsed = await withSoftTimeout(callIntent(adapter, meta), intentTimeoutMs);
      if (!parsed) {
        console.warn("[intent-analyzer] timeout/parse fail — using defaults", {
          engine: resolved.engineId,
          timeoutMs: intentTimeoutMs,
        });
        parsed = buildDefaults();
      }
    } catch (err) {
      console.warn("[intent-analyzer] adapter threw — using defaults", {
        engine: resolved.engineId,
        error: err instanceof Error ? err.message : err,
      });
      parsed = buildDefaults();
    }
  } else {
    const set = await resolveLayerEngineSet({
      modality,
      slot: "questioner",
      roleSlug: "INTENT_ANALYZER",
      layer: 2,
    });
    try {
      const out = await runWithEngineFallback(set, async (engine) => {
        const { adapter, meta } = await resolveEngine(engine.engineId);
        // İçsel soft-timeout: süre aşımı null döner (throw değil) → caller
        // defaults kullanır. Adapter throw'u (network/5xx) fallback'i tetikler.
        const r = await withSoftTimeout(callIntent(adapter, meta), intentTimeoutMs);
        return r; // null olabilir
      });
      resolved = out.usedEngine;
      parsed = out.result ?? null;
    } catch (err) {
      console.warn("[intent-analyzer] all engines failed — using defaults", {
        error: err instanceof Error ? err.message : err,
      });
      resolved = {
        engineId: "unresolved",
        source: "role-assignment",
        slot: null,
        roleSlug: "INTENT_ANALYZER",
      };
      parsed = buildDefaults();
    }
    if (!parsed) {
      console.warn("[intent-analyzer] timeout/parse fail across chain — using defaults", {
        engine: resolved.engineId,
        timeoutMs: intentTimeoutMs,
      });
      parsed = buildDefaults();
    }
  }

  // Defansif: alanları doğrula + default'la
  const rawEntities = (parsed as { entities?: Record<string, unknown> }).entities ?? {};
  const rawDeliverables = (parsed as { deliverables?: unknown[] }).deliverables;
  const rawLangCons = (parsed as { language_constraints?: Record<string, unknown> }).language_constraints ?? {};

  const offerRaw = rawEntities.offer as { kind?: unknown; value?: unknown } | undefined;
  const renderTextRaw = rawEntities.render_text as
    | { primary?: unknown; secondary?: unknown; cta?: unknown }
    | undefined;

  const entities: IntentAnalysis["entities"] = {};
  if (typeof rawEntities.brand === "string" && rawEntities.brand.trim()) entities.brand = rawEntities.brand.trim();
  if (typeof rawEntities.product_or_service === "string" && rawEntities.product_or_service.trim())
    entities.product_or_service = rawEntities.product_or_service.trim();
  if (typeof rawEntities.occasion === "string" && rawEntities.occasion.trim())
    entities.occasion = rawEntities.occasion.trim();
  if (typeof rawEntities.audience === "string" && rawEntities.audience.trim())
    entities.audience = rawEntities.audience.trim();
  if (Array.isArray(rawEntities.forbidden))
    entities.forbidden = rawEntities.forbidden.filter((s): s is string => typeof s === "string" && s.trim().length > 0).slice(0, 10);
  if (offerRaw && typeof offerRaw.value === "string" && offerRaw.value.trim()) {
    const kind = ["discount", "bundle", "freebie", "other"].includes(offerRaw.kind as string)
      ? (offerRaw.kind as "discount" | "bundle" | "freebie" | "other")
      : "other";
    entities.offer = { kind, value: offerRaw.value.trim() };
  }
  if (renderTextRaw) {
    const rt: NonNullable<IntentAnalysis["entities"]["render_text"]> = {};
    if (typeof renderTextRaw.primary === "string" && renderTextRaw.primary.trim()) rt.primary = renderTextRaw.primary.trim();
    if (typeof renderTextRaw.secondary === "string" && renderTextRaw.secondary.trim()) rt.secondary = renderTextRaw.secondary.trim();
    if (typeof renderTextRaw.cta === "string" && renderTextRaw.cta.trim()) rt.cta = renderTextRaw.cta.trim();
    if (rt.primary || rt.secondary || rt.cta) entities.render_text = rt;
  }

  const deliverables: IntentAnalysis["deliverables"] = Array.isArray(rawDeliverables) && rawDeliverables.length > 0
    ? rawDeliverables
        .filter((d): d is Record<string, unknown> => !!d && typeof d === "object")
        .map((d) => ({
          kind: typeof d.kind === "string" && d.kind.trim() ? d.kind.trim() : "default",
          aspect: typeof d.aspect === "string" ? d.aspect : undefined,
          resolution: typeof d.resolution === "string" ? d.resolution : undefined,
          notes: typeof d.notes === "string" ? d.notes : undefined,
        }))
        .slice(0, 6)
    : [{ kind: "default" }];

  const language_constraints: IntentAnalysis["language_constraints"] = {};
  if (Array.isArray(rawLangCons.glyphs))
    language_constraints.glyphs = (rawLangCons.glyphs as unknown[]).filter((g): g is string => typeof g === "string" && g.length > 0).slice(0, 30);
  if (typeof rawLangCons.keep_intent_language === "boolean")
    language_constraints.keep_intent_language = rawLangCons.keep_intent_language;

  // 2026-05-12 confabulation fix — Plan §2. Belirsiz intent'lerde Layer 2
  // analyzer'ın spesifik bir domain'i (örn. "design.photo-product") zorlaması
  // sonraki katmanlara halüsinasyon olarak yansıyor. Kanıt: cmp2aq14u000bh0ermbawejs1
  // "Görsel iyileştirme" intent'i + psych_signals.specificity=0.3 + domain=
  // "design.photo-product" → parfüm şişesi confabulation.
  const wordCount = pre.cleanText.trim().split(/\s+/).filter((w) => w.length > 0).length;
  const rawSpecificity =
    typeof parsed.psych_signals?.specificity === "number"
      ? Math.max(0, Math.min(1, parsed.psych_signals.specificity))
      : 0.5;
  const isLowSignal = wordCount < 4 || rawSpecificity < 0.45;

  let domain: string;
  if (typeof parsed.domain === "string" && parsed.domain.trim()) {
    domain = isLowSignal ? "general" : parsed.domain.trim();
  } else {
    domain = "general";
  }

  // Düşük sinyalde scenario'yu B'ye zorla (LLM A demiş bile olsa, clarification gerek).
  // missing_params boş kalmasın ki Adım 1 UI gate'i tetiklensin.
  let scenario: "A" | "B" | "C" =
    parsed.scenario === "A" || parsed.scenario === "B" || parsed.scenario === "C"
      ? parsed.scenario
      : "B";
  let missingParams = Array.isArray(parsed.missing_params) ? parsed.missing_params.slice(0, 3) : [];
  if (isLowSignal && scenario === "A") {
    scenario = "B";
    if (missingParams.length === 0) missingParams = ["subject", "purpose", "specifics"];
  }

  const analysis: IntentAnalysis = {
    domain,
    language: typeof parsed.language === "string" ? parsed.language : pre.language,
    scenario,
    missing_params: missingParams,
    chip_questions: Array.isArray(parsed.chip_questions)
      ? parsed.chip_questions.slice(0, 3).map((q) => ({
          label: typeof q?.label === "string" ? q.label : "",
          options: Array.isArray(q?.options) ? q.options.filter((o) => typeof o === "string") : [],
        }))
      : [],
    ambiguity_clarifications: Array.isArray(parsed.ambiguity_clarifications)
      ? parsed.ambiguity_clarifications.slice(0, 3)
      : [],
    psych_signals: {
      expertise: ["novice", "intermediate", "expert"].includes(
        parsed.psych_signals?.expertise as string,
      )
        ? parsed.psych_signals.expertise
        : "intermediate",
      tone: ["casual", "professional", "frustrated", "neutral"].includes(
        parsed.psych_signals?.tone as string,
      )
        ? parsed.psych_signals.tone
        : "neutral",
      specificity: rawSpecificity,
    },
    entities,
    deliverables,
    language_constraints,
  };

  return { analysis, engine: resolved };
}
