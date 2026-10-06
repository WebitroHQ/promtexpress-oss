/**
 * Layer timeout configuration (2026-05-04 — Layer Timeout Architecture).
 *
 * Pipeline layer timeouts are read from the AppSetting table at runtime so
 * admins can tune them via /pr/yonet/system-settings without code changes.
 * In-memory cache (5 min TTL) keeps DB pressure low; admin "save" should call
 * /api/admin/cache/bust scope=context (or "all") to invalidate immediately.
 *
 * Defaults are deliberately generous (intent 60s, synth 90s, safety 30s) to
 * accommodate slow reasoning models (DeepSeek V4 Pro/Flash, R1, o1-class)
 * which can spend 15-25s in `reasoning_content` before emitting JSON-or-text.
 *
 * Hardcode rule (CLAUDE.md §8): no model name here. Pure timing config.
 */
import { db } from "@/db/client";

export type LayerTimeoutKey = "intent" | "synth" | "safety";

export interface LayerTimeouts {
  intent: number; // ms — Layer 2 intent-analyzer total budget (adapter call + repair)
  synth: number;  // ms — Layer 4 synthesizer total budget
  safety: number; // ms — Layer 5 AI safety check total budget
}

const DEFAULTS: LayerTimeouts = {
  intent: 60_000,
  synth: 90_000,
  safety: 30_000,
};

const SETTING_KEYS: Record<LayerTimeoutKey, string> = {
  intent: "pipeline.timeout.intent_ms",
  synth: "pipeline.timeout.synth_ms",
  safety: "pipeline.timeout.safety_ms",
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let cached: { value: LayerTimeouts; exp: number } | null = null;

function parsePositiveInt(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/**
 * Returns layer timeouts. Reads AppSetting on cache miss; falls back to
 * DEFAULTS when DB is unavailable, key is missing, or value is invalid.
 * Defensive: NEVER throws — pipeline must always have a usable timeout.
 */
export async function getPipelineTimeouts(): Promise<LayerTimeouts> {
  const now = Date.now();
  if (cached && cached.exp > now) return cached.value;

  let value: LayerTimeouts = { ...DEFAULTS };
  try {
    const rows = await db.appSetting.findMany({
      where: { key: { in: Object.values(SETTING_KEYS) } },
      select: { key: true, value: true },
    });
    const byKey = new Map(rows.map((r) => [r.key, r.value]));
    for (const layer of Object.keys(SETTING_KEYS) as LayerTimeoutKey[]) {
      const parsed = parsePositiveInt(byKey.get(SETTING_KEYS[layer]));
      if (parsed !== null) value[layer] = parsed;
    }
  } catch (err) {
    console.warn(
      "[pipeline-timeouts] DB read failed — using defaults:",
      err instanceof Error ? err.message : err,
    );
  }

  cached = { value, exp: now + CACHE_TTL_MS };
  return value;
}

export function invalidatePipelineTimeoutsCache(): void {
  cached = null;
}
