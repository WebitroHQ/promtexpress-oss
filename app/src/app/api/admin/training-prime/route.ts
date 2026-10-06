import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { runResourcePipeline } from "@/lib/training/orchestrator";

const BodySchema = z.object({
  resourceIds: z.array(z.string().min(1)).min(1).max(20),
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
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const results = [];
  for (const id of body.resourceIds) {
    try {
      const r = await runResourcePipeline(id);
      results.push({ id, ok: true, ...r });
    } catch (err) {
      results.push({ id, ok: false, error: (err as Error).message.slice(0, 300) });
    }
  }

  return NextResponse.json({ ok: true, results });
}

export const maxDuration = 600;
