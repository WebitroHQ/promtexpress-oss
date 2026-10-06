import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { getWelcomeCreditAmount } from "@/lib/onboarding/grant-welcome-credit";
import { WelcomeCreditClient } from "@/components/feature/admin/welcome-credit-client";

export default async function AdminWelcomeCreditPage() {
  const session = await auth();
  const amount = await getWelcomeCreditAmount();

  return (
    <AdminShell current="welcome-credit" userEmail={session?.user?.email}>
      <AdminPageHeader title="Welcome Credit" sub="Credit amount automatically granted to new members" />
      <WelcomeCreditClient initialAmount={amount} />
    </AdminShell>
  );
}
