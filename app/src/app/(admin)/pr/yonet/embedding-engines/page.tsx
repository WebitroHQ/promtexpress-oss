import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { EmbeddingEnginesClient } from "@/components/feature/admin/embedding-engines-client";
import { db } from "@/db/client";

export default async function EmbeddingEnginesPage() {
  const session = await auth();

  const rows = await db.embeddingEngine.findMany({ orderBy: { createdAt: "asc" } });
  const engines = rows.map((e) => ({
    id: e.id,
    name: e.name,
    provider: e.provider,
    modelId: e.modelId,
    dimensions: e.dimensions,
    costPer1MTokens: Number(e.costPer1MTokens),
    isActive: e.isActive,
    isDefault: e.isDefault,
    hasKey: e.encryptedKey.length > 0,
    notes: e.notes ?? "",
  }));

  return (
    <AdminShell current="embedding-engines" userEmail={session?.user?.email}>
      <AdminPageHeader
        helpKey="embedding-engines"
        title="Embedding Engines"
        sub="Vector embedding models for the prompt library — used for semantic search and similarity"
      />
      <EmbeddingEnginesClient engines={engines} />
    </AdminShell>
  );
}
