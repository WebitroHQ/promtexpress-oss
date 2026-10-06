import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { LibraryDetailClient } from "@/components/feature/admin/library-detail-client";
import { db } from "@/db/client";

export default async function LibraryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const { id } = await params;

  const exemplar = await db.promptExemplar.findUnique({
    where: { id },
    include: { targetEngine: { select: { id: true, name: true, slug: true } } },
  });

  if (!exemplar) notFound();

  const targetEngines = await db.targetEngine.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true, modality: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <AdminShell current="library" userEmail={session?.user?.email}>
      <AdminPageHeader
        helpKey="library-detail"
        title={exemplar.title ?? "Untitled prompt"}
        sub={`${exemplar.source} · ${exemplar.modality} · ${exemplar.status}`}
      />
      <LibraryDetailClient
        exemplar={{
          id: exemplar.id,
          title: exemplar.title ?? "",
          prompt: exemplar.prompt,
          expectedOutput: exemplar.expectedOutput ?? "",
          modality: exemplar.modality,
          subCategory: exemplar.subCategory ?? "",
          intentTags: exemplar.intentTags,
          targetEngineId: exemplar.targetEngineId ?? "",
          status: exemplar.status,
          qualityScore: exemplar.qualityScore ?? null,
          notes: exemplar.notes ?? "",
          source: exemplar.source,
          sourceFile: exemplar.sourceFile ?? "",
          contentLength: exemplar.contentLength,
          embeddedAt: exemplar.embeddedAt?.toISOString() ?? null,
          embeddingModel: exemplar.embeddingModel ?? null,
          runCount: exemplar.runCount,
          successCount: exemplar.successCount,
          createdAt: exemplar.createdAt.toISOString(),
        }}
        targetEngines={targetEngines}
      />
    </AdminShell>
  );
}
