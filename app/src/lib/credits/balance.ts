import { db } from "@/db/client";
import { CreditReason, type Prisma } from "@prisma/client";

export type CreditBucket =
  | "subscription"
  | "welcome"
  | "extraPack"
  | "bonus"
  | "admin"
  | "refund";

export type BalanceBreakdown = {
  available: number;
  total: number;
  used: number;
  byBucket: Record<CreditBucket, number>;
  renewDate: Date;
  pendingExpiries: Array<{ amount: number; expiresAt: Date; bucket: CreditBucket }>;
};

const DEBIT_REASONS: CreditReason[] = [
  CreditReason.PROMPT_GENERATION,
  CreditReason.API_USAGE,
  CreditReason.EXTRA_PACK_DEBIT,
];

const POSITIVE_GRANT_REASONS: CreditReason[] = [
  CreditReason.SUBSCRIPTION_GRANT,
  CreditReason.SUBSCRIPTION_RENEWAL,
  CreditReason.WELCOME_GRANT,
  CreditReason.EXTRA_PACK_PURCHASE,
  CreditReason.BONUS,
  CreditReason.ADMIN_ADJUSTMENT,
  CreditReason.REFUND,
];

function bucketForReason(reason: CreditReason): CreditBucket | null {
  switch (reason) {
    case CreditReason.SUBSCRIPTION_GRANT:
    case CreditReason.SUBSCRIPTION_RENEWAL:
      return "subscription";
    case CreditReason.WELCOME_GRANT:
      return "welcome";
    case CreditReason.EXTRA_PACK_PURCHASE:
      return "extraPack";
    case CreditReason.BONUS:
      return "bonus";
    case CreditReason.ADMIN_ADJUSTMENT:
      return "admin";
    case CreditReason.REFUND:
      return "refund";
    default:
      return null;
  }
}

type DbLike = typeof db | Prisma.TransactionClient;

export async function computeUserBalance(
  userId: string,
  client: DbLike = db,
): Promise<BalanceBreakdown> {
  const now = new Date();

  await reapExpiredGrants(userId, now, client);

  const sub = await client.subscription.findUnique({
    where: { userId },
    select: { plan: true, currentPeriodStart: true, currentPeriodEnd: true },
  });

  const periodStart = sub?.currentPeriodStart ?? startOfMonth(now);
  const periodEnd = sub?.currentPeriodEnd ?? nextMonthStart(now);

  // Free plan implicit grant: if the user has no Subscription, ensure a
  // SUBSCRIPTION_GRANT row exists for the current calendar month. Idempotent.
  if (!sub) {
    await ensureFreePlanGrant(userId, periodStart, periodEnd, client);
  }

  const activeGrants = await client.creditLedger.findMany({
    where: {
      userId,
      delta: { gt: 0 },
      consumed: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    select: { reason: true, delta: true, consumedAmount: true, expiresAt: true },
  });

  const byBucket: Record<CreditBucket, number> = {
    subscription: 0,
    welcome: 0,
    extraPack: 0,
    bonus: 0,
    admin: 0,
    refund: 0,
  };

  let available = 0;
  let total = 0;
  for (const g of activeGrants) {
    const remaining = Math.max(0, g.delta - g.consumedAmount);
    const bucket = bucketForReason(g.reason);
    if (bucket) byBucket[bucket] += remaining;
    available += remaining;
    total += g.delta;
  }

  const periodDebitsAggregate = await client.creditLedger.aggregate({
    _sum: { delta: true },
    where: {
      userId,
      reason: { in: DEBIT_REASONS },
      createdAt: { gte: periodStart },
    },
  });
  const used = Math.abs(periodDebitsAggregate._sum.delta ?? 0);

  const pendingExpiries: BalanceBreakdown["pendingExpiries"] = activeGrants
    .filter((g) => g.expiresAt !== null)
    .map((g) => ({
      amount: Math.max(0, g.delta - g.consumedAmount),
      expiresAt: g.expiresAt as Date,
      bucket: bucketForReason(g.reason) as CreditBucket,
    }))
    .filter((g) => g.amount > 0)
    .sort((a, b) => a.expiresAt.getTime() - b.expiresAt.getTime());

  return {
    available,
    total,
    used,
    byBucket,
    renewDate: periodEnd,
    pendingExpiries,
  };
}

async function ensureFreePlanGrant(
  userId: string,
  periodStart: Date,
  periodEnd: Date,
  client: DbLike,
): Promise<void> {
  const periodStartIso = periodStart.toISOString();
  const existing = await client.creditLedger.findFirst({
    where: {
      userId,
      reason: CreditReason.SUBSCRIPTION_GRANT,
      meta: { path: ["periodStart"], equals: periodStartIso },
      AND: [{ meta: { path: ["planSlug"], equals: "free" } }],
    },
    select: { id: true },
  });
  if (existing) return;

  const freePlan = await client.plan.findUnique({ where: { slug: "free" } });
  const monthlyCredits = freePlan?.monthlyCredits ?? 50;
  if (monthlyCredits <= 0) return;

  await client.creditLedger.create({
    data: {
      userId,
      delta: monthlyCredits,
      reason: CreditReason.SUBSCRIPTION_GRANT,
      expiresAt: periodEnd,
      meta: {
        planSlug: "free",
        periodStart: periodStartIso,
        periodEnd: periodEnd.toISOString(),
        source: "free-plan-implicit",
      },
    },
  });
}

export async function reapExpiredGrants(
  userId: string,
  now: Date = new Date(),
  client: DbLike = db,
): Promise<number> {
  const result = await client.creditLedger.updateMany({
    where: {
      userId,
      delta: { gt: 0 },
      consumed: false,
      expiresAt: { not: null, lt: now },
    },
    data: {
      consumed: true,
      consumedAt: now,
    },
  });
  return result.count;
}

export async function hasSufficientCredits(
  userId: string,
  cost: number,
  client: DbLike = db,
): Promise<{ ok: boolean; available: number; required: number }> {
  if (cost <= 0) return { ok: true, available: Number.MAX_SAFE_INTEGER, required: cost };
  const balance = await computeUserBalance(userId, client);
  return { ok: balance.available >= cost, available: balance.available, required: cost };
}

/**
 * Allocate `cost` credits across the user's active positive grants in FIFO
 * order (earliest expiry first; nulls last; tie-break by createdAt).
 *
 * - Increments each chosen grant's `consumedAmount`.
 * - For EXTRA_PACK_PURCHASE grants, also increments
 *   `ExtraCreditPackPurchase.creditsUsed`.
 * - Inserts a single debit row in CreditLedger with the negative delta and
 *   `meta.allocations = [{grantId, amount, reason}, ...]` for audit.
 *
 * Throws if the user does not have enough credits — caller must pre-check
 * via hasSufficientCredits / readCredits if it wants a different error type.
 *
 * MUST be called inside a Serializable transaction by the caller. The caller
 * passes its `tx` client.
 */
export async function debitCredits(args: {
  tx: Prisma.TransactionClient;
  userId: string;
  cost: number;
  reason: CreditReason;
  meta?: Prisma.InputJsonValue;
}): Promise<{ ledgerId: string; allocations: Array<{ grantId: string; amount: number; reason: CreditReason }> }> {
  const { tx, userId, cost, reason } = args;
  if (cost <= 0) {
    throw new Error("debitCredits: cost must be positive");
  }
  const now = new Date();

  await reapExpiredGrants(userId, now, tx);

  const grants = await tx.creditLedger.findMany({
    where: {
      userId,
      delta: { gt: 0 },
      consumed: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [
      { expiresAt: { sort: "asc", nulls: "last" } },
      { createdAt: "asc" },
    ],
    select: { id: true, delta: true, consumedAmount: true, reason: true, packPurchaseId: true },
  });

  let remaining = cost;
  const allocations: Array<{ grantId: string; amount: number; reason: CreditReason }> = [];
  for (const g of grants) {
    if (remaining <= 0) break;
    const grantRemaining = g.delta - g.consumedAmount;
    if (grantRemaining <= 0) continue;
    const take = Math.min(grantRemaining, remaining);

    await tx.creditLedger.update({
      where: { id: g.id },
      data: { consumedAmount: { increment: take } },
    });

    if (g.reason === CreditReason.EXTRA_PACK_PURCHASE && g.packPurchaseId) {
      await tx.extraCreditPackPurchase.update({
        where: { id: g.packPurchaseId },
        data: { creditsUsed: { increment: take } },
      });
    }

    allocations.push({ grantId: g.id, amount: take, reason: g.reason });
    remaining -= take;
  }

  if (remaining > 0) {
    throw new InsufficientFundsError(cost - remaining, cost);
  }

  const baseMeta: Record<string, unknown> = (args.meta as Record<string, unknown> | undefined) ?? {};
  const debit = await tx.creditLedger.create({
    data: {
      userId,
      delta: -cost,
      reason,
      meta: { ...baseMeta, allocations } as Prisma.InputJsonValue,
    },
  });

  return { ledgerId: debit.id, allocations };
}

export class InsufficientFundsError extends Error {
  constructor(public readonly available: number, public readonly required: number) {
    super(`Insufficient credits: ${required} required, ${available} available`);
    this.name = "InsufficientFundsError";
  }
}

function startOfMonth(d: Date): Date {
  const m = new Date(d);
  m.setDate(1);
  m.setHours(0, 0, 0, 0);
  return m;
}

function nextMonthStart(d: Date): Date {
  const m = startOfMonth(d);
  m.setMonth(m.getMonth() + 1);
  return m;
}

export const __testing = {
  bucketForReason,
  POSITIVE_GRANT_REASONS,
  DEBIT_REASONS,
};
