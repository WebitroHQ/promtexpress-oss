"use server";

/**
 * A user's own AI provider keys (bring-your-own-key).
 *
 * Keys are encrypted at rest (src/lib/crypto.ts) and never sent back to the browser: the UI only
 * ever sees the last four characters. A user may store several keys; exactly one is active and
 * every generation runs on it.
 */
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { encrypt, decrypt } from "@/lib/crypto";
import { writeAudit } from "@/lib/audit";
import { buildAdapter } from "@/lib/engines/registry";
import { USER_KEY_PROVIDERS, isUserKeyProvider } from "@/lib/engines/user-key";

const MAX_KEYS_PER_USER = 10;

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

export async function addAiKey(input: {
  provider: string;
  apiKey: string;
  modelId?: string;
  label?: string;
}): Promise<Result> {
  const userId = await requireUserId();
  const provider = input.provider;
  const apiKey = input.apiKey.trim();
  if (!isUserKeyProvider(provider)) return { ok: false, error: "Unsupported provider" };
  if (apiKey.length < 16 || apiKey.length > 400 || /\s/.test(apiKey)) return { ok: false, error: "That doesn't look like an API key" };

  const modelId = input.modelId?.trim() || USER_KEY_PROVIDERS[provider].defaultModel;
  if (modelId.length > 120) return { ok: false, error: "Model name is too long" };
  const label = input.label?.trim().slice(0, 60) || null;

  const count = await db.userAiKey.count({ where: { userId } });
  if (count >= MAX_KEYS_PER_USER) return { ok: false, error: `You can store up to ${MAX_KEYS_PER_USER} keys` };

  const created = await db.userAiKey.create({
    data: {
      userId,
      provider,
      modelId,
      label,
      encryptedKey: encrypt(apiKey),
      keyHint: apiKey.slice(-4),
      // The first key becomes the active one, so a new user can generate right away.
      isActive: count === 0,
    },
  });
  await writeAudit({ actorId: userId, action: "AI_KEY_ADDED", meta: { keyId: created.id, provider, modelId } });
  revalidatePath("/settings");
  return { ok: true };
}

export async function setActiveAiKey(keyId: string): Promise<Result> {
  const userId = await requireUserId();
  const key = await db.userAiKey.findFirst({ where: { id: keyId, userId } });
  if (!key) return { ok: false, error: "Key not found" };
  await db.$transaction([
    db.userAiKey.updateMany({ where: { userId, isActive: true }, data: { isActive: false } }),
    db.userAiKey.update({ where: { id: key.id }, data: { isActive: true } }),
  ]);
  revalidatePath("/settings");
  return { ok: true };
}

export async function removeAiKey(keyId: string): Promise<Result> {
  const userId = await requireUserId();
  const key = await db.userAiKey.findFirst({ where: { id: keyId, userId } });
  if (!key) return { ok: false, error: "Key not found" };
  await db.userAiKey.delete({ where: { id: key.id } });
  if (key.isActive) {
    // Keep the user able to generate: promote the oldest remaining key.
    const next = await db.userAiKey.findFirst({ where: { userId }, orderBy: { createdAt: "asc" } });
    if (next) await db.userAiKey.update({ where: { id: next.id }, data: { isActive: true } });
  }
  await writeAudit({ actorId: userId, action: "AI_KEY_REMOVED", meta: { keyId, provider: key.provider } });
  revalidatePath("/settings");
  return { ok: true };
}

/** Sends one tiny request with the stored key so the user learns right away whether it works. */
export async function testAiKey(keyId: string): Promise<Result<{ latencyMs: number }>> {
  const userId = await requireUserId();
  const key = await db.userAiKey.findFirst({ where: { id: keyId, userId } });
  if (!key) return { ok: false, error: "Key not found" };
  try {
    const adapter = buildAdapter(key.provider, decrypt(key.encryptedKey), key.modelId);
    const out = await adapter.generate({
      systemPrompt: "Reply with the single word OK.",
      userMessage: "ping",
      maxTokens: 16,
      temperature: 0,
      signal: AbortSignal.timeout(30_000),
    });
    await db.userAiKey.update({ where: { id: key.id }, data: { lastError: null, lastErrorAt: null } });
    revalidatePath("/settings");
    return { ok: true, data: { latencyMs: out.latencyMs } };
  } catch (err) {
    const message = (err instanceof Error ? err.message : "Request failed").slice(0, 300);
    await db.userAiKey.update({ where: { id: key.id }, data: { lastError: message, lastErrorAt: new Date() } });
    revalidatePath("/settings");
    return { ok: false, error: message };
  }
}
