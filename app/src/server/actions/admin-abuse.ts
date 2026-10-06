"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { requireAdmin, writeAudit } from "@/lib/audit";
import { AbuseType, ReportStatus, Severity } from "@prisma/client";

const ReportSchema = z.object({
  reporterId: z.string().nullable().optional(),
  type: z.nativeEnum(AbuseType),
  severity: z.nativeEnum(Severity).default(Severity.LOW),
  targetType: z.string().trim().min(1).max(40),
  targetId: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).optional().nullable().transform((v) => (v && v.length > 0 ? v : null)),
});

export async function createAbuseReport(input: z.input<typeof ReportSchema>) {
  const admin = await requireAdmin();
  const parsed = ReportSchema.parse(input);
  const created = await db.abuseReport.create({ data: parsed });
  await writeAudit({ actorId: admin.id, action: "abuse.create", targetType: "abuseReport", targetId: created.id, meta: { type: parsed.type, severity: parsed.severity, target: `${parsed.targetType}:${parsed.targetId}` } });
  revalidatePath("/pr/yonet/abuse");
  return { ok: true, id: created.id };
}

export async function updateAbuseReportStatus(id: string, status: ReportStatus) {
  const admin = await requireAdmin();
  await db.abuseReport.update({
    where: { id },
    data: {
      status,
      ...(status === ReportStatus.RESOLVED || status === ReportStatus.DISMISSED
        ? { resolvedBy: admin.email, resolvedAt: new Date() }
        : { resolvedBy: null, resolvedAt: null }),
    },
  });
  await writeAudit({ actorId: admin.id, action: "abuse.setStatus", targetType: "abuseReport", targetId: id, meta: { status } });
  revalidatePath("/pr/yonet/abuse");
  return { ok: true };
}

export async function deleteAbuseReport(id: string) {
  const admin = await requireAdmin();
  await db.abuseReport.delete({ where: { id } });
  await writeAudit({ actorId: admin.id, action: "abuse.delete", targetType: "abuseReport", targetId: id });
  revalidatePath("/pr/yonet/abuse");
  return { ok: true };
}
