import { db } from "@/db/client";
import { computeUserBalance, type BalanceBreakdown } from "@/lib/credits/balance";

/**
 * Compute current credit state for a user.
 *
 * Returns {used, total, renewDate} for the dashboard CreditMeter API.
 *
 * The credit ledger is the single source of truth (see plan: credit-system-rebuild).
 * `total` here is the user's available balance (active grants minus all-time debits).
 * `used` is informational — debits within the current period only.
 */
export async function getUserCredits(userId: string): Promise<{
  used: number;
  total: number;
  renewDate: Date;
}> {
  const balance = await computeUserBalance(userId, db);
  return {
    used: balance.used,
    total: balance.available + balance.used,
    renewDate: balance.renewDate,
  };
}

export async function getUserCreditsDetailed(userId: string): Promise<BalanceBreakdown> {
  return computeUserBalance(userId, db);
}
