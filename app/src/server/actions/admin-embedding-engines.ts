"use server";

import { db } from "@/db/client";
import { encrypt } from "@/lib/crypto";
import { requireAdmin, writeAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const REVALIDATE = "/pr/yonet/embedding-engines";

export async function addEmbeddingEngine(data: {
  name: string;
  provider: string;
  modelId: string;
  dimensions: number;
  costPer1MTokens: number;
  notes?: string;
  apiKey?: string;
}): Promise<void> {
  const admin = await requireAdmin();
  const name = data.name.trim();
  const provider = data.provider.trim();
  const modelId = data.modelId.trim();
  if (!name || !provider || !modelId) throw new Error("Name, provider and modelId are required");
  if (data.dimensions < 1) throw new Error("Dimensions must be positive");

  const rawKey = data.apiKey?.trim() ?? "";
  const encryptedKey = rawKey ? encrypt(rawKey) : "";

  const created = await db.embeddingEngine.create({
    data: {
      name,
      provider,
      modelId,
      encryptedKey,
      dimensions: data.dimensions,
      costPer1MTokens: data.costPer1MTokens,
      notes: data.notes?.trim() || null,
      isActive: encryptedKey.length > 0,
      isDefault: false,
    },
  });
  await writeAudit({ actorId: admin.id, action: "embeddingEngine.create", targetType: "embeddingEngine", targetId: created.id, meta: { name, provider, modelId } });
  revalidatePath(REVALIDATE);
}

export async function saveEmbeddingEngineKey(id: string, plainKey: string): Promise<void> {
  const admin = await requireAdmin();
  const trimmed = plainKey.trim();
  if (!trimmed) throw new Error("API key cannot be empty");
  await db.embeddingEngine.update({
    where: { id },
    data: { encryptedKey: encrypt(trimmed), isActive: true },
  });
  await writeAudit({ actorId: admin.id, action: "embeddingEngine.saveKey", targetType: "embeddingEngine", targetId: id });
  revalidatePath(REVALIDATE);
}

export async function toggleEmbeddingEngineActive(id: string, active: boolean): Promise<void> {
  const admin = await requireAdmin();
  await db.embeddingEngine.update({ where: { id }, data: { isActive: active } });
  await writeAudit({ actorId: admin.id, action: "embeddingEngine.toggleActive", targetType: "embeddingEngine", targetId: id, meta: { active } });
  revalidatePath(REVALIDATE);
}

export async function setDefaultEmbeddingEngine(id: string): Promise<void> {
  const admin = await requireAdmin();
  await db.$transaction([
    db.embeddingEngine.updateMany({ data: { isDefault: false } }),
    db.embeddingEngine.update({ where: { id }, data: { isDefault: true, isActive: true } }),
    db.appSetting.upsert({
      where: { key: "embedding_engine_id" },
      create: { key: "embedding_engine_id", value: id, updatedAt: new Date() },
      update: { value: id, updatedAt: new Date() },
    }),
  ]);
  await writeAudit({ actorId: admin.id, action: "embeddingEngine.setDefault", targetType: "embeddingEngine", targetId: id });
  revalidatePath(REVALIDATE);
}

export async function deleteEmbeddingEngine(id: string): Promise<void> {
  const admin = await requireAdmin();
  const engine = await db.embeddingEngine.findUnique({ where: { id } });
  if (engine?.isDefault) throw new Error("Cannot delete the default embedding engine. Set another as default first.");
  await db.embeddingEngine.delete({ where: { id } });
  await writeAudit({ actorId: admin.id, action: "embeddingEngine.delete", targetType: "embeddingEngine", targetId: id });
  revalidatePath(REVALIDATE);
}
