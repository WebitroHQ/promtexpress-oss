/**
 * Modality → Engine resolver.
 *
 * Admin assigns engines per modality via /pr/yonet/mapping (ModalityMapping table).
 * Pipeline reads this table FIRST; if no mapping (or engine missing/inactive/no key),
 * caller falls back to resolveRoleEngine() (role-level default).
 *
 * Slot semantics:
 *   - "primary"    → Layer 4 synthesizer (per modality preferred engine)
 *   - "fallback"   → Layer 4 synthesizer (used when primary fails — caller decides)
 *   - "questioner" → Layer 2 intent-analyzer (chip questions, scenario detection)
 *   - "validator"  → Layer 5 SAFETY_CHECKER (AI safety pass)
 *
 * Hardcode rule (CLAUDE.md §8): no model name / provider hardcoded here.
 * Engine selection is fully DB-driven.
 */
import { db } from "@/db/client";
import { AgentRoleSlug } from "@prisma/client";
import { resolveRoleEngine, resolveRoleEngineSet } from "./role-engine";
import type { Modality } from "./types";
import { PipelineError } from "./types";

export type ModalityEngineSlot = "primary" | "fallback" | "questioner" | "validator";

export interface ResolvedModalityEngine {
  engineId: string;
  source: "modality-mapping";
  slot: ModalityEngineSlot;
}

/**
 * Resolve a modality-specific engine for a given slot.
 * Returns null if no mapping exists, mapping is disabled, slot is unset,
 * or the referenced engine is inactive / missing API key.
 *
 * Caller is expected to fall back to resolveRoleEngine() on null.
 */
export async function resolveModalityEngine(
  modality: Modality,
  slot: ModalityEngineSlot,
): Promise<ResolvedModalityEngine | null> {
  const mapping = await db.modalityMapping.findUnique({
    where: { modality },
    include: {
      primary: { select: { id: true, isActive: true, encryptedKey: true } },
      fallback: { select: { id: true, isActive: true, encryptedKey: true } },
      questioner: { select: { id: true, isActive: true, encryptedKey: true } },
      validator: { select: { id: true, isActive: true, encryptedKey: true } },
    },
  });

  if (!mapping || !mapping.isEnabled) return null;

  const engine =
    slot === "primary" ? mapping.primary :
    slot === "fallback" ? mapping.fallback :
    slot === "questioner" ? mapping.questioner :
    mapping.validator;

  if (!engine) return null;
  if (!engine.isActive) return null;
  if (!engine.encryptedKey || engine.encryptedKey.length === 0) return null;

  return { engineId: engine.id, source: "modality-mapping", slot };
}

export type EngineSource = "modality-mapping" | "role-assignment";

export interface ResolvedLayerEngine {
  engineId: string;
  source: EngineSource;
  /** Slot used when source = "modality-mapping"; null otherwise. */
  slot: ModalityEngineSlot | null;
  /** Role used when source = "role-assignment"; null otherwise. */
  roleSlug: AgentRoleSlug | null;
}

/**
 * Composite resolver: try modality-mapping first, fall back to role-assignment.
 * Used by Layer 2 / 4 / 5 so the pipeline reads admin's per-modality choice
 * before the global role-level default.
 */
export async function resolveLayerEngine(args: {
  modality: Modality;
  slot: ModalityEngineSlot;
  roleSlug: AgentRoleSlug;
  layer: 1 | 2 | 3 | 4 | 5 | 6;
}): Promise<ResolvedLayerEngine> {
  const modalityHit = await resolveModalityEngine(args.modality, args.slot);
  if (modalityHit) {
    return {
      engineId: modalityHit.engineId,
      source: "modality-mapping",
      slot: modalityHit.slot,
      roleSlug: null,
    };
  }
  const role = await resolveRoleEngine(args.roleSlug, args.layer);
  return {
    engineId: role.engineId,
    source: "role-assignment",
    slot: null,
    roleSlug: role.roleSlug,
  };
}

// ──────────────────────────────────────────────────────
// FAZ C2 (2026-05-04) — Cross-engine fallback chain
// ──────────────────────────────────────────────────────

export interface ResolvedLayerEngineSet {
  primary: ResolvedLayerEngine;
  fallbacks: ResolvedLayerEngine[];
}

/**
 * Build the ordered engine attempt chain for a layer. Order:
 *   1. modality-mapping primary (if admin set it for this slot)
 *   2. modality-mapping fallback (separate slot in ModalityMapping table)
 *   3. role-assignment primary
 *   4. role-assignment fallbackEngineIds (in admin order)
 *
 * Duplicates by engineId are collapsed (first wins). Throws PipelineError
 * when no engine is available at all.
 */
export async function resolveLayerEngineSet(args: {
  modality: Modality;
  slot: ModalityEngineSlot;
  roleSlug: AgentRoleSlug;
  layer: 1 | 2 | 3 | 4 | 5 | 6;
}): Promise<ResolvedLayerEngineSet> {
  const seen = new Set<string>();
  const chain: ResolvedLayerEngine[] = [];

  const push = (entry: ResolvedLayerEngine) => {
    if (seen.has(entry.engineId)) return;
    seen.add(entry.engineId);
    chain.push(entry);
  };

  // 1. modality-mapping primary slot
  const mp = await resolveModalityEngine(args.modality, args.slot);
  if (mp) {
    push({
      engineId: mp.engineId,
      source: "modality-mapping",
      slot: mp.slot,
      roleSlug: null,
    });
  }

  // 2. modality-mapping fallback slot (skip if we're already on the fallback slot)
  if (args.slot !== "fallback") {
    const mf = await resolveModalityEngine(args.modality, "fallback");
    if (mf) {
      push({
        engineId: mf.engineId,
        source: "modality-mapping",
        slot: "fallback",
        roleSlug: null,
      });
    }
  }

  // 3 + 4. role-assignment primary + fallback chain
  try {
    const roleSet = await resolveRoleEngineSet(args.roleSlug, args.layer);
    push({
      engineId: roleSet.primary.engineId,
      source: "role-assignment",
      slot: null,
      roleSlug: args.roleSlug,
    });
    for (const fid of roleSet.fallbackEngineIds) {
      push({
        engineId: fid,
        source: "role-assignment",
        slot: null,
        roleSlug: args.roleSlug,
      });
    }
  } catch (err) {
    // Role assignment may legitimately fail (no admin assignment); only throw
    // if we also have nothing from modality-mapping.
    if (chain.length === 0) throw err;
  }

  if (chain.length === 0) {
    throw new PipelineError(
      `No engine available for ${args.roleSlug} (modality=${args.modality} slot=${args.slot})`,
      args.layer,
    );
  }

  return { primary: chain[0], fallbacks: chain.slice(1) };
}

export interface EngineAttemptLog {
  engineId: string;
  source: EngineSource;
  durationMs: number;
  error?: string;
  /** Set when the attempt produced text but did not pass `acceptable`. */
  unacceptable?: boolean;
  /** Set when the attempt was aborted by per-engine timeout. */
  timedOut?: boolean;
}

export interface FallbackResult<T> {
  result: T;
  usedEngine: ResolvedLayerEngine;
  fallbackUsed: boolean;
  attempts: number;
  /** Set when `bestEffort` was used because no attempt was `acceptable`. */
  degraded: boolean;
  /** Per-engine attempt log — feeds GenerationTrace.finalJson.engineAttempts. */
  attemptsLog: EngineAttemptLog[];
}

export interface RunWithEngineFallbackOptions<T> {
  /**
   * Returns true if the result is acceptable as final output.
   * If absent, ANY successful return is acceptable (legacy behavior).
   */
  acceptable?: (result: T) => boolean;
  /**
   * When all attempts produced text but none was `acceptable`, this is called
   * with the unacceptable candidates (in attempt order). Return a non-null
   * value to deliver it as `degraded: true`. Return null to fall through to
   * the "all engines failed" throw.
   */
  bestEffort?: (
    candidates: Array<{ engine: ResolvedLayerEngine; result: T }>,
  ) => T | null;
  /** Per-engine wall budget (ms). When fired, `signal.abort()` is called. */
  perEngineTimeoutMs?: number;
  /**
   * Outer wall budget (ms) for the entire chain. When the elapsed time
   * exceeds this between attempts, remaining engines are skipped.
   */
  totalBudgetMs?: number;
}

/**
 * Walk the engine chain (primary → fallback[0] → fallback[1] → …).
 *
 * 2026-05-12 (Garantili Teslimat v2): the chain now supports best-effort
 * delivery. If no attempt is `acceptable` but at least one produced text,
 * `bestEffort` selects which candidate to return as `degraded: true`.
 *
 * `fn` is invoked with `(engine, attemptIdx, signal?)`. Adapters that
 * support AbortSignal must thread it through to the underlying SDK so the
 * per-engine timeout actually cancels in-flight requests.
 */
export async function runWithEngineFallback<T>(
  set: ResolvedLayerEngineSet,
  fn: (engine: ResolvedLayerEngine, attemptIdx: number, signal?: AbortSignal) => Promise<T>,
  options: RunWithEngineFallbackOptions<T> = {},
): Promise<FallbackResult<T>> {
  const chain = [set.primary, ...set.fallbacks];
  const { acceptable, bestEffort, perEngineTimeoutMs, totalBudgetMs } = options;
  const startedAt = Date.now();
  const attemptsLog: EngineAttemptLog[] = [];
  const unacceptableCandidates: Array<{ engine: ResolvedLayerEngine; result: T }> = [];
  let lastErr: unknown = null;

  for (let i = 0; i < chain.length; i++) {
    if (totalBudgetMs != null && Date.now() - startedAt >= totalBudgetMs) {
      console.warn(
        `[engine-fallback] total budget ${totalBudgetMs}ms exhausted before attempt ${i + 1}/${chain.length}`,
      );
      break;
    }

    const eng = chain[i];
    const attemptStarted = Date.now();
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let timedOut = false;
    if (perEngineTimeoutMs != null && perEngineTimeoutMs > 0) {
      timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, perEngineTimeoutMs);
    }

    try {
      const result = await fn(eng, i, controller.signal);
      if (timer) clearTimeout(timer);
      const durationMs = Date.now() - attemptStarted;
      const ok = acceptable ? acceptable(result) : true;
      if (ok) {
        attemptsLog.push({
          engineId: eng.engineId,
          source: eng.source,
          durationMs,
        });
        return {
          result,
          usedEngine: eng,
          fallbackUsed: i > 0,
          attempts: i + 1,
          degraded: false,
          attemptsLog,
        };
      }
      // Got text but not acceptable — keep as best-effort candidate.
      unacceptableCandidates.push({ engine: eng, result });
      attemptsLog.push({
        engineId: eng.engineId,
        source: eng.source,
        durationMs,
        unacceptable: true,
      });
    } catch (err) {
      if (timer) clearTimeout(timer);
      lastErr = err;
      const msg = err instanceof Error ? err.message : String(err);
      const durationMs = Date.now() - attemptStarted;
      attemptsLog.push({
        engineId: eng.engineId,
        source: eng.source,
        durationMs,
        error: msg,
        timedOut: timedOut || undefined,
      });
      console.warn(
        `[engine-fallback] attempt ${i + 1}/${chain.length} engineId=${eng.engineId} source=${eng.source} failed: ${msg}${timedOut ? " (per-engine timeout)" : ""}`,
      );
    }
  }

  // No acceptable success. Try best-effort if candidates exist.
  if (bestEffort && unacceptableCandidates.length > 0) {
    const picked = bestEffort(unacceptableCandidates);
    if (picked != null) {
      // Use first candidate's engine as the "used engine" attribution.
      const first = unacceptableCandidates[0];
      console.warn(
        `[engine-fallback] degraded best-effort delivery via engineId=${first.engine.engineId} (${unacceptableCandidates.length} unacceptable candidates)`,
      );
      return {
        result: picked,
        usedEngine: first.engine,
        fallbackUsed: true,
        attempts: attemptsLog.length,
        degraded: true,
        attemptsLog,
      };
    }
  }

  if (lastErr instanceof Error) throw lastErr;
  throw new Error("All engines in the fallback chain failed");
}

