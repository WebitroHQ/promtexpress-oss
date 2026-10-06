"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { db } from "@/db/client";
import { auth } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { AbuseType, Severity } from "@prisma/client";

const ReportSchema = z.object({
  targetType: z.enum(["prompt", "user", "template", "blog", "comment"]),
  targetId: z.string().trim().min(1).max(120),
  type: z.nativeEnum(AbuseType),
  description: z.string().trim().max(2000).optional().nullable().transform((v) => (v && v.length > 0 ? v : null)),
});

// Simple in-memory rate limit: IP → timestamps[] (last 24h)
const recentByIp = new Map<string, number[]>();
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const RATE_MAX = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const arr = (recentByIp.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (arr.length >= RATE_MAX) {
    recentByIp.set(ip, arr);
    return false;
  }
  arr.push(now);
  recentByIp.set(ip, arr);
  return true;
}

export type ReportAbuseResult =
  | { ok: true; id: string }
  | { ok: false; error: "rate_limited" | "invalid_input" | "internal" };

export async function reportAbuse(input: z.input<typeof ReportSchema>): Promise<ReportAbuseResult> {
  const parsed = ReportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  const ip = fwd ? fwd.split(",")[0]!.trim() : (h.get("x-real-ip") ?? "unknown");

  if (!checkRateLimit(ip)) {
    await writeAudit({
      actorId: null,
      action: "abuse.rateLimited",
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      meta: { ip },
    });
    return { ok: false, error: "rate_limited" };
  }

  // Optional auth: get reporterId if logged in
  let reporterId: string | null = null;
  try {
    const session = await auth();
    reporterId = session?.user?.id ?? null;
  } catch {
    reporterId = null;
  }

  try {
    const created = await db.abuseReport.create({
      data: {
        reporterId,
        type: parsed.data.type,
        severity: Severity.LOW,
        targetType: parsed.data.targetType,
        targetId: parsed.data.targetId,
        description: parsed.data.description,
      },
    });

    await writeAudit({
      actorId: reporterId,
      action: "abuse.userReport",
      targetType: "abuseReport",
      targetId: created.id,
      meta: {
        target: `${parsed.data.targetType}:${parsed.data.targetId}`,
        type: parsed.data.type,
        anonymous: !reporterId,
      },
    });

    return { ok: true, id: created.id };
  } catch (err) {
    console.error("[abuse-public] reportAbuse failed:", err);
    return { ok: false, error: "internal" };
  }
}
