import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getLiveStats } from "@/lib/admin/live-stats";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(await getLiveStats(), { headers: { "Cache-Control": "no-store" } });
}
