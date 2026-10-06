"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { ensurePaddleCustomer } from "@/lib/paddle/customer";

export type OpenCheckoutResult =
  | {
      ok: true;
      priceId: string;
      quantity: number;
      customer: { id: string; email: string };
      customData: { userId: string; kind: "subscription" | "extra_pack" };
    }
  | { ok: false; error: "auth_required" | "invalid_price" | "internal" };

/**
 * Validates a price id, ensures a PaddleCustomer for the logged-in user,
 * and returns the payload that the client must feed to `paddle.Checkout.open()`.
 *
 * Anonymous users get `auth_required` — the caller is expected to redirect to
 * /auth/signup with `?intent=buy&plan=&cycle=` so the auto-open flow on /pricing
 * can resume after authentication.
 */
export async function openCheckoutData(input: {
  priceId: string;
  quantity?: number;
  kind: "subscription" | "extra_pack";
}): Promise<OpenCheckoutResult> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return { ok: false, error: "auth_required" };
  }

  const planMatch = await db.plan.findFirst({
    where: {
      OR: [
        { paddlePriceIdMonthly: input.priceId },
        { paddlePriceIdYearly: input.priceId },
      ],
      isActive: true,
    },
    select: { id: true },
  });
  const packMatch = !planMatch
    ? await db.extraCreditPack.findFirst({
        where: { paddlePriceId: input.priceId, isActive: true },
        select: { id: true },
      })
    : null;

  if (!planMatch && !packMatch) {
    return { ok: false, error: "invalid_price" };
  }

  try {
    const { paddleCustomerId } = await ensurePaddleCustomer({
      userId: session.user.id,
      email: session.user.email,
      name: session.user.name ?? null,
    });

    return {
      ok: true,
      priceId: input.priceId,
      quantity: Math.max(1, input.quantity ?? 1),
      customer: { id: paddleCustomerId, email: session.user.email },
      customData: { userId: session.user.id, kind: input.kind },
    };
  } catch (err) {
    console.error("[openCheckoutData] ensurePaddleCustomer failed", err);
    return { ok: false, error: "internal" };
  }
}

/**
 * Returns the context Paddle.js needs to open a checkout overlay
 * with the user's account pre-attached.
 *
 * If the user has no PaddleCustomer record yet, one is created on-demand.
 * Returns null if the user is not logged in.
 */
export async function getCheckoutContext(): Promise<{
  customerId: string;
  email: string;
  userId: string;
} | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) return null;

  const { paddleCustomerId } = await ensurePaddleCustomer({
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
  });

  return {
    customerId: paddleCustomerId,
    email: session.user.email,
    userId: session.user.id,
  };
}

/**
 * Look up the Paddle price ID for a given plan slug + billing cycle.
 * Returns null if the plan or its Paddle mapping is missing.
 */
export async function getPlanPriceId(
  slug: string,
  cycle: "monthly" | "yearly",
): Promise<string | null> {
  const plan = await db.plan.findUnique({
    where: { slug },
    select: { paddlePriceIdMonthly: true, paddlePriceIdYearly: true, isActive: true },
  });
  if (!plan || !plan.isActive) return null;
  return cycle === "yearly" ? plan.paddlePriceIdYearly : plan.paddlePriceIdMonthly;
}

/**
 * Look up the Paddle price ID for an extra credit pack.
 */
export async function getExtraPackPriceId(slug: string): Promise<string | null> {
  const pack = await db.extraCreditPack.findUnique({
    where: { slug },
    select: { paddlePriceId: true, isActive: true },
  });
  if (!pack || !pack.isActive) return null;
  return pack.paddlePriceId;
}
