import { db } from "@/db/client";
import { USER_KEY_PROVIDERS, isUserKeyProvider } from "@/lib/engines/user-key";

/** What the browser may know about a stored key: never the key itself. */
export interface AiKeyRow {
  id: string;
  provider: string;
  providerLabel: string;
  modelId: string;
  label: string | null;
  keyHint: string;
  isActive: boolean;
  lastUsedAt: string | null;
  lastError: string | null;
  createdAt: string;
}

export async function listAiKeys(userId: string): Promise<AiKeyRow[]> {
  const rows = await db.userAiKey.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
  return rows.map((row) => ({
    id: row.id,
    provider: row.provider,
    providerLabel: isUserKeyProvider(row.provider) ? USER_KEY_PROVIDERS[row.provider].label : row.provider,
    modelId: row.modelId,
    label: row.label,
    keyHint: row.keyHint,
    isActive: row.isActive,
    lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
    lastError: row.lastError,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function userHasActiveAiKey(userId: string): Promise<boolean> {
  return (await db.userAiKey.count({ where: { userId, isActive: true } })) > 0;
}
