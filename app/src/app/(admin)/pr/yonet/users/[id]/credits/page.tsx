import { auth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { computeUserBalance } from "@/lib/credits/balance";
import { UserCreditsClient } from "@/components/feature/admin/user-credits-client";

export const dynamic = "force-dynamic";

export default async function AdminUserCreditsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id: id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) notFound();

  const balance = await computeUserBalance(id);
  const ledger = await db.creditLedger.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      createdAt: true,
      reason: true,
      delta: true,
      consumed: true,
      consumedAmount: true,
      expiresAt: true,
      meta: true,
    },
  });

  return (
    <AdminShell current="users" userEmail={session?.user?.email}>
      <AdminPageHeader
        title={`Credits — ${user.email}`}
        sub="Per-user credit ledger and manual adjustment"
      />
      <UserCreditsClient userId={id} balance={balance} ledger={ledger} />
    </AdminShell>
  );
}
