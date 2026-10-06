import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { writeAudit } from "@/lib/audit";
import { applyDistillation } from "@/lib/training/apply-service";
import { DistillationStatus } from "@prisma/client";

const BodySchema = z.object({
  // Belirli ID'leri onayla (boşsa filter kullanılır)
  distillationIds: z.array(z.string().min(1)).max(200).optional(),
  // Filtre: type bazlı toplu onay
  type: z.enum(["CONSTITUTION_UPDATE", "PERSONA_UPDATE", "ANTIPATTERN", "EXEMPLAR"]).optional(),
  // Filtre: en fazla N PENDING'i işle
  limit: z.number().int().positive().max(200).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json().catch(() => ({})));
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Hedef ID listesi
  let ids: string[];
  if (body.distillationIds && body.distillationIds.length > 0) {
    ids = body.distillationIds;
  } else {
    const rows = await db.trainingDistillation.findMany({
      where: {
        status: DistillationStatus.PENDING,
        ...(body.type ? { type: body.type } : {}),
      },
      select: { id: true },
      orderBy: { createdAt: "asc" },
      take: body.limit ?? 50,
    });
    ids = rows.map((r) => r.id);
  }

  // Admin user.id (audit için)
  const admin = await db.user.findUnique({ where: { email: session.user.email }, select: { id: true } });
  if (!admin) return NextResponse.json({ error: "Admin user not found" }, { status: 500 });

  const results: Array<{
    id: string;
    type?: string;
    ok: boolean;
    appliedToId?: string;
    targetTable?: string;
    error?: string;
  }> = [];

  for (const id of ids) {
    try {
      // 1) APPROVED işaretle
      const updated = await db.trainingDistillation.update({
        where: { id },
        data: {
          status: DistillationStatus.APPROVED,
          reviewedBy: session.user.email,
          reviewedAt: new Date(),
          reviewNotes: "batch-approve via /api/admin/training-approve-batch",
        },
        select: { type: true },
      });
      // 2) Inline apply
      const apply = await applyDistillation(id, admin.id);
      if (apply.ok) {
        results.push({
          id,
          type: updated.type,
          ok: true,
          appliedToId: apply.appliedToId,
          targetTable: apply.targetTable,
        });
        await writeAudit({
          actorId: admin.id,
          action: "training.batchApprove.applied",
          targetType: "trainingDistillation",
          targetId: id,
          meta: { type: updated.type, appliedToId: apply.appliedToId },
        });
      } else {
        results.push({ id, type: updated.type, ok: false, error: apply.error });
        await writeAudit({
          actorId: admin.id,
          action: "training.batchApprove.applyFailed",
          targetType: "trainingDistillation",
          targetId: id,
          meta: { error: apply.error },
        });
      }
    } catch (err) {
      results.push({ id, ok: false, error: (err as Error).message.slice(0, 300) });
    }
  }

  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  const byType = results.reduce<Record<string, { ok: number; failed: number }>>((acc, r) => {
    const k = r.type ?? "unknown";
    acc[k] ??= { ok: 0, failed: 0 };
    if (r.ok) acc[k].ok++;
    else acc[k].failed++;
    return acc;
  }, {});

  return NextResponse.json({
    ok: true,
    total: ids.length,
    approved: ok,
    failed,
    byType,
    results,
  });
}

export const maxDuration = 600;
