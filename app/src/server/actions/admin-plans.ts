"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { requireAdmin, writeAudit } from "@/lib/audit";

const PlanSchema = z.object({
  name: z.string().min(1).max(60),
  slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/, "Only lowercase, numbers and hyphens"),
  priceMonthly: z.coerce.number().min(0),
  priceYearly: z.coerce.number().min(0),
  monthlyCredits: z.coerce.number().int().min(0),
  isActive: z.boolean().default(true),
  featured: z.boolean().default(false),
  features: z.array(z.string()).default([]),
  sortOrder: z.coerce.number().int().default(0),
});

export async function createPlan(data: z.infer<typeof PlanSchema>) {
  const admin = await requireAdmin();
  const parsed = PlanSchema.parse(data);
  const created = await db.plan.create({
    data: {
      name: parsed.name,
      slug: parsed.slug,
      priceMonthly: parsed.priceMonthly,
      priceYearly: parsed.priceYearly,
      monthlyCredits: parsed.monthlyCredits,
      isActive: parsed.isActive,
      featured: parsed.featured,
      features: parsed.features,
      sortOrder: parsed.sortOrder,
    },
  });
  await writeAudit({ actorId: admin.id, action: "plan.create", targetType: "plan", targetId: created.id, meta: { name: parsed.name, slug: parsed.slug } });
  revalidatePath("/pr/yonet/plans");
  revalidatePath("/", "page");
}

export async function updatePlan(id: string, data: z.infer<typeof PlanSchema>) {
  const admin = await requireAdmin();
  const parsed = PlanSchema.parse(data);
  await db.plan.update({
    where: { id },
    data: {
      name: parsed.name,
      slug: parsed.slug,
      priceMonthly: parsed.priceMonthly,
      priceYearly: parsed.priceYearly,
      monthlyCredits: parsed.monthlyCredits,
      isActive: parsed.isActive,
      featured: parsed.featured,
      features: parsed.features,
      sortOrder: parsed.sortOrder,
    },
  });
  await writeAudit({ actorId: admin.id, action: "plan.update", targetType: "plan", targetId: id, meta: { name: parsed.name } });
  revalidatePath("/pr/yonet/plans");
  revalidatePath("/", "page");
}

/**
 * Planı sil veya devre dışı bırak.
 *
 * Aktif abone yoksa → fiziksel sil.
 * Aktif abone varsa → isActive=false yap (yeni satış durur),
 *   mevcut aboneler currentPeriodEnd'e kadar erişimini korur.
 *
 * Dönüş: { action: "deleted" | "deactivated", activeCount }
 */
export async function deletePlan(id: string): Promise<{ action: "deleted" | "deactivated"; activeCount: number }> {
  const admin = await requireAdmin();
  const activeCount = await db.subscription.count({
    where: { planId: id, status: { in: ["ACTIVE", "TRIALING"] } },
  });

  if (activeCount > 0) {
    await db.plan.update({ where: { id }, data: { isActive: false } });
    await writeAudit({ actorId: admin.id, action: "plan.deactivate", targetType: "plan", targetId: id, meta: { activeCount } });
    revalidatePath("/pr/yonet/plans");
    revalidatePath("/", "page");
    return { action: "deactivated", activeCount };
  }

  await db.plan.delete({ where: { id } });
  await writeAudit({ actorId: admin.id, action: "plan.delete", targetType: "plan", targetId: id });
  revalidatePath("/pr/yonet/plans");
  revalidatePath("/", "page");
  return { action: "deleted", activeCount: 0 };
}
