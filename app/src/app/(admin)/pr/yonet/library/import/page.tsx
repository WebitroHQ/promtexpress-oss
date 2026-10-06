import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { LibraryImportClient } from "@/components/feature/admin/library-import-client";
import { db } from "@/db/client";
import { getLibraryStats } from "@/server/actions/admin-library-import";

export default async function LibraryImportPage() {
  const session = await auth();

  const [embeddingEngines, translationSetting, stats] = await Promise.all([
    db.embeddingEngine.findMany({ where: { isActive: true }, select: { id: true, name: true, isDefault: true } }),
    db.appSetting.findUnique({ where: { key: "translation_engine_id" } }),
    getLibraryStats(),
  ]);

  const { total, byStatus, byModality } = stats;
  const statusMap = Object.fromEntries(byStatus.map((s) => [s.status, s._count]));
  const modalityMap = Object.fromEntries(byModality.map((m) => [m.modality, m._count]));

  return (
    <AdminShell current="library-import" userEmail={session?.user?.email}>
      <AdminPageHeader
        helpKey="library-import"
        title="Import Prompts"
        sub="Upload .md, .json, .jsonl, .csv, .yaml, .yml, or .txt files — auto-parsed, deduped, translated to English"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted mb-1">Total prompts</p>
          <p className="text-[24px] font-semibold tabular-nums">{total.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted mb-1">Verified / Gold</p>
          <p className="text-[24px] font-semibold tabular-nums">
            {((statusMap.VERIFIED ?? 0) + (statusMap.GOLD ?? 0)).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted mb-1">In review</p>
          <p className="text-[24px] font-semibold tabular-nums">{(statusMap.REVIEW ?? 0).toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted mb-1">Modalities</p>
          <p className="text-[14px] font-medium">
            {Object.entries(modalityMap).slice(0, 4).map(([m, c]) => (
              <span key={m} className="mr-2 text-text-muted">{m}:<span className="text-text ml-1 tabular-nums">{c}</span></span>
            ))}
          </p>
        </div>
      </div>

      <LibraryImportClient
        embeddingEngines={embeddingEngines}
        hasTranslationEngine={Boolean(translationSetting?.value)}
      />
    </AdminShell>
  );
}
