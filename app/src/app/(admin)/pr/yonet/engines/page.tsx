import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { ConnectEngineDialog } from "@/components/feature/admin/connect-engine-dialog";
import { EnginesAccordion } from "@/components/feature/admin/engines-accordion";
import { db } from "@/db/client";

export default async function AdminEnginesPage() {
  const session = await auth();

  const rows = await db.aiEngine.findMany({ orderBy: { sortOrder: "asc" } });

  const engines = rows.map((e) => ({
    id: e.id,
    name: e.name,
    modelId: e.modelId,
    provider: e.provider,
    cost: Number(e.costPerUnit),
    unitType: e.unitType,
    enabled: e.isActive,
    hasKey: e.encryptedKey.length > 0,
    capabilities: {
      contextWindow: e.contextWindow,
      maxOutputTokens: e.maxOutputTokens,
      preferredFormat: e.preferredFormat,
      promptGuidelines: e.promptGuidelines,
      supportsVision: e.supportsVision,
      supportsReasoning: e.supportsReasoning,
    },
  }));

  return (
    <AdminShell current="engines" userEmail={session?.user?.email}>
      <AdminPageHeader
        helpKey="engines"
        title="Engines"
        sub="LLM and media engine connections — grouped by provider"
        actions={<ConnectEngineDialog />}
      />
      <EnginesAccordion engines={engines} />
    </AdminShell>
  );
}
