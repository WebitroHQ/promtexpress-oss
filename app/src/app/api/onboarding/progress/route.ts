import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { stepIndex?: number } | null;
  const stepIndex = Math.max(0, Math.min(50, Math.floor(Number(body?.stepIndex ?? 0))));
  await db.user.update({
    where: { id: session.user.id },
    data: { onboardingStepIndex: stepIndex },
  });
  return NextResponse.json({ ok: true, stepIndex });
}
