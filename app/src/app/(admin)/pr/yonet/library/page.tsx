import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { LibraryListClient } from "@/components/feature/admin/library-list-client";
import { db } from "@/db/client";

type SearchParams = { modality?: string; status?: string; q?: string; page?: string };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const session = await auth();
  const sp = await searchParams;

  const page = Math.max(1, Number(sp.page ?? 1));
  const pageSize = 50;
  const skip = (page - 1) * pageSize;

  const where = {
    ...(sp.modality ? { modality: sp.modality } : {}),
    ...(sp.status ? { status: sp.status as never } : {}),
    ...(sp.q ? { OR: [
      { title: { contains: sp.q, mode: "insensitive" as const } },
      { prompt: { contains: sp.q, mode: "insensitive" as const } },
    ]} : {}),
  };

  const [rows, total, stats] = await Promise.all([
    db.promptExemplar.findMany({
      where,
      select: {
        id: true,
        title: true,
        modality: true,
        subCategory: true,
        status: true,
        qualityScore: true,
        contentLength: true,
        embeddedAt: true,
        runCount: true,
        source: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    db.promptExemplar.count({ where }),
    db.promptExemplar.groupBy({ by: ["status"], _count: true }),
  ]);

  return (
    <AdminShell current="library" userEmail={session?.user?.email}>
      <AdminPageHeader
        helpKey="library-list"
        title="Prompt Library"
        sub={`${total.toLocaleString()} prompts total`}
      />
      <LibraryListClient
        rows={rows.map((r) => ({
          ...r,
          qualityScore: r.qualityScore ?? null,
          embeddedAt: r.embeddedAt?.toISOString() ?? null,
          createdAt: r.createdAt.toISOString(),
        }))}
        total={total}
        page={page}
        pageSize={pageSize}
        stats={stats.map((s) => ({ status: s.status, count: s._count }))}
        filters={{ modality: sp.modality, status: sp.status, q: sp.q }}
      />
    </AdminShell>
  );
}
