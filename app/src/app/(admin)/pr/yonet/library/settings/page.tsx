import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { LibrarySettingsClient } from "@/components/feature/admin/library-settings-client";
import { db } from "@/db/client";

export default async function LibrarySettingsPage() {
  const session = await auth();

  const [aiEngines, translationSetting] = await Promise.all([
    db.aiEngine.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, provider: true, modelId: true },
    }),
    db.appSetting.findUnique({ where: { key: "translation_engine_id" } }),
  ]);

  return (
    <AdminShell current="library-settings" userEmail={session?.user?.email}>
      <AdminPageHeader
        helpKey="library-settings"
        title="Library AI"
        sub="AI engines used for automatic library processing — translation and embedding"
      />
      <LibrarySettingsClient
        aiEngines={aiEngines}
        currentTranslationEngineId={translationSetting?.value ?? ""}
      />
    </AdminShell>
  );
}
