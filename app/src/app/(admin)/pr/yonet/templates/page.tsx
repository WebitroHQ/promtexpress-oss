import { Prisma, TemplateStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { NewTemplateButton } from "@/components/feature/admin/template-dialog";
import { TemplatesImportDialog } from "@/components/feature/admin/templates-import-dialog";
import { TemplatesTable } from "@/components/feature/admin/templates-table";
import { db } from "@/db/client";

const PAGE_SIZE = 20;
const MODALITIES = new Set(["text", "image", "code", "audio", "video"]);
const STATUSES = new Set<TemplateStatus>([
  TemplateStatus.DRAFT,
  TemplateStatus.REVIEW,
  TemplateStatus.PUBLISHED,
]);

interface PageProps {
  searchParams: Promise<{
    q?: string;
    modality?: string;
    status?: string;
    page?: string;
  }>;
}

export default async function AdminTemplatesPage({ searchParams }: PageProps) {
  const session = await auth();
  const sp = await searchParams;

  const q = (sp.q ?? "").trim();
  const modality = sp.modality && MODALITIES.has(sp.modality) ? sp.modality : "";
  const status =
    sp.status && STATUSES.has(sp.status as TemplateStatus) ? (sp.status as TemplateStatus) : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const where: Prisma.PromptTemplateWhereInput = {};
  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }
  if (modality) where.modality = modality;
  if (status) where.status = status;

  const [total, rows, statusCounts] = await Promise.all([
    db.promptTemplate.count({ where }),
    db.promptTemplate.findMany({
      where,
      orderBy: [{ status: "asc" }, { sortOrder: "asc" }, { updatedAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.promptTemplate.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  // 30-day usage counts via Prompt.templateId join
  const ids = rows.map((r) => r.id);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const usageRows =
    ids.length > 0
      ? await db.prompt.groupBy({
          by: ["templateId"],
          where: { templateId: { in: ids }, createdAt: { gte: thirtyDaysAgo } },
          _count: { _all: true },
        })
      : [];

  const usageMap = new Map<string, number>();
  for (const u of usageRows) {
    if (u.templateId) usageMap.set(u.templateId, u._count._all);
  }

  const tableRows = rows.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    modality: t.modality,
    engine: t.engine,
    template: t.template,
    variables: Array.isArray(t.variables)
      ? (t.variables as unknown[]).map((v) =>
          typeof v === "string"
            ? v
            : v && typeof v === "object" && typeof (v as { key?: unknown }).key === "string"
              ? (v as { key: string }).key
              : "",
        ).filter(Boolean)
      : [],
    status: t.status,
    version: t.version,
    sortOrder: t.sortOrder,
    uses30d: usageMap.get(t.id) ?? 0,
    updatedLabel: t.updatedAt.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  }));

  const counts = {
    total,
    DRAFT: 0,
    REVIEW: 0,
    PUBLISHED: 0,
  };
  for (const c of statusCounts) {
    counts[c.status as keyof typeof counts] = c._count._all;
  }

  return (
    <AdminShell current="templates" userEmail={session?.user?.email}>
      <AdminPageHeader
        helpKey="templates"
        title="Prompt Templates ⭐"
        sub={`${counts.total} total · ${counts.PUBLISHED} published · ${counts.REVIEW} review · ${counts.DRAFT} draft`}
        actions={
          <>
            <TemplatesImportDialog />
            <NewTemplateButton />
          </>
        }
      />

      <TemplatesTable
        rows={tableRows}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        query={q}
        modality={modality}
        status={status}
      />
    </AdminShell>
  );
}
