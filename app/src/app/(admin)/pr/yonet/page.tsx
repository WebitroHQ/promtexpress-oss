import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { LiveStatsClient } from "@/components/feature/admin/live-stats-client";
import { getLiveStats } from "@/lib/admin/live-stats";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await auth();
  const initial = await getLiveStats();

  return (
    <AdminShell current="dashboard" userEmail={session?.user?.email}>
      <AdminPageHeader
        title="Dashboard"
        sub="Visitors, sign-ups, generations, library growth and feedback. Refreshes on its own while this page is open."
      />
      <LiveStatsClient initial={initial} />
    </AdminShell>
  );
}
