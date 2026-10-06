import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { ApiLogsLiveClient } from "@/components/feature/admin/api-logs-live-client";
import { fetchApiLogs } from "@/server/actions/admin-api-logs";

export default async function AdminApiPage() {
  const session = await auth();
  const initial = await fetchApiLogs({});

  return (
    <AdminShell current="api" userEmail={session?.user?.email}>
      <AdminPageHeader
        helpKey="api"
        title="API logs"
        sub={`Live tail · last 100 calls · auto-refresh 5s`}
      />
      <ApiLogsLiveClient
        initial={{
          rows: initial.rows,
          total24h: initial.total24h,
          errors24h: initial.errors24h,
          hourlyBuckets: initial.hourlyBuckets,
        }}
      />
    </AdminShell>
  );
}
