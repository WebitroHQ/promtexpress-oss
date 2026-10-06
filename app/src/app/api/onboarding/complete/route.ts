import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await db.user.update({
    where: { id: session.user.id },
    data: { onboardingCompletedAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
