import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { TargetEnginesManager } from "@/components/feature/admin/target-engines-manager";
import { db } from "@/db/client";

export default async function AdminTargetEnginesPage() {
  const session = await auth();

  const rows = await db.targetEngine.findMany({
    orderBy: [{ modality: "asc" }, { sortOrder: "asc" }],
  });

  const items = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    provider: r.provider,
    modality: r.modality,
    promptStyleHint: r.promptStyleHint,
    iconUrl: r.iconUrl,
    isActive: r.isActive,
    sortOrder: r.sortOrder,
    tier: r.tier,
    capabilities: r.capabilities,
    releasedAt: r.releasedAt,
    brandColor: r.brandColor,
    preferredLanguage: r.preferredLanguage,
    charLimit: r.charLimit,
    preferredFormat: r.preferredFormat,
    requiresEnglish: r.requiresEnglish,
    negativePromptSupport: r.negativePromptSupport,
    structuredFieldSpec: r.structuredFieldSpec as unknown,
    parameterHints: r.parameterHints as unknown,
    authoringTipsMd: r.authoringTipsMd,
  }));

  return (
    <AdminShell current="target-engines" userEmail={session?.user?.email}>
      <AdminPageHeader
        helpKey="target-engines"
        title="Target AIs"
        sub="The AI engines users will run the prompt on (ChatGPT, Midjourney, Sora, …)"
      />
      <TargetEnginesManager items={items} />
    </AdminShell>
  );
}
