"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { requireAdmin, writeAudit } from "@/lib/audit";

const SuspendSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().trim().min(1).max(500),
});

export async function suspendUser(input: z.infer<typeof SuspendSchema>) {
  const admin = await requireAdmin();
  const parsed = SuspendSchema.parse(input);

  await db.user.update({
    where: { id: parsed.userId },
    data: { suspendedAt: new Date(), suspendReason: parsed.reason },
  });
  // Optional: invalidate sessions
  await db.session.deleteMany({ where: { userId: parsed.userId } });

  await writeAudit({ actorId: admin.id, action: "user.suspend", targetType: "user", targetId: parsed.userId, meta: { reason: parsed.reason } });
  revalidatePath("/pr/yonet/users");
  return { ok: true };
}

export async function unsuspendUser(userId: string) {
  const admin = await requireAdmin();
  await db.user.update({
    where: { id: userId },
    data: { suspendedAt: null, suspendReason: null },
  });
  await writeAudit({ actorId: admin.id, action: "user.unsuspend", targetType: "user", targetId: userId });
  revalidatePath("/pr/yonet/users");
  return { ok: true };
}

const ChangePlanSchema = z.object({
  userId: z.string().min(1),
  planId: z.string().min(1),
});

export async function changeUserPlan(input: z.infer<typeof ChangePlanSchema>) {
  const admin = await requireAdmin();
  const parsed = ChangePlanSchema.parse(input);

  const plan = await db.plan.findUnique({ where: { id: parsed.planId } });
  if (!plan) throw new Error("Plan not found");

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await db.subscription.upsert({
    where: { userId: parsed.userId },
    create: {
      userId: parsed.userId,
      planId: parsed.planId,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
    update: {
      planId: parsed.planId,
      status: "ACTIVE",
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    },
  });

  await writeAudit({ actorId: admin.id, action: "user.changePlan", targetType: "user", targetId: parsed.userId, meta: { planId: parsed.planId, planName: plan.name } });
  revalidatePath("/pr/yonet/users");
  return { ok: true };
}

const InviteSchema = z.object({
  email: z.string().email().toLowerCase(),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
});

export async function inviteUser(input: z.infer<typeof InviteSchema>) {
  const admin = await requireAdmin();
  const parsed = InviteSchema.parse(input);

  const existing = await db.user.findUnique({ where: { email: parsed.email } });
  if (existing) throw new Error("User with this email already exists");

  const user = await db.user.create({
    data: { email: parsed.email, role: parsed.role, locale: "en" },
  });

  await writeAudit({ actorId: admin.id, action: "user.invite", targetType: "user", targetId: user.id, meta: { email: parsed.email, role: parsed.role } });
  revalidatePath("/pr/yonet/users");
  return { ok: true, userId: user.id };
}

export async function deleteUser(userId: string) {
  const admin = await requireAdmin();
  if (admin.id === userId) throw new Error("Cannot delete your own account");
  await db.user.delete({ where: { id: userId } });
  await writeAudit({ actorId: admin.id, action: "user.delete", targetType: "user", targetId: userId });
  revalidatePath("/pr/yonet/users");
  return { ok: true };
}
