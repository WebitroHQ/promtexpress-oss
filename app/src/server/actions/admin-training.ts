"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { requireAdmin, writeAudit } from "@/lib/audit";
import {
  ResourceType,
  ResourceRefresh,
  ResourceStatus,
  DistillationStatus,
} from "@prisma/client";
import { applyDistillation } from "@/lib/training/apply-service";
import { runResourcePipeline } from "@/lib/training/orchestrator";

const ResourceSchema = z.object({
  type: z.nativeEnum(ResourceType),
  url: z.string().url().nullable().optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable().transform((v) => (v && v.length > 0 ? v : null)),
  targetPersonaSlugs: z.array(z.string().trim()).default([]),
  targetTags: z.array(z.string().trim()).default([]),
  refreshPolicy: z.nativeEnum(ResourceRefresh).default(ResourceRefresh.MANUAL),
});

export async function createTrainingResource(input: z.input<typeof ResourceSchema>) {
  const admin = await requireAdmin();
  const parsed = ResourceSchema.parse(input);
  const created = await db.trainingResource.create({
    data: {
      type: parsed.type,
      url: parsed.url ?? null,
      title: parsed.title,
      description: parsed.description,
      targetPersonaSlugs: parsed.targetPersonaSlugs,
      targetTags: parsed.targetTags,
      refreshPolicy: parsed.refreshPolicy,
      status: ResourceStatus.ACTIVE,
      createdBy: admin.id,
    },
  });
  await writeAudit({ actorId: admin.id, action: "training.createResource", targetType: "trainingResource", targetId: created.id, meta: { type: parsed.type, title: parsed.title } });
  revalidatePath("/pr/yonet/training/resources");
  return { ok: true, id: created.id };
}

export async function updateTrainingResource(id: string, input: z.input<typeof ResourceSchema>) {
  const admin = await requireAdmin();
  const parsed = ResourceSchema.parse(input);
  await db.trainingResource.update({
    where: { id },
    data: {
      type: parsed.type,
      url: parsed.url ?? null,
      title: parsed.title,
      description: parsed.description,
      targetPersonaSlugs: parsed.targetPersonaSlugs,
      targetTags: parsed.targetTags,
      refreshPolicy: parsed.refreshPolicy,
    },
  });
  await writeAudit({ actorId: admin.id, action: "training.updateResource", targetType: "trainingResource", targetId: id });
  revalidatePath("/pr/yonet/training/resources");
  return { ok: true };
}

export async function setTrainingResourceStatus(id: string, status: ResourceStatus) {
  const admin = await requireAdmin();
  await db.trainingResource.update({ where: { id }, data: { status } });
  await writeAudit({ actorId: admin.id, action: "training.setResourceStatus", targetType: "trainingResource", targetId: id, meta: { status } });
  revalidatePath("/pr/yonet/training/resources");
  return { ok: true };
}

export async function deleteTrainingResource(id: string) {
  const admin = await requireAdmin();
  await db.trainingResource.delete({ where: { id } });
  await writeAudit({ actorId: admin.id, action: "training.deleteResource", targetType: "trainingResource", targetId: id });
  revalidatePath("/pr/yonet/training/resources");
  return { ok: true };
}

export async function approveDistillation(id: string, notes?: string) {
  const admin = await requireAdmin();

  // 1. Mark APPROVED
  await db.trainingDistillation.update({
    where: { id },
    data: {
      status: DistillationStatus.APPROVED,
      reviewedBy: admin.email,
      reviewedAt: new Date(),
      reviewNotes: notes ?? null,
    },
  });
  await writeAudit({ actorId: admin.id, action: "training.approveDistillation", targetType: "trainingDistillation", targetId: id });

  // 2. Inline apply
  const applyResult = await applyDistillation(id, admin.id);
  if (!applyResult.ok) {
    await writeAudit({
      actorId: admin.id,
      action: "training.applyDistillation.failed",
      targetType: "trainingDistillation",
      targetId: id,
      meta: { error: applyResult.error },
    });
    revalidatePath("/pr/yonet/training/distillations");
    return { ok: false, status: "APPROVED", error: applyResult.error };
  }

  revalidatePath("/pr/yonet/training/distillations");
  return { ok: true, status: "APPLIED", appliedToId: applyResult.appliedToId };
}

export async function fetchResourceNow(resourceId: string) {
  const admin = await requireAdmin();
  const result = await runResourcePipeline(resourceId);
  await writeAudit({
    actorId: admin.id,
    action: "training.fetchNow",
    targetType: "trainingResource",
    targetId: resourceId,
    meta: { result },
  });
  revalidatePath("/pr/yonet/training/resources");
  revalidatePath("/pr/yonet/training/distillations");
  return result;
}

export async function rejectDistillation(id: string, notes: string) {
  const admin = await requireAdmin();
  await db.trainingDistillation.update({
    where: { id },
    data: {
      status: DistillationStatus.REJECTED,
      reviewedBy: admin.email,
      reviewedAt: new Date(),
      reviewNotes: notes,
    },
  });
  await writeAudit({ actorId: admin.id, action: "training.rejectDistillation", targetType: "trainingDistillation", targetId: id, meta: { notes } });
  revalidatePath("/pr/yonet/training/distillations");
  return { ok: true };
}
