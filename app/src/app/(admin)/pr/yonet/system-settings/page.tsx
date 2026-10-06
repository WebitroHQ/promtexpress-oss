import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { AdminSystemSettingsClient } from "@/components/feature/admin/admin-system-settings-client";
import { getRequireEmailVerification } from "@/server/queries/app-settings";

export default async function AdminSystemSettingsPage() {
  const session = await auth();
  const requireEmailVerification = await getRequireEmailVerification();

  return (
    <AdminShell current="system-settings" userEmail={session?.user?.email}>
      <AdminPageHeader helpKey="system-settings" title="System settings" />
      <AdminSystemSettingsClient
        requireEmailVerification={requireEmailVerification}
      />
    </AdminShell>
  );
}
