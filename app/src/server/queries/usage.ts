import { db } from "@/db/client";

export interface DailyUsage {
  day: string;
  credits: number;
}

/**
 * Daily credit usage from CreditLedger for the last `days`.
 * Returns one entry per day (zero-filled for days with no usage).
 */
export async function getDailyUsage(userId: string, days = 14): Promise<DailyUsage[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  // Generation is free, so usage is the number of prompts generated per day. The field is still
  // called `credits` because the chart component reads it under that name.
  const promptRows = await db.prompt.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { createdAt: true },
  });

  // Build a map: "YYYY-MM-DD" → prompts generated
  const byDay = new Map<string, number>();
  for (const row of promptRows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    byDay.set(key, (byDay.get(key) ?? 0) + 1);
  }

  // Generate last `days` dates, zero-filled — UTC consistent with map keys
  const result: DailyUsage[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    const label = `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
    result.push({ day: label, credits: byDay.get(key) ?? 0 });
  }

  return result;
}
