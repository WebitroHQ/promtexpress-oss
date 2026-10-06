import { db } from "@/db/client";

const WELCOME_CREDIT_KEY = "welcome.creditAmount";

export async function getWelcomeCreditAmount(): Promise<number> {
  const row = await db.appSetting.findUnique({ where: { key: WELCOME_CREDIT_KEY } });
  if (!row) return 0;
  const n = parseInt(row.value, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export async function setWelcomeCreditAmount(amount: number, updatedBy?: string) {
  const safe = Math.max(0, Math.min(10000, Math.floor(amount)));
  await db.appSetting.upsert({
    where: { key: WELCOME_CREDIT_KEY },
    create: {
      key: WELCOME_CREDIT_KEY,
      value: String(safe),
      notes: "Hosgeldin kredisi - yeni uyelere otomatik yuklenir",
      updatedBy,
    },
    update: { value: String(safe), updatedBy },
  });
  return safe;
}

export async function grantWelcomeCredit(userId: string): Promise<number> {
  const amount = await getWelcomeCreditAmount();
  if (amount <= 0) return 0;

  const exists = await db.creditLedger.findFirst({
    where: { userId, reason: "WELCOME_GRANT" },
    select: { id: true },
  });
  if (exists) return 0;

  await db.creditLedger.create({
    data: {
      userId,
      delta: amount,
      reason: "WELCOME_GRANT",
      meta: { source: "signup" },
    },
  });
  return amount;
}
