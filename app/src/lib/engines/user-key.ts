/**
 * Bring-your-own-key: every generation runs on the signed-in user's own provider key.
 *
 * The pipeline still resolves role → AiEngine rows for metadata and tracing, but while a user
 * engine is active (AsyncLocalStorage), `resolveEngine()` returns an adapter built from the
 * user's key instead of the engine's own key. The site never pays for a user's generation.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import { db } from "@/db/client";
import { decrypt } from "@/lib/crypto";
import type { EngineAdapter } from "./types";

/** Providers a user can bring a key for, with the model used when they don't pick one. */
export const USER_KEY_PROVIDERS = {
  openai: { label: "OpenAI", defaultModel: "gpt-4o-mini" },
  anthropic: { label: "Anthropic", defaultModel: "claude-haiku-4-5-20251001" },
  google: { label: "Google Gemini", defaultModel: "gemini-2.0-flash" },
  deepseek: { label: "DeepSeek", defaultModel: "deepseek-chat" },
  openrouter: { label: "OpenRouter", defaultModel: "openai/gpt-4o-mini" },
} as const;

export type UserKeyProvider = keyof typeof USER_KEY_PROVIDERS;

export function isUserKeyProvider(value: string): value is UserKeyProvider {
  return Object.hasOwn(USER_KEY_PROVIDERS, value);
}

export interface UserEngine {
  keyId: string;
  provider: UserKeyProvider;
  modelId: string;
  adapter: EngineAdapter;
}

/** Thrown when a user tries to generate without an active key. Routes map it to 412. */
export class MissingAiKeyError extends Error {
  readonly code = "NO_AI_KEY";
  constructor() {
    super("Add your own AI provider API key in Settings to generate prompts.");
    this.name = "MissingAiKeyError";
  }
}

const storage = new AsyncLocalStorage<UserEngine>();

export function getUserEngine(): UserEngine | undefined {
  return storage.getStore();
}

/** Loads the user's active key and runs `fn` with it; throws MissingAiKeyError when there is none. */
export async function runWithUserEngine<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  const row = await db.userAiKey.findFirst({
    where: { userId, isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!row || !isUserKeyProvider(row.provider)) throw new MissingAiKeyError();

  // Imported lazily: registry imports this module for getUserEngine().
  const { buildAdapter } = await import("./registry");
  const adapter = buildAdapter(row.provider, decrypt(row.encryptedKey), row.modelId);
  const engine: UserEngine = { keyId: row.id, provider: row.provider, modelId: row.modelId, adapter };

  try {
    const result = await storage.run(engine, fn);
    await db.userAiKey
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date(), lastError: null } })
      .catch(() => undefined);
    return result;
  } catch (err) {
    const { EngineError } = await import("./types");
    if (err instanceof EngineError) {
      // Surface provider failures (bad key, no quota) on the key so Settings can show them.
      await db.userAiKey
        .update({ where: { id: row.id }, data: { lastError: err.message.slice(0, 500), lastErrorAt: new Date() } })
        .catch(() => undefined);
    }
    throw err;
  }
}
