import "server-only";
import { EventEntity } from "@paddle/paddle-node-sdk";
import { db } from "@/db/client";
import {
  Prisma,
  CreditReason,
  SubscriptionStatus,
  BillingCycle,
} from "@prisma/client";

/**
 * PaddleHandlerError — thrown by handlers when they cannot complete the
 * intended state change (missing Plan mapping, missing PaddleCustomer, etc.).
 *
 * The webhook route catches this, records it on WebhookEvent.error, and
 * returns 500 so Paddle retries. Once the underlying issue is resolved
 * (e.g. admin populates a missing paddlePriceId), the next retry succeeds
 * — no manual reconciliation needed.
 *
 * IMPORTANT: never silently `return` from a handler when state is invalid;
 * silent returns let Paddle mark the event as delivered while credits are
 * never granted. That class of bug was the root cause of the 2026-05-06
 * sandbox→prod test purchase incident.
 */
export class PaddleHandlerError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly retryable: boolean = true,
  ) {
    super(message);
    this.name = "PaddleHandlerError";
  }
}

/**
 * Dispatcher for Paddle webhook events.
 *
 * Credit grants happen here:
 *   - subscription.activated / subscription.created → grant first-period credits
 *   - subscription.updated with new periodStart → expire prior period, grant new
 *   - transaction.completed (one-time purchase, ExtraCreditPack) → grant pack credits
 *   - adjustment.created (refund) → record only; credit reversal is admin-driven
 */
export async function dispatchPaddleEvent(event: EventEntity): Promise<void> {
  switch (event.eventType) {
    case "subscription.created":
    case "subscription.activated":
      return handleSubscriptionCreated(event as unknown as SubscriptionEvent);

    case "subscription.updated":
      return handleSubscriptionUpdated(event as unknown as SubscriptionEvent);

    case "subscription.canceled":
      return handleSubscriptionCanceled(event as unknown as SubscriptionEvent);

    case "subscription.paused":
      return handleSubscriptionPaused(event as unknown as SubscriptionEvent);

    case "subscription.resumed":
      return handleSubscriptionResumed(event as unknown as SubscriptionEvent);

    case "subscription.past_due":
      return handleSubscriptionPastDue(event as unknown as SubscriptionEvent);

    case "transaction.completed":
      return handleTransactionCompleted(event as unknown as TransactionEvent);

    case "transaction.payment_failed":
      return handleTransactionFailed(event as unknown as TransactionEvent);

    case "adjustment.created":
      return handleAdjustmentCreated(event as unknown as AdjustmentEvent);

    case "customer.created":
      return handleCustomerCreated(event as unknown as CustomerEvent);

    default:
      console.log(`[paddle-handlers] no handler for ${event.eventType}, skipping`);
      return;
  }
}

// ──────────────────────────────────────────────────────
// Subscription handlers
// ──────────────────────────────────────────────────────

async function handleSubscriptionCreated(event: SubscriptionEvent): Promise<void> {
  const sub = event.data;
  const item = sub.items?.[0];
  if (!item?.price?.id) {
    throw new PaddleHandlerError(
      "missing_price_id",
      `subscription.created without price id (sub=${sub.id})`,
      false,
    );
  }

  const plan = await db.plan.findFirst({
    where: {
      OR: [
        { paddlePriceIdMonthly: item.price.id },
        { paddlePriceIdYearly: item.price.id },
      ],
    },
  });
  if (!plan) {
    throw new PaddleHandlerError(
      "plan_not_mapped",
      `no Plan mapped to paddle price ${item.price.id} — admin must populate Plan.paddlePriceIdMonthly/Yearly in /pr/yonet`,
    );
  }

  const billingCycle: BillingCycle =
    plan.paddlePriceIdYearly === item.price.id ? "YEARLY" : "MONTHLY";

  const paddleCustomer = await db.paddleCustomer.findUnique({
    where: { paddleCustomerId: sub.customerId },
    select: { userId: true },
  });
  if (!paddleCustomer) {
    throw new PaddleHandlerError(
      "paddle_customer_not_linked",
      `no PaddleCustomer row for ${sub.customerId} — customer.created event may arrive later`,
    );
  }

  const periodStart = sub.currentBillingPeriod?.startsAt
    ? new Date(sub.currentBillingPeriod.startsAt)
    : new Date();
  const periodEnd = sub.currentBillingPeriod?.endsAt
    ? new Date(sub.currentBillingPeriod.endsAt)
    : new Date(Date.now() + 30 * 24 * 3600 * 1000);
  const seatCount = item.quantity ?? 1;

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.subscription.upsert({
      where: { userId: paddleCustomer.userId },
      update: {
        planId: plan.id,
        status: mapSubStatus(sub.status),
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: !!sub.scheduledChange,
        paddleSubscriptionId: sub.id,
        paddleCustomerId: sub.customerId,
        paddlePriceId: item.price!.id,
        billingCycle,
        seatCount,
        pausedAt: null,
        resumesAt: null,
      },
      create: {
        userId: paddleCustomer.userId,
        planId: plan.id,
        status: mapSubStatus(sub.status),
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        paddleSubscriptionId: sub.id,
        paddleCustomerId: sub.customerId,
        paddlePriceId: item.price!.id,
        billingCycle,
        seatCount,
      },
    });

    await grantSubscriptionPeriod({
      tx,
      userId: paddleCustomer.userId,
      planId: plan.id,
      planSlug: plan.slug,
      monthlyCredits: plan.monthlyCredits,
      seatCount,
      paddleSubscriptionId: sub.id,
      paddleEventId: event.eventId ?? null,
      billingCycle,
      periodStart,
      periodEnd,
    });
  });
}

async function handleSubscriptionUpdated(event: SubscriptionEvent): Promise<void> {
  const sub = event.data;
  const subscription = await db.subscription.findUnique({
    where: { paddleSubscriptionId: sub.id },
    include: { plan: true },
  });
  if (!subscription) return;

  const item = sub.items?.[0];
  const periodStart = sub.currentBillingPeriod?.startsAt
    ? new Date(sub.currentBillingPeriod.startsAt)
    : subscription.currentPeriodStart;
  const periodEnd = sub.currentBillingPeriod?.endsAt
    ? new Date(sub.currentBillingPeriod.endsAt)
    : subscription.currentPeriodEnd;
  const seatCount = item?.quantity ?? subscription.seatCount;

  const periodChanged =
    periodStart.getTime() !== subscription.currentPeriodStart.getTime();

  await db.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        status: mapSubStatus(sub.status),
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: !!sub.scheduledChange,
        seatCount,
      },
    });

    if (periodChanged) {
      await expirePriorSubscriptionGrants(tx, subscription.userId, periodStart);
      await grantSubscriptionPeriod({
        tx,
        userId: subscription.userId,
        planId: subscription.planId,
        planSlug: subscription.plan.slug,
        monthlyCredits: subscription.plan.monthlyCredits,
        seatCount,
        paddleSubscriptionId: sub.id,
        paddleEventId: event.eventId ?? null,
        billingCycle: subscription.billingCycle,
        periodStart,
        periodEnd,
      });
    }
  });
}

async function handleSubscriptionCanceled(event: SubscriptionEvent): Promise<void> {
  const sub = event.data;
  await db.subscription.updateMany({
    where: { paddleSubscriptionId: sub.id },
    data: {
      status: SubscriptionStatus.CANCELED,
      cancelAtPeriodEnd: false,
    },
  });
}

async function handleSubscriptionPaused(event: SubscriptionEvent): Promise<void> {
  const sub = event.data;
  await db.subscription.updateMany({
    where: { paddleSubscriptionId: sub.id },
    data: {
      status: SubscriptionStatus.PAUSED,
      pausedAt: new Date(),
      resumesAt: sub.scheduledChange?.effectiveAt
        ? new Date(sub.scheduledChange.effectiveAt)
        : null,
    },
  });
}

async function handleSubscriptionResumed(event: SubscriptionEvent): Promise<void> {
  const sub = event.data;
  await db.subscription.updateMany({
    where: { paddleSubscriptionId: sub.id },
    data: {
      status: SubscriptionStatus.ACTIVE,
      pausedAt: null,
      resumesAt: null,
    },
  });
}

async function handleSubscriptionPastDue(event: SubscriptionEvent): Promise<void> {
  const sub = event.data;
  await db.subscription.updateMany({
    where: { paddleSubscriptionId: sub.id },
    data: { status: SubscriptionStatus.PAST_DUE },
  });
}

// ──────────────────────────────────────────────────────
// Transaction handlers
// ──────────────────────────────────────────────────────

async function handleTransactionCompleted(event: TransactionEvent): Promise<void> {
  const tx = event.data;
  const customer = tx.customerId
    ? await db.paddleCustomer.findUnique({
        where: { paddleCustomerId: tx.customerId },
        select: { userId: true },
      })
    : null;

  await db.paddleTransaction.upsert({
    where: { paddleTransactionId: tx.id },
    update: {
      status: tx.status,
      processedAt: new Date(),
    },
    create: {
      paddleTransactionId: tx.id,
      userId: customer?.userId ?? null,
      paddleCustomerId: tx.customerId ?? null,
      paddleSubscriptionId: tx.subscriptionId ?? null,
      paddlePriceId: tx.items?.[0]?.price?.id ?? null,
      type: tx.subscriptionId ? "subscription" : "purchase",
      status: tx.status,
      amount: new Prisma.Decimal(tx.details?.totals?.total ?? "0").div(100),
      currency: tx.currencyCode ?? "USD",
      items: tx.items as unknown as Prisma.InputJsonValue,
      meta: tx.customData
        ? ({ customData: tx.customData } as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      processedAt: new Date(),
    },
  });

  if (!customer) {
    if (tx.customerId) {
      throw new PaddleHandlerError(
        "paddle_customer_not_linked",
        `transaction.completed for ${tx.id} but no PaddleCustomer for ${tx.customerId} — customer.created event may arrive later`,
      );
    }
    return;
  }

  // Subscription renewal payments are handled via subscription.updated (period change).
  // First-period payment is handled via subscription.created. We don't grant here for subs.

  // Extra pack one-time purchase
  if (!tx.subscriptionId && tx.items) {
    for (const item of tx.items) {
      const priceId = item.price?.id;
      if (!priceId) continue;
      const pack = await db.extraCreditPack.findFirst({
        where: { paddlePriceId: priceId, isActive: true },
      });
      if (!pack) continue;

      const purchasedAt = new Date();
      const expiresAt = new Date(
        purchasedAt.getTime() + pack.validityDays * 24 * 3600 * 1000,
      );
      const quantity = item.quantity ?? 1;
      const creditsGranted = pack.credits * quantity;

      await db.$transaction(async (txdb: Prisma.TransactionClient) => {
        const existing = await txdb.extraCreditPackPurchase.findFirst({
          where: { paddleTransactionId: tx.id, packId: pack.id },
          select: { id: true },
        });
        if (existing) return;

        const purchase = await txdb.extraCreditPackPurchase.create({
          data: {
            userId: customer.userId,
            packId: pack.id,
            paddleTransactionId: tx.id,
            creditsGranted,
            purchasedAt,
            expiresAt,
          },
        });

        await txdb.creditLedger.create({
          data: {
            userId: customer.userId,
            delta: creditsGranted,
            reason: CreditReason.EXTRA_PACK_PURCHASE,
            expiresAt,
            packPurchaseId: purchase.id,
            meta: {
              packSlug: pack.slug,
              paddleTransactionId: tx.id,
              expiresAt: expiresAt.toISOString(),
            },
          },
        });
      });
    }
  }
}

async function handleTransactionFailed(event: TransactionEvent): Promise<void> {
  const tx = event.data;
  await db.paddleTransaction.upsert({
    where: { paddleTransactionId: tx.id },
    update: { status: tx.status },
    create: {
      paddleTransactionId: tx.id,
      paddleCustomerId: tx.customerId ?? null,
      paddleSubscriptionId: tx.subscriptionId ?? null,
      type: tx.subscriptionId ? "subscription" : "purchase",
      status: tx.status,
      amount: new Prisma.Decimal(tx.details?.totals?.total ?? "0").div(100),
      currency: tx.currencyCode ?? "USD",
      items: tx.items as unknown as Prisma.InputJsonValue,
      meta: { failure: true },
    },
  });
}

// ──────────────────────────────────────────────────────
// Adjustment (refund / chargeback) handler
// ──────────────────────────────────────────────────────

async function handleAdjustmentCreated(event: AdjustmentEvent): Promise<void> {
  const adj = event.data;
  console.log(`[paddle] adjustment ${adj.id} action=${adj.action} reason=${adj.reason}`);
}

// ──────────────────────────────────────────────────────
// Customer handler
// ──────────────────────────────────────────────────────

async function handleCustomerCreated(event: CustomerEvent): Promise<void> {
  const c = event.data;
  if (!c.email) return;
  const user = await db.user.findUnique({ where: { email: c.email } });
  if (!user) return;
  await db.paddleCustomer.upsert({
    where: { userId: user.id },
    update: {
      paddleCustomerId: c.id,
      email: c.email,
    },
    create: {
      userId: user.id,
      paddleCustomerId: c.id,
      email: c.email,
    },
  });
}

// ──────────────────────────────────────────────────────
// Helpers — credit grant / expiry
// ──────────────────────────────────────────────────────

async function grantSubscriptionPeriod(args: {
  tx: Prisma.TransactionClient;
  userId: string;
  planId: string;
  planSlug: string;
  monthlyCredits: number;
  seatCount: number;
  paddleSubscriptionId: string;
  paddleEventId: string | null;
  billingCycle: BillingCycle;
  periodStart: Date;
  periodEnd: Date;
}): Promise<void> {
  if (args.monthlyCredits <= 0) return;

  const periodStartIso = args.periodStart.toISOString();
  const existing = await args.tx.creditLedger.findFirst({
    where: {
      userId: args.userId,
      reason: { in: [CreditReason.SUBSCRIPTION_GRANT, CreditReason.SUBSCRIPTION_RENEWAL] },
      meta: {
        path: ["paddleSubscriptionId"],
        equals: args.paddleSubscriptionId,
      },
      AND: [
        {
          meta: {
            path: ["periodStart"],
            equals: periodStartIso,
          },
        },
      ],
    },
    select: { id: true },
  });
  if (existing) return;

  await args.tx.creditLedger.create({
    data: {
      userId: args.userId,
      delta: args.monthlyCredits * args.seatCount,
      reason: CreditReason.SUBSCRIPTION_GRANT,
      expiresAt: args.periodEnd,
      meta: {
        paddleSubscriptionId: args.paddleSubscriptionId,
        paddleEventId: args.paddleEventId,
        planSlug: args.planSlug,
        billingCycle: args.billingCycle,
        seatCount: args.seatCount,
        periodStart: periodStartIso,
        periodEnd: args.periodEnd.toISOString(),
      },
    },
  });
}

async function expirePriorSubscriptionGrants(
  tx: Prisma.TransactionClient,
  userId: string,
  newPeriodStart: Date,
): Promise<void> {
  const now = new Date();
  await tx.creditLedger.updateMany({
    where: {
      userId,
      reason: { in: [CreditReason.SUBSCRIPTION_GRANT, CreditReason.SUBSCRIPTION_RENEWAL] },
      consumed: false,
      OR: [
        { expiresAt: null },
        { expiresAt: { lte: newPeriodStart } },
      ],
    },
    data: {
      consumed: true,
      consumedAt: now,
    },
  });
}

function mapSubStatus(s: string): SubscriptionStatus {
  switch (s) {
    case "active":
      return SubscriptionStatus.ACTIVE;
    case "past_due":
      return SubscriptionStatus.PAST_DUE;
    case "canceled":
      return SubscriptionStatus.CANCELED;
    case "trialing":
      return SubscriptionStatus.TRIALING;
    case "paused":
      return SubscriptionStatus.PAUSED;
    default:
      return SubscriptionStatus.ACTIVE;
  }
}

// ──────────────────────────────────────────────────────
// Loose event types
// ──────────────────────────────────────────────────────

type SubscriptionEvent = {
  eventId?: string;
  eventType: string;
  data: {
    id: string;
    status: string;
    customerId: string;
    currentBillingPeriod?: { startsAt: string; endsAt: string } | null;
    scheduledChange?: { action: string; effectiveAt: string; resumeAt?: string } | null;
    items?: Array<{
      price?: { id: string };
      quantity?: number;
    }>;
  };
};

type TransactionEvent = {
  eventId?: string;
  eventType: string;
  data: {
    id: string;
    status: string;
    customerId?: string | null;
    subscriptionId?: string | null;
    currencyCode?: string;
    customData?: Record<string, unknown> | null;
    details?: { totals?: { total?: string } } | null;
    items?: Array<{
      price?: { id: string };
      quantity?: number;
    }>;
  };
};

type AdjustmentEvent = {
  eventId?: string;
  eventType: string;
  data: {
    id: string;
    action: string;
    reason: string;
  };
};

type CustomerEvent = {
  eventId?: string;
  eventType: string;
  data: {
    id: string;
    email?: string;
  };
};
