import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { AbuseTableClient } from "@/components/feature/admin/abuse-table-client";
import { db } from "@/db/client";

export default async function AdminAbusePage() {
  const session = await auth();

  const rows = await db.abuseReport.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { reporter: { select: { email: true } } },
  });

  const reports = rows.map((r) => ({
    id: r.id,
    reporterEmail: r.reporter?.email ?? null,
    type: r.type,
    severity: r.severity,
    targetType: r.targetType,
    targetId: r.targetId,
    description: r.description,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
  }));

  const open = reports.filter((r) => r.status === "OPEN" || r.status === "INVESTIGATING").length;

  return (
    <AdminShell current="abuse" userEmail={session?.user?.email}>
      <AdminPageHeader helpKey="abuse" title="Abuse & Reports" sub={`${open} open · ${reports.length} total`} />
      <AbuseTableClient reports={reports} />
    </AdminShell>
  );
}
