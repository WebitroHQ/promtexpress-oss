import "server-only";
import { db } from "@/db/client";
import { Prisma } from "@prisma/client";

const PADDLE_DASHBOARD_BASE =
  process.env.PADDLE_ENV === "production"
    ? "https://vendors.paddle.com"
    : "https://sandbox-vendors.paddle.com";

export function paddleDashboardUrl(kind: "transaction" | "customer", id: string): string {
  switch (kind) {
    case "transaction":
      return `${PADDLE_DASHBOARD_BASE}/transactions/${id}`;
    case "customer":
      return `${PADDLE_DASHBOARD_BASE}/customers/${id}`;
  }
}

// ─── Overview KPI ──────────────────────────────────────────

export async function getBillingOverview() {
  const since24h = new Date(Date.now() - 24 * 3600 * 1000);
  const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const [
    last24hTransactions,
    last24hRevenueCents,
    failedWebhooksLast24h,
    last30dTransactions,
    last30dRevenueCents,
    pendingWebhooks,
    recentTransactions,
  ] = await Promise.all([
    db.paddleTransaction.count({
      where: { createdAt: { gte: since24h }, status: "completed" },
    }),
    db.paddleTransaction.aggregate({
      where: { createdAt: { gte: since24h }, status: "completed" },
      _sum: { amount: true },
    }),
    db.webhookEvent.count({
      where: { receivedAt: { gte: since24h }, error: { not: null } },
    }),
    db.paddleTransaction.count({
      where: { createdAt: { gte: since30d }, status: "completed" },
    }),
    db.paddleTransaction.aggregate({
      where: { createdAt: { gte: since30d }, status: "completed" },
      _sum: { amount: true },
    }),
    db.webhookEvent.count({ where: { processedAt: null, error: null } }),
    db.paddleTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: { select: { email: true, name: true } },
      },
    }),
  ]);

  return {
    last24hTransactions,
    last24hRevenueUsd: Number(last24hRevenueCents._sum.amount ?? 0),
    failedWebhooksLast24h,
    last30dTransactions,
    last30dRevenueUsd: Number(last30dRevenueCents._sum.amount ?? 0),
    pendingWebhooks,
    recentTransactions: recentTransactions.map((t) => ({
      id: t.id,
      paddleTransactionId: t.paddleTransactionId,
      status: t.status,
      amount: Number(t.amount),
      currency: t.currency,
      type: t.type,
      createdAt: t.createdAt,
      userEmail: t.user?.email ?? null,
      userName: t.user?.name ?? null,
      userId: t.userId,
    })),
  };
}

// ─── Transactions list (paginated) ─────────────────────────

export type TransactionFilters = {
  page?: number;
  pageSize?: number;
  status?: string;
  userEmail?: string;
  from?: Date;
  to?: Date;
};

export async function listTransactions(filters: TransactionFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 25));

  const where: Prisma.PaddleTransactionWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.userEmail
      ? {
          user: {
            email: { contains: filters.userEmail, mode: "insensitive" },
          },
        }
      : {}),
    ...(filters.from || filters.to
      ? {
          createdAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.paddleTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    }),
    db.paddleTransaction.count({ where }),
  ]);

  return {
    rows: rows.map((t) => ({
      id: t.id,
      paddleTransactionId: t.paddleTransactionId,
      paddleCustomerId: t.paddleCustomerId,
      paddleSubscriptionId: t.paddleSubscriptionId,
      paddlePriceId: t.paddlePriceId,
      type: t.type,
      status: t.status,
      amount: Number(t.amount),
      currency: t.currency,
      createdAt: t.createdAt,
      processedAt: t.processedAt,
      userId: t.userId,
      userEmail: t.user?.email ?? null,
      userName: t.user?.name ?? null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getTransactionDetail(idOrPaddleId: string) {
  const tx = await db.paddleTransaction.findFirst({
    where: {
      OR: [{ id: idOrPaddleId }, { paddleTransactionId: idOrPaddleId }],
    },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });
  if (!tx) return null;

  const [packPurchases, ledgerEntries, webhookEvents] = await Promise.all([
    db.extraCreditPackPurchase.findMany({
      where: { paddleTransactionId: tx.paddleTransactionId },
      include: { pack: { select: { slug: true, name: true, credits: true } } },
    }),
    tx.userId
      ? db.creditLedger.findMany({
          where: {
            userId: tx.userId,
            meta: { path: ["paddleTransactionId"], equals: tx.paddleTransactionId },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
    db.webhookEvent.findMany({
      where: {
        OR: [
          { payload: { path: ["data", "id"], equals: tx.paddleTransactionId } },
          {
            payload: {
              path: ["data", "customer_id"],
              equals: tx.paddleCustomerId ?? "",
            },
          },
        ],
      },
      orderBy: { receivedAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    transaction: {
      id: tx.id,
      paddleTransactionId: tx.paddleTransactionId,
      paddleCustomerId: tx.paddleCustomerId,
      paddleSubscriptionId: tx.paddleSubscriptionId,
      paddlePriceId: tx.paddlePriceId,
      type: tx.type,
      status: tx.status,
      amount: Number(tx.amount),
      currency: tx.currency,
      createdAt: tx.createdAt,
      processedAt: tx.processedAt,
      items: tx.items,
      meta: tx.meta,
      userId: tx.userId,
      userEmail: tx.user?.email ?? null,
      userName: tx.user?.name ?? null,
    },
    packPurchases: packPurchases.map((p) => ({
      id: p.id,
      packSlug: p.pack.slug,
      packName: p.pack.name,
      packCredits: p.pack.credits,
      creditsGranted: p.creditsGranted,
      creditsUsed: p.creditsUsed,
      purchasedAt: p.purchasedAt,
      expiresAt: p.expiresAt,
      expiredAt: p.expiredAt,
    })),
    ledgerEntries: ledgerEntries.map((l) => ({
      id: l.id,
      delta: l.delta,
      reason: l.reason,
      createdAt: l.createdAt,
      meta: l.meta as Record<string, unknown> | null,
    })),
    webhookEvents: webhookEvents.map((e) => ({
      id: e.id,
      paddleEventId: e.paddleEventId,
      eventType: e.eventType,
      receivedAt: e.receivedAt,
      processedAt: e.processedAt,
      error: e.error,
    })),
  };
}

// ─── Webhook events list (paginated) ───────────────────────

export type WebhookFilters = {
  page?: number;
  pageSize?: number;
  eventType?: string;
  status?: "all" | "processed" | "failed" | "pending";
  from?: Date;
  to?: Date;
};

export async function listWebhookEvents(filters: WebhookFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 25));

  const where: Prisma.WebhookEventWhereInput = {
    ...(filters.eventType ? { eventType: { contains: filters.eventType } } : {}),
    ...(filters.status === "processed"
      ? { processedAt: { not: null }, error: null }
      : filters.status === "failed"
      ? { error: { not: null } }
      : filters.status === "pending"
      ? { processedAt: null, error: null }
      : {}),
    ...(filters.from || filters.to
      ? {
          receivedAt: {
            ...(filters.from ? { gte: filters.from } : {}),
            ...(filters.to ? { lte: filters.to } : {}),
          },
        }
      : {}),
  };

  const [rows, total, failedCount] = await Promise.all([
    db.webhookEvent.findMany({
      where,
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.webhookEvent.count({ where }),
    db.webhookEvent.count({
      where: {
        receivedAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) },
        error: { not: null },
      },
    }),
  ]);

  return {
    rows: rows.map((e) => ({
      id: e.id,
      paddleEventId: e.paddleEventId,
      eventType: e.eventType,
      receivedAt: e.receivedAt,
      processedAt: e.processedAt,
      error: e.error,
      latencyMs:
        e.processedAt && e.receivedAt
          ? e.processedAt.getTime() - e.receivedAt.getTime()
          : null,
    })),
    total,
    failedLast24h: failedCount,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getWebhookEventDetail(id: string) {
  const event = await db.webhookEvent.findUnique({ where: { id } });
  if (!event) return null;
  return {
    id: event.id,
    paddleEventId: event.paddleEventId,
    eventType: event.eventType,
    receivedAt: event.receivedAt,
    processedAt: event.processedAt,
    error: event.error,
    payload: event.payload as Record<string, unknown>,
    signature: event.signature,
  };
}

// ─── Pack purchases list (paginated) ───────────────────────

export type PackPurchaseFilters = {
  page?: number;
  pageSize?: number;
  packSlug?: string;
  userEmail?: string;
};

export async function listPackPurchases(filters: PackPurchaseFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, filters.pageSize ?? 25));

  const where: Prisma.ExtraCreditPackPurchaseWhereInput = {
    ...(filters.packSlug ? { pack: { slug: filters.packSlug } } : {}),
    ...(filters.userEmail
      ? {
          user: {
            email: { contains: filters.userEmail, mode: "insensitive" },
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.extraCreditPackPurchase.findMany({
      where,
      orderBy: { purchasedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        pack: { select: { slug: true, name: true, credits: true } },
        user: { select: { id: true, email: true, name: true } },
      },
    }),
    db.extraCreditPackPurchase.count({ where }),
  ]);

  return {
    rows: rows.map((p) => ({
      id: p.id,
      paddleTransactionId: p.paddleTransactionId,
      packSlug: p.pack.slug,
      packName: p.pack.name,
      packCredits: p.pack.credits,
      creditsGranted: p.creditsGranted,
      creditsUsed: p.creditsUsed,
      purchasedAt: p.purchasedAt,
      expiresAt: p.expiresAt,
      expiredAt: p.expiredAt,
      userId: p.userId,
      userEmail: p.user?.email ?? null,
      userName: p.user?.name ?? null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

// ─── Per-user billing ──────────────────────────────────────

export async function getUserBilling(userId: string) {
  const [user, paddleCustomer, transactions, packPurchases, recentLedger, subscription] =
    await Promise.all([
      db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, createdAt: true },
      }),
      db.paddleCustomer.findUnique({ where: { userId } }),
      db.paddleTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.extraCreditPackPurchase.findMany({
        where: { userId },
        orderBy: { purchasedAt: "desc" },
        take: 50,
        include: { pack: { select: { slug: true, name: true } } },
      }),
      db.creditLedger.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.subscription.findUnique({
        where: { userId },
        include: { plan: true },
      }),
    ]);

  if (!user) return null;

  return {
    user,
    paddleCustomer,
    subscription,
    transactions: transactions.map((t) => ({
      id: t.id,
      paddleTransactionId: t.paddleTransactionId,
      type: t.type,
      status: t.status,
      amount: Number(t.amount),
      currency: t.currency,
      createdAt: t.createdAt,
    })),
    packPurchases: packPurchases.map((p) => ({
      id: p.id,
      paddleTransactionId: p.paddleTransactionId,
      packSlug: p.pack.slug,
      packName: p.pack.name,
      creditsGranted: p.creditsGranted,
      creditsUsed: p.creditsUsed,
      purchasedAt: p.purchasedAt,
      expiresAt: p.expiresAt,
      expiredAt: p.expiredAt,
    })),
    recentLedger: recentLedger.map((l) => ({
      id: l.id,
      delta: l.delta,
      reason: l.reason,
      createdAt: l.createdAt,
      meta: l.meta as Record<string, unknown> | null,
    })),
  };
}
