"use server";

import { db } from "@/db/client";
import { requireAdmin, writeAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { APP_SETTING_KEYS } from "@/server/queries/app-settings";

export async function setTranslationEngine(aiEngineId: string): Promise<void> {
  const admin = await requireAdmin();
  await db.appSetting.upsert({
    where: { key: "translation_engine_id" },
    create: { key: "translation_engine_id", value: aiEngineId, updatedAt: new Date(), updatedBy: admin.email },
    update: { value: aiEngineId, updatedAt: new Date(), updatedBy: admin.email },
  });
  await writeAudit({ actorId: admin.id, action: "appSetting.setTranslationEngine", targetType: "appSetting", targetId: "translation_engine_id", meta: { aiEngineId } });
  revalidatePath("/pr/yonet/system-settings");
  revalidatePath("/pr/yonet/library/settings");
}

export async function setSystemSetting(key: string, value: string, notes?: string): Promise<void> {
  const admin = await requireAdmin();
  await db.appSetting.upsert({
    where: { key },
    create: { key, value, notes: notes ?? null, updatedAt: new Date(), updatedBy: admin.email },
    update: { value, notes: notes ?? undefined, updatedAt: new Date(), updatedBy: admin.email },
  });
  await writeAudit({ actorId: admin.id, action: "appSetting.set", targetType: "appSetting", targetId: key, meta: { value: value.length > 64 ? value.slice(0, 64) + "…" : value } });
  revalidatePath("/pr/yonet/system-settings");
}

