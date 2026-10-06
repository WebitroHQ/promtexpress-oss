"use server";

import { db } from "@/db/client";
import { encrypt } from "@/lib/crypto";
import { requireAdmin, writeAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function toggleEngineActive(
  engineId: string,
  active: boolean,
): Promise<void> {
  const admin = await requireAdmin();
  await db.aiEngine.update({ where: { id: engineId }, data: { isActive: active } });
  await writeAudit({ actorId: admin.id, action: "engine.toggleActive", targetType: "aiEngine", targetId: engineId, meta: { active } });
}

export async function saveEngineApiKey(
  engineId: string,
  plainKey: string,
): Promise<void> {
  const admin = await requireAdmin();
  const trimmed = plainKey.trim();
  if (!trimmed) throw new Error("API key cannot be empty");
  const encryptedKey = encrypt(trimmed);
  await db.aiEngine.update({ where: { id: engineId }, data: { encryptedKey } });
  await writeAudit({ actorId: admin.id, action: "engine.saveApiKey", targetType: "aiEngine", targetId: engineId });
}

export async function addEngine(data: {
  name: string;
  provider: string;
  modelId: string;
  costPerUnit: number;
  unitType: string;
  contextWindow?: number | null;
  maxOutputTokens?: number | null;
  preferredFormat?: string | null;
  promptGuidelines?: string | null;
  supportsVision?: boolean;
  supportsReasoning?: boolean;
}): Promise<void> {
  const admin = await requireAdmin();
  const name = data.name.trim();
  const provider = data.provider.trim();
  const modelId = data.modelId.trim();
  if (!name || !provider || !modelId) throw new Error("Name, provider and model ID are required");

  const maxOrder = await db.aiEngine.aggregate({ _max: { sortOrder: true } });
  const created = await db.aiEngine.create({
    data: {
      name,
      provider,
      modelId,
      encryptedKey: "",
      costPerUnit: data.costPerUnit,
      unitType: data.unitType,
      isActive: false,
      sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
      contextWindow: data.contextWindow ?? null,
      maxOutputTokens: data.maxOutputTokens ?? null,
      preferredFormat: data.preferredFormat?.trim() ? data.preferredFormat.trim() : null,
      promptGuidelines: data.promptGuidelines?.trim() ? data.promptGuidelines.trim() : null,
      supportsVision: data.supportsVision ?? false,
      supportsReasoning: data.supportsReasoning ?? false,
    },
  });
  await writeAudit({ actorId: admin.id, action: "engine.create", targetType: "aiEngine", targetId: created.id, meta: { name, provider, modelId } });
  revalidatePath("/pr/yonet/engines");
}

export async function updateEngineCapabilities(
  engineId: string,
  caps: {
    contextWindow: number | null;
    maxOutputTokens: number | null;
    preferredFormat: string | null;
    promptGuidelines: string | null;
    supportsVision: boolean;
    supportsReasoning: boolean;
  },
): Promise<void> {
  const admin = await requireAdmin();
  const normalizedFormat = caps.preferredFormat?.trim() ? caps.preferredFormat.trim() : null;
  const normalizedGuide = caps.promptGuidelines?.trim() ? caps.promptGuidelines.trim() : null;
  await db.aiEngine.update({
    where: { id: engineId },
    data: {
      contextWindow: caps.contextWindow,
      maxOutputTokens: caps.maxOutputTokens,
      preferredFormat: normalizedFormat,
      promptGuidelines: normalizedGuide,
      supportsVision: caps.supportsVision,
      supportsReasoning: caps.supportsReasoning,
    },
  });
  await writeAudit({
    actorId: admin.id,
    action: "engine.updateCapabilities",
    targetType: "aiEngine",
    targetId: engineId,
    meta: {
      ...caps,
      preferredFormat: normalizedFormat,
      promptGuidelines: normalizedGuide,
    },
  });
  revalidatePath("/pr/yonet/engines");
}

export async function updateModalityMappings(
  mappings: Array<{
    modality: string;
    primaryId: string | null;
    fallbackId: string | null;
    questionerId: string | null;
    validatorId: string | null;
    isEnabled: boolean;
  }>,
): Promise<void> {
  const admin = await requireAdmin();
  await Promise.all(
    mappings.map((m) =>
      db.modalityMapping.upsert({
        where: { modality: m.modality },
        create: {
          modality: m.modality,
          primaryId: m.primaryId || null,
          fallbackId: m.fallbackId || null,
          questionerId: m.questionerId || null,
          validatorId: m.validatorId || null,
          isEnabled: m.isEnabled,
        },
        update: {
          primaryId: m.primaryId || null,
          fallbackId: m.fallbackId || null,
          questionerId: m.questionerId || null,
          validatorId: m.validatorId || null,
          isEnabled: m.isEnabled,
        },
      }),
    ),
  );
  await writeAudit({ actorId: admin.id, action: "mapping.update", targetType: "modalityMapping", meta: { count: mappings.length } });
  revalidatePath("/pr/yonet/mapping");
}
