import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { MappingTable } from "@/components/feature/admin/mapping-table";
import { db } from "@/db/client";

const DEFAULT_MODALITIES = [
  "text",
  "code",
  "image",
  "audio",
  "video",
  "music",
  "math",
  "slides",
  "diagram",
  "3d",
  "document",
];

export default async function AdminMappingPage() {
  const session = await auth();

  const [engines, existingMappings] = await Promise.all([
    db.aiEngine.findMany({ orderBy: { sortOrder: "asc" } }),
    db.modalityMapping.findMany(),
  ]);

  const mappingByModality = Object.fromEntries(
    existingMappings.map((m) => [m.modality, m]),
  );

  const initial = DEFAULT_MODALITIES.map((mod) => {
    const existing = mappingByModality[mod];
    return {
      modality: mod,
      label: mod,
      primaryId: existing?.primaryId ?? null,
      fallbackId: existing?.fallbackId ?? null,
      questionerId: existing?.questionerId ?? null,
      validatorId: existing?.validatorId ?? null,
      isEnabled: existing?.isEnabled ?? true,
    };
  });

  const engineList = engines.map((e) => ({ id: e.id, name: e.name, provider: e.provider }));

  return (
    <AdminShell current="mapping" userEmail={session?.user?.email}>
      <AdminPageHeader
        helpKey="mapping"
        title="Modality Mapping"
        sub="Which engine handles each modality, with fallbacks"
      />
      <MappingTable engines={engineList} initial={initial} />
    </AdminShell>
  );
}
