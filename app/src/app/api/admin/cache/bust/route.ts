/**
 * POST /api/admin/cache/bust — admin-triggered in-memory cache invalidation.
 *
 * 2026-05-04 (FAZ A3+A4): pipeline cache layers (Constitution, ProviderProfile,
 * ExpertPersona, AntiPattern, SynthEngine, RoleBrief, ResolvedEngine) all run
 * in module-level Maps with 5-min TTL. After admin updates the underlying row
 * in /pr/yonet/* the panel calls this endpoint so the next request sees the
 * change without waiting for TTL.
 *
 * Body: { scope: "all" | "engine" | "rolebrief" | "context", id?: string }
 *   - scope=all       → clears every layer
 *   - scope=engine    → invalidateEngineCache(id?)            (id = AiEngine.id)
 *   - scope=rolebrief → invalidateRoleBriefCache(id?)         (id = AgentRoleSlug)
 *   - scope=context   → invalidateContextCache()              (Constitution + Persona + AntiPattern + ProviderProfile + SynthEngine)
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { AgentRoleSlug } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { invalidateEngineCache } from "@/lib/engines/registry";
import { invalidateRoleBriefCache } from "@/lib/pipeline/v2/role-brief";
import { invalidateContextCache } from "@/lib/pipeline/v2/3-context-assembly";
import { invalidatePipelineTimeoutsCache } from "@/lib/pipeline/v2/timeouts";

const BodySchema = z.object({
  scope: z.enum(["all", "engine", "rolebrief", "context"]),
  id: z.string().min(1).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
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

  const cleared: string[] = [];

  switch (body.scope) {
    case "all":
      invalidateEngineCache();
      invalidateRoleBriefCache();
      invalidateContextCache();
      invalidatePipelineTimeoutsCache();
      cleared.push("engine", "rolebrief", "context", "timeouts");
      break;
    case "engine":
      invalidateEngineCache(body.id);
      cleared.push(body.id ? `engine:${body.id}` : "engine:all");
      break;
    case "rolebrief": {
      const slug = body.id ? (body.id as AgentRoleSlug) : undefined;
      invalidateRoleBriefCache(slug);
      cleared.push(slug ? `rolebrief:${slug}` : "rolebrief:all");
      break;
    }
    case "context":
      invalidateContextCache();
      invalidatePipelineTimeoutsCache();
      cleared.push("context", "timeouts");
      break;
  }

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "cache.bust",
      meta: { scope: body.scope, id: body.id ?? null, cleared },
    },
  });

  return NextResponse.json({ ok: true, cleared });
}
