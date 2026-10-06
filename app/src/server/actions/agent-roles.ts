"use server";

/**
 * Server actions for /pr/yonet/agent-roles
 *
 * Admin atar:
 *   - INTENT_ANALYZER → AiEngine X
 *   - SYNTHESIZER → AiEngine Y
 *   - SAFETY_CHECKER → AiEngine Z (opsiyonel)
 *   - EMBEDDER → AiEngine W
 *   - DISTILLER → AiEngine V
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { AgentRoleSlug } from "@prisma/client";
import { invalidateRoleBriefCache } from "@/lib/pipeline/v2/role-brief";
import { requireAdmin, writeAudit } from "@/lib/audit";
import { checkRoleTier } from "@/lib/engines/tier-policy";

const ROLE_SLUGS: AgentRoleSlug[] = [
  "INTENT_ANALYZER",
  "SYNTHESIZER",
  "SAFETY_CHECKER",
  "EMBEDDER",
  "DISTILLER",
];

export async function setAgentRoleEngine(input: {
  roleSlug: AgentRoleSlug;
  engineId: string | null;
  notes?: string | null;
}) {
  const user = await requireAdmin();
  const parsed = z
    .object({
      roleSlug: z.enum(ROLE_SLUGS as [AgentRoleSlug, ...AgentRoleSlug[]]),
      engineId: z.string().nullable(),
      notes: z.string().nullable().optional(),
    })
    .parse(input);

  // engineId varsa AiEngine'i doğrula
  if (parsed.engineId) {
    const e = await db.aiEngine.findUnique({
      where: { id: parsed.engineId },
      select: { id: true, name: true, isActive: true, encryptedKey: true, capabilityTier: true },
    });
    if (!e) throw new Error("AiEngine not found");
    if (!e.isActive) throw new Error("AiEngine is inactive");
    if (!e.encryptedKey) throw new Error("AiEngine has no API key configured");

    // FAZ C3 — tier guard
    const guard = checkRoleTier({
      roleSlug: parsed.roleSlug,
      engineTier: e.capabilityTier,
      engineName: e.name,
    });
    if (!guard.ok) {
      throw new Error(guard.reason ?? "Tier requirement not met");
    }
  }

  // RoleBrief var mı? AgentRoleAssignment'ın FK'si RoleBrief.roleSlug'a — assignment için brief gerekli.
  const brief = await db.roleBrief.findUnique({
    where: { roleSlug: parsed.roleSlug },
    select: { roleSlug: true },
  });
  if (!brief) {
    throw new Error(`RoleBrief seed missing for ${parsed.roleSlug}. Run prisma db seed first.`);
  }

  await db.agentRoleAssignment.upsert({
    where: { roleSlug: parsed.roleSlug },
    update: {
      engineId: parsed.engineId,
      notes: parsed.notes ?? null,
      updatedBy: user.id,
    },
    create: {
      roleSlug: parsed.roleSlug,
      engineId: parsed.engineId,
      notes: parsed.notes ?? null,
      isActive: true,
      updatedBy: user.id,
    },
  });

  await writeAudit({ actorId: user.id, action: "agentRole.setEngine", targetType: "agentRoleAssignment", targetId: parsed.roleSlug, meta: { engineId: parsed.engineId } });
  revalidatePath("/pr/yonet/agent-roles");
  return { ok: true };
}

export async function toggleAgentRoleActive(roleSlug: AgentRoleSlug, isActive: boolean) {
  const user = await requireAdmin();
  await db.agentRoleAssignment.upsert({
    where: { roleSlug },
    update: { isActive, updatedBy: user.id },
    create: { roleSlug, isActive, updatedBy: user.id },
  });
  await writeAudit({ actorId: user.id, action: "agentRole.toggleActive", targetType: "agentRoleAssignment", targetId: roleSlug, meta: { isActive } });
  revalidatePath("/pr/yonet/agent-roles");
  return { ok: true };
}

export async function updateRoleBriefSystemPrompt(input: {
  roleSlug: AgentRoleSlug;
  systemPrompt: string;
  version?: string;
  notes?: string | null;
}) {
  const user = await requireAdmin();
  const parsed = z
    .object({
      roleSlug: z.enum(ROLE_SLUGS as [AgentRoleSlug, ...AgentRoleSlug[]]),
      systemPrompt: z.string().min(50).max(20000),
      version: z.string().min(1).max(20).optional(),
      notes: z.string().nullable().optional(),
    })
    .parse(input);

  await db.roleBrief.update({
    where: { roleSlug: parsed.roleSlug },
    data: {
      systemPrompt: parsed.systemPrompt,
      ...(parsed.version ? { version: parsed.version } : {}),
      notes: parsed.notes ?? undefined,
      updatedBy: user.id,
    },
  });

  invalidateRoleBriefCache(parsed.roleSlug);
  await writeAudit({ actorId: user.id, action: "roleBrief.updateSystemPrompt", targetType: "roleBrief", targetId: parsed.roleSlug, meta: { version: parsed.version } });
  revalidatePath("/pr/yonet/agent-roles");
  return { ok: true };
}
