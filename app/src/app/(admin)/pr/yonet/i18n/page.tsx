import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { I18nClient } from "@/components/feature/admin/i18n-client";
import { listLocales } from "@/lib/admin/i18n-stats";

export default async function AdminI18nPage() {
  const session = await auth();
  const locales = await listLocales();
  const totalStrings = locales[0]?.baseStrings ?? 0;

  return (
    <AdminShell current="i18n" userEmail={session?.user?.email}>
      <AdminPageHeader
        helpKey="i18n"
        title="Languages"
        sub={`${locales.length} languages · ${totalStrings} base strings`}
      />
      <I18nClient locales={locales} />
    </AdminShell>
  );
}
