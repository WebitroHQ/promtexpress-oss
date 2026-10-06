import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { TaxonomyClient } from "@/components/feature/admin/taxonomy-client";
import { db } from "@/db/client";

export default async function AdminTaxonomyPage() {
  const session = await auth();

  const [allCats, templateCounts] = await Promise.all([
    db.taxonomyCategory.findMany({
      orderBy: [{ modality: "asc" }, { sortOrder: "asc" }],
    }),
    db.promptTemplate.groupBy({
      by: ["categoryId"],
      _count: true,
      where: { categoryId: { not: null } },
    }),
  ]);

  const countByCategory = new Map(templateCounts.map((c) => [c.categoryId!, c._count]));

  type Row = {
    id: string;
    modality: string;
    slug: string;
    name: string;
    description: string | null;
    parentId: string | null;
    isActive: boolean;
    sortOrder: number;
    templateCount: number;
    children: Row[];
  };

  const byParent = new Map<string | null, Row[]>();
  for (const c of allCats) {
    const row: Row = {
      id: c.id,
      modality: c.modality,
      slug: c.slug,
      name: c.name,
      description: c.description,
      parentId: c.parentId,
      isActive: c.isActive,
      sortOrder: c.sortOrder,
      templateCount: countByCategory.get(c.id) ?? 0,
      children: [],
    };
    const arr = byParent.get(c.parentId) ?? [];
    arr.push(row);
    byParent.set(c.parentId, arr);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.sortOrder - b.sortOrder);

  // Top level categories with children attached
  const topLevel = (byParent.get(null) ?? []).map((row) => ({
    ...row,
    children: byParent.get(row.id) ?? [],
  }));

  // Group by modality
  const groups = ["text", "image", "code", "audio", "video", "music"].map((modality) => {
    const cats = topLevel.filter((c) => c.modality === modality);
    const total = cats.reduce((s, c) => s + c.templateCount + c.children.reduce((s2, ch) => s2 + ch.templateCount, 0), 0);
    return { modality, total, categories: cats };
  });

  return (
    <AdminShell current="taxonomy" userEmail={session?.user?.email}>
      <AdminPageHeader
        helpKey="taxonomy"
        title="Taxonomy"
        sub="Categories & sub-categories for templates — admin-managed."
      />
      <TaxonomyClient groups={groups} />
    </AdminShell>
  );
}
