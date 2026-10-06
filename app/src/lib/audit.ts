import { headers } from "next/headers";
import { db } from "@/db/client";
import { auth } from "@/lib/auth";

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

export interface WriteAuditInput {
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  meta?: Json;
}

async function captureRequestContext(): Promise<{ ip: string | null; ua: string | null }> {
  try {
    const h = await headers();
    const fwd = h.get("x-forwarded-for");
    const ip = fwd ? fwd.split(",")[0]!.trim() : (h.get("x-real-ip") ?? null);
    const ua = h.get("user-agent") ?? null;
    return { ip, ua };
  } catch {
    return { ip: null, ua: null };
  }
}

export async function writeAudit(input: WriteAuditInput): Promise<void> {
  try {
    const { ip, ua } = await captureRequestContext();
    let actorId = input.actorId ?? null;
    if (actorId === undefined) {
      const session = await auth();
      actorId = session?.user?.id ?? null;
    }
    await db.auditLog.create({
      data: {
        actorId,
        action: input.action,
        targetType: input.targetType ?? null,
        targetId: input.targetId ?? null,
        meta: (input.meta as never) ?? undefined,
        ip,
        ua,
      },
    });
  } catch (err) {
    console.error("[audit] writeAudit failed:", err);
  }
}

export async function requireAdmin(): Promise<{ id: string; email: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return { id: session.user.id, email: session.user.email ?? "" };
}
