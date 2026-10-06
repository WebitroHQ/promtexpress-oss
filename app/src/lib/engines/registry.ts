/**
 * Resolve a DB AiEngine row to a runtime adapter.
 *
 * Decrypts the API key with src/lib/crypto and returns an EngineAdapter.
 *
 * 2026-05-04 (FAZ A4): module-level cache (5 min TTL) avoids per-request
 * DB read + AES decrypt on hot path. Admin updates engine → invalidate via
 * `invalidateEngineCache(engineId?)` (called from /api/admin/cache/bust).
 */
import { db } from "@/db/client";
import { decrypt } from "@/lib/crypto";
import { AnthropicAdapter } from "./anthropic";
import { OpenAIAdapter } from "./openai";
import { GoogleAdapter } from "./google";
import { DeepseekAdapter } from "./deepseek";
import { OpenRouterAdapter } from "./openrouter";
import { EngineAdapter, EngineError } from "./types";
import { getUserEngine } from "./user-key";

export interface ResolvedEngine {
  adapter: EngineAdapter;
  /** AiEngine row info we still need downstream */
  meta: {
    id: string;
    name: string;
    provider: string;
    modelId: string;
    costPerUnit: number;
    unitType: string;
    // Model-level capability metadata (admin-managed)
    contextWindow: number | null;
    maxOutputTokens: number | null;
    preferredFormat: string | null;
    promptGuidelines: string | null;
    supportsVision: boolean;
    supportsReasoning: boolean;
  };
}

/**
 * FAZ C1 — engine cache value can hold multiple adapters when keyPool is set.
 * resolveEngine() rotates through them via a per-engine in-process counter.
 */
interface ResolvedEngineSet {
  adapters: EngineAdapter[];
  meta: ResolvedEngine["meta"];
  keyLabels: string[];
}

const ENGINE_CACHE = new Map<string, { value: ResolvedEngineSet; exp: number }>();
const ENGINE_COUNTER = new Map<string, number>();
const ENGINE_TTL_MS = 5 * 60 * 1000;

export function invalidateEngineCache(engineId?: string): void {
  if (engineId) {
    ENGINE_CACHE.delete(engineId);
    ENGINE_COUNTER.delete(engineId);
  } else {
    ENGINE_CACHE.clear();
    ENGINE_COUNTER.clear();
  }
}

interface KeyPoolEntry {
  encryptedKey: string;
  label?: string;
}

/**
 * Parse keyPool JSON safely — returns [] when shape is invalid.
 * Accepts either an array of strings (legacy shorthand) or {encryptedKey,label}.
 */
function parseKeyPool(raw: unknown): KeyPoolEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: KeyPoolEntry[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.length > 0) {
      out.push({ encryptedKey: item });
    } else if (item && typeof item === "object") {
      const ek = (item as { encryptedKey?: unknown }).encryptedKey;
      const lb = (item as { label?: unknown }).label;
      if (typeof ek === "string" && ek.length > 0) {
        out.push({ encryptedKey: ek, label: typeof lb === "string" ? lb : undefined });
      }
    }
  }
  return out;
}

export function buildAdapter(provider: string, apiKey: string, modelId: string): EngineAdapter {
  switch (provider) {
    case "anthropic":  return new AnthropicAdapter(apiKey, modelId);
    case "openai":     return new OpenAIAdapter(apiKey, modelId);
    case "google":     return new GoogleAdapter(apiKey, modelId);
    case "deepseek":   return new DeepseekAdapter(apiKey, modelId);
    case "openrouter": return new OpenRouterAdapter(apiKey, modelId);
    default:
      throw new EngineError(`Unsupported provider: ${provider}`, provider);
  }
}

async function loadEngineSet(engineId: string): Promise<ResolvedEngineSet> {
  const row = await db.aiEngine.findUnique({ where: { id: engineId } });
  if (!row) {
    throw new EngineError(`Engine ${engineId} not found`, "registry");
  }
  if (!row.isActive) {
    throw new EngineError(`Engine ${row.name} is not active`, row.provider);
  }

  const meta = {
    id: row.id,
    name: row.name,
    provider: row.provider,
    modelId: row.modelId,
    costPerUnit: Number(row.costPerUnit),
    unitType: row.unitType,
    contextWindow: row.contextWindow ?? null,
    maxOutputTokens: row.maxOutputTokens ?? null,
    preferredFormat: row.preferredFormat ?? null,
    promptGuidelines: row.promptGuidelines ?? null,
    supportsVision: row.supportsVision,
    supportsReasoning: row.supportsReasoning,
  };

  // FAZ C1 — Prefer keyPool when populated; otherwise fall back to encryptedKey.
  const pool = parseKeyPool(row.keyPool);
  const sources: KeyPoolEntry[] =
    pool.length > 0
      ? pool
      : row.encryptedKey
      ? [{ encryptedKey: row.encryptedKey, label: "primary" }]
      : [];

  if (sources.length === 0) {
    // Bring-your-own-key: an engine row may carry no key of its own; user generations never use it.
    return { adapters: [], meta, keyLabels: [] };
  }

  const adapters: EngineAdapter[] = [];
  const keyLabels: string[] = [];
  for (let i = 0; i < sources.length; i++) {
    const src = sources[i];
    let apiKey: string;
    try {
      apiKey = decrypt(src.encryptedKey);
    } catch {
      // Skip undecryptable key but continue with the rest — partial pool is better than zero.
      console.warn(`[registry] decrypt failed for ${row.name} key#${i} (${src.label ?? "unlabeled"}); skipping`);
      continue;
    }
    adapters.push(buildAdapter(row.provider, apiKey, row.modelId));
    keyLabels.push(src.label ?? `key#${i}`);
  }
  if (adapters.length === 0) {
    throw new EngineError(`All keys for ${row.name} failed decryption`, row.provider);
  }
  return { adapters, meta, keyLabels };
}

/**
 * Resolve an active engine by id. Returns ONE adapter per call — when the
 * engine has a keyPool with N entries, successive calls round-robin over them.
 *
 * Throws EngineError if not found, inactive, or missing/decrypt-failed key.
 */
export async function resolveEngine(engineId: string): Promise<ResolvedEngine> {
  const now = Date.now();
  let cached = ENGINE_CACHE.get(engineId);
  if (!cached || cached.exp <= now) {
    const set = await loadEngineSet(engineId);
    cached = { value: set, exp: now + ENGINE_TTL_MS };
    ENGINE_CACHE.set(engineId, cached);
  }
  const set = cached.value;

  // Bring-your-own-key: inside a user generation every role runs on the user's own key and model.
  // The engine row still supplies id/name for tracing; model-specific hints do not apply.
  const userEngine = getUserEngine();
  if (userEngine) {
    return {
      adapter: userEngine.adapter,
      meta: {
        ...set.meta,
        provider: userEngine.provider,
        modelId: userEngine.modelId,
        costPerUnit: 0,
        contextWindow: null,
        maxOutputTokens: null,
        preferredFormat: null,
        promptGuidelines: null,
        supportsVision: false,
        supportsReasoning: false,
      },
    };
  }
  if (set.adapters.length === 0) {
    throw new EngineError(`Engine ${set.meta.name} has no API key configured`, set.meta.provider);
  }
  // Round-robin index
  const counter = (ENGINE_COUNTER.get(engineId) ?? 0) + 1;
  ENGINE_COUNTER.set(engineId, counter);
  const idx = counter % set.adapters.length;
  return { adapter: set.adapters[idx], meta: set.meta };
}
