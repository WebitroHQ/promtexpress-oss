import "server-only";
import { db } from "@/db/client";
import { getPaddle } from "./client";

/**
 * Find or create a Paddle customer for the given user.
 * Returns the Paddle customerId.
 *
 * Idempotent: existing PaddleCustomer rows are reused.
 */
export async function ensurePaddleCustomer(args: {
  userId: string;
  email: string;
  name?: string | null;
}): Promise<{ paddleCustomerId: string; created: boolean }> {
  const existing = await db.paddleCustomer.findUnique({
    where: { userId: args.userId },
    select: { paddleCustomerId: true },
  });

  if (existing) {
    return { paddleCustomerId: existing.paddleCustomerId, created: false };
  }

  const paddle = getPaddle();
  const customer = await paddle.customers.create({
    email: args.email,
    name: args.name ?? undefined,
  });

  await db.paddleCustomer.create({
    data: {
      userId: args.userId,
      paddleCustomerId: customer.id,
      email: args.email,
    },
  });

  return { paddleCustomerId: customer.id, created: true };
}
