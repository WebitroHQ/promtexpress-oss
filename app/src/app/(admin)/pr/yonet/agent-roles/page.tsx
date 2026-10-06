import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { AgentRolesClient } from "@/components/feature/admin/agent-roles-client";
import { db } from "@/db/client";
import { AgentRoleSlug } from "@prisma/client";

const ROLES: AgentRoleSlug[] = [
  "INTENT_ANALYZER",
  "SYNTHESIZER",
  "SAFETY_CHECKER",
  "EMBEDDER",
  "DISTILLER",
];

export default async function AgentRolesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const [briefs, assignments, engines] = await Promise.all([
    db.roleBrief.findMany({
      select: { roleSlug: true, version: true, systemPrompt: true, exemplars: true, isActive: true, notes: true },
    }),
    db.agentRoleAssignment.findMany({
      include: { engine: { select: { id: true, name: true } } },
    }),
    db.aiEngine.findMany({
      orderBy: [{ provider: "asc" }, { sortOrder: "asc" }],
      select: { id: true, name: true, provider: true, modelId: true, encryptedKey: true, isActive: true },
    }),
  ]);

  const briefByRole = new Map(briefs.map((b) => [b.roleSlug, b]));
  const assignByRole = new Map(assignments.map((a) => [a.roleSlug, a]));

  const roles = ROLES.map((slug) => {
    const b = briefByRole.get(slug);
    const a = assignByRole.get(slug);
    return {
      roleSlug: slug,
      briefVersion: b?.version ?? null,
      briefSystemPrompt: b?.systemPrompt ?? "",
      briefNotes: b?.notes ?? null,
      briefSystemPromptPreview: b ? b.systemPrompt.slice(0, 1500) + (b.systemPrompt.length > 1500 ? "\n…" : "") : "",
      exemplarCount: Array.isArray(b?.exemplars) ? b.exemplars.length : 0,
      assignedEngineId: a?.engineId ?? null,
      assignedEngineName: a?.engine?.name ?? null,
      isActive: a?.isActive ?? true,
      notes: a?.notes ?? null,
    };
  });

  const engineList = engines.map((e) => ({
    id: e.id,
    name: e.name,
    provider: e.provider,
    modelId: e.modelId,
    hasKey: !!e.encryptedKey && e.encryptedKey.length > 0,
    isActive: e.isActive,
    usable: !!e.encryptedKey && e.encryptedKey.length > 0 && e.isActive,
  }));

  return (
    <AdminShell current="agent-roles" userEmail={session.user.email}>
      <AdminPageHeader
        helpKey="agent-roles"
        title="Agent Roles"
        sub="Bind v4 pipeline roles to AI engines. Hardcoding FORBIDDEN — admin assigns."
      />
      <AgentRolesClient roles={roles} engines={engineList} />
    </AdminShell>
  );
}
