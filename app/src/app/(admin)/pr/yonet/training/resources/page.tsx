import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { TrainingResourcesClient } from "@/components/feature/admin/training-resources-client";
import { db } from "@/db/client";

export default async function TrainingResourcesPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const rows = await db.trainingResource.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { _count: { select: { snapshots: true, distillations: true } } },
  });

  const resources = rows.map((r) => ({
    id: r.id,
    type: r.type,
    url: r.url,
    title: r.title,
    description: r.description,
    targetPersonaSlugs: r.targetPersonaSlugs,
    targetTags: r.targetTags,
    refreshPolicy: r.refreshPolicy,
    status: r.status,
    lastFetchedAt: r.lastFetchedAt?.toISOString() ?? null,
    snapshotCount: r._count.snapshots,
    distillationCount: r._count.distillations,
  }));

  return (
    <AdminShell current="training" userEmail={session.user.email}>
      <AdminPageHeader
        helpKey="training-resources"
        title="Training Resources"
        sub="Admin-curated training sources (URL/RSS/sitemap). After distillation approval, Constitution/Persona/AntiPattern are updated."
      />
      <TrainingResourcesClient resources={resources} />
    </AdminShell>
  );
}
