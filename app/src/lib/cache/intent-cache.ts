/**
 * Intent Semantic Cache (FAZ B2 — 2026-05-04)
 *
 * Generation pipeline cache: aynı intent + modality + targetEngine + answers
 * kombinasyonunu 24 saat boyunca Redis'te tutar. Cache hit'te Layer 1-5
 * (preprocess, intent-analyzer, context-assembly, synthesizer, validator)
 * tamamen atlanır → ~1ms response, 0 LLM call.
 *
 * UX kuralları:
 *   - Cache hit'te kullanıcı yine de KREDİ ÖDER + Prompt + GenerationTrace
 *     yazılır (audit + ledger tutarlılığı; cache global, kullanıcıya özel değil).
 *   - Iteration mode (`iteration` non-null) cache'i ATLAR — feedback'e göre
 *     yeniden üretim her zaman taze.
 *   - Cache key kullanıcıdan bağımsız (intent + modality + target + answers'a göre).
 *
 * Redis down → fail-open (cache miss gibi davran, pipeline normal koşar).
 */
import { createHash } from "node:crypto";
import { getRedis } from "@/lib/redis";
import type { Answer, Assumption, IntentAnalysis } from "@/lib/pipeline/v2/types";

const KEY_PREFIX = "intent-cache:v1:";
const TTL_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Cached pipeline output — Layer 1-5 sonuçları + Layer 6 son metni. Cache
 * hit'te bu blob'dan Trace + Prompt yazılır.
 */
export interface CachedPipelineResult {
  /** Layer 6 final output */
  promptText: string;
  assumptions: Assumption[];
  validationScore: number | null;
  validationIssues: string[];
  /** Trace fields (intentJson/synthesisJson/validationJson) */
  intentAnalysis: IntentAnalysis;
  preprocessJson: { language: string; charCount: number; piiMasked: unknown };
  synthesisJson: unknown;
  validationJson: unknown;
  contextJson: {
    exemplarIds: string[];
    personaSlug: string | null;
    constitutionVersion: string | null;
  };
  engineSourcesJson: unknown;
  /** Original generation latency for telemetry; new request gets ~1ms wall clock. */
  originalLatencyMs: number;
  /** Original cache write timestamp (epoch ms). */
  cachedAt: number;
}

function normalizeIntent(intent: string): string {
  return intent
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function computeIntentCacheKey(args: {
  intent: string;
  modality: string;
  targetEngineId: string | null;
  answers: Answer[];
  /** Iteration → cache yoksay. Null → ana akış (cache aktif). */
  iteration: { ofPromptId: string; feedback: string } | null;
}): string | null {
  // Iteration mode → cache disabled (feedback per-user, tazelik şart)
  if (args.iteration) return null;

  const normalizedAnswers = (args.answers ?? [])
    .map((a) => `${a.question.trim()}=${a.answer.trim()}`)
    .sort()
    .join("|");

  const composite = [
    normalizeIntent(args.intent),
    args.modality,
    args.targetEngineId ?? "_no_target_",
    normalizedAnswers || "_no_answers_",
  ].join("\x1f"); // unit separator

  const hash = createHash("sha256").update(composite).digest("hex");
  return `${KEY_PREFIX}${hash}`;
}

export async function getCachedResult(
  key: string | null,
): Promise<CachedPipelineResult | null> {
  if (!key) return null;
  try {
    const r = getRedis();
    const raw = await r.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as CachedPipelineResult;
  } catch (err) {
    console.warn(
      "[intent-cache] redis get failed (cache miss):",
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

export async function setCachedResult(
  key: string | null,
  value: CachedPipelineResult,
): Promise<void> {
  if (!key) return;
  try {
    const r = getRedis();
    await r.set(key, JSON.stringify(value), "EX", TTL_SECONDS);
  } catch (err) {
    console.warn(
      "[intent-cache] redis set failed (continue without cache):",
      err instanceof Error ? err.message : err,
    );
  }
}
