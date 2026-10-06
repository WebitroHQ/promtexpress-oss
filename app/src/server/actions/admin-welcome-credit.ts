"use server";

import { requireAdmin, writeAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import {
  getWelcomeCreditAmount,
  setWelcomeCreditAmount,
} from "@/lib/onboarding/grant-welcome-credit";

export async function readWelcomeCreditAmount(): Promise<number> {
  await requireAdmin();
  return getWelcomeCreditAmount();
}

export async function saveWelcomeCreditAmount(amount: number): Promise<number> {
  const admin = await requireAdmin();
  if (!Number.isFinite(amount) || amount < 0 || amount > 10000) {
    throw new Error("Geçersiz kredi miktarı (0–10000 arası).");
  }
  const saved = await setWelcomeCreditAmount(amount, admin.email ?? undefined);
  await writeAudit({
    actorId: admin.id,
    action: "appSetting.setWelcomeCredit",
    targetType: "appSetting",
    targetId: "welcome.creditAmount",
    meta: { amount: saved },
  });
  revalidatePath("/pr/yonet/welcome-credit");
  return saved;
}
