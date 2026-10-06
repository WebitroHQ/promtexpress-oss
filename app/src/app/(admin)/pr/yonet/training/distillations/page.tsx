import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { DistillationsClient } from "@/components/feature/admin/distillations-client";
import { db } from "@/db/client";

export default async function DistillationsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const rows = await db.trainingDistillation.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { resource: { select: { title: true, url: true } } },
  });

  const items = rows.map((d) => ({
    id: d.id,
    type: d.type,
    targetSlug: d.targetSlug,
    proposalJson: d.proposalJson,
    rationale: d.rationale,
    status: d.status,
    reviewNotes: d.reviewNotes,
    resourceTitle: d.resource?.title ?? null,
    createdAt: d.createdAt.toISOString(),
  }));

  const pending = items.filter((d) => d.status === "PENDING").length;

  return (
    <AdminShell current="training" userEmail={session.user.email}>
      <AdminPageHeader
        helpKey="training-distillations"
        title="Distillation Queue"
        sub={`${pending} pending, ${items.length} total. Approved suggestions are written into Constitution/Persona/AntiPattern/Exemplar tables.`}
      />
      <DistillationsClient items={items} />
    </AdminShell>
  );
}
