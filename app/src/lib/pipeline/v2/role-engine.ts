/**
 * Role → Engine resolver.
 *
 * Direktif #1: Hangi rolün hangi motoru kullanacağı sadece DB'den okunur.
 * Admin /pr/yonet/agent-roles sayfasından atar. Hardcode YASAK.
 *
 * 2026-05-04 (FAZ C2) — fallback chain support:
 *   resolveRoleEngineSet returns primary + ordered fallbackEngineIds list.
 *   Pipeline layers wrap their LLM call in runWithEngineFallback so 5xx/429/
 *   timeout escalates to the next engine in the chain.
 */
import { db } from "@/db/client";
import { AgentRoleSlug } from "@prisma/client";
import { PipelineError } from "./types";
import { getUserEngine } from "@/lib/engines/user-key";

export interface ResolvedRole {
  engineId: string;
  roleSlug: AgentRoleSlug;
}

export interface ResolvedRoleSet {
  primary: ResolvedRole;
  fallbackEngineIds: string[];
}

/**
 * Backward-compatible single-engine resolver. Returns only the primary.
 * New code should prefer resolveRoleEngineSet() for fallback awareness.
 */
export async function resolveRoleEngine(
  roleSlug: AgentRoleSlug,
  layer: 1 | 2 | 3 | 4 | 5 | 6,
): Promise<ResolvedRole> {
  const set = await resolveRoleEngineSet(roleSlug, layer);
  return set.primary;
}

export async function resolveRoleEngineSet(
  roleSlug: AgentRoleSlug,
  layer: 1 | 2 | 3 | 4 | 5 | 6,
): Promise<ResolvedRoleSet> {
  const assignment = await db.agentRoleAssignment.findUnique({
    where: { roleSlug },
    include: { engine: { select: { id: true, isActive: true, encryptedKey: true } } },
  });

  if (!assignment || !assignment.isActive) {
    throw new PipelineError(
      `No active assignment for role: ${roleSlug}. Admin must assign via /pr/yonet/agent-roles.`,
      layer,
    );
  }

  if (!assignment.engineId || !assignment.engine) {
    throw new PipelineError(`Role ${roleSlug} has no engine assigned.`, layer);
  }

  if (!assignment.engine.isActive) {
    throw new PipelineError(`Engine for role ${roleSlug} is inactive.`, layer);
  }

  if (!getUserEngine() && (!assignment.engine.encryptedKey || assignment.engine.encryptedKey.length === 0)) {
    throw new PipelineError(`Engine for role ${roleSlug} has no API key configured.`, layer);
  }

  return {
    primary: { engineId: assignment.engineId, roleSlug },
    fallbackEngineIds: assignment.fallbackEngineIds ?? [],
  };
}
