import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { UsersTableClient } from "@/components/feature/admin/users-table-client";
import { db } from "@/db/client";

export default async function AdminUsersPage() {
  const session = await auth();

  const [userRows, totalUsers, plans] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        subscription: { include: { plan: { select: { name: true } } } },
      },
    }),
    db.user.count(),
    db.plan.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);

  const userIds = userRows.map((u) => u.id);
  const credits =
    userIds.length > 0
      ? await db.creditLedger.groupBy({
          by: ["userId"],
          where: { userId: { in: userIds } },
          _sum: { delta: true },
        })
      : [];
  const creditsMap = new Map(credits.map((c) => [c.userId, c._sum.delta ?? 0]));

  const users = userRows.map((u) => ({
    id: u.id,
    name: u.name ?? u.email.split("@")[0]!,
    email: u.email,
    plan: u.subscription?.plan.name ?? "Free",
    credits: creditsMap.get(u.id) ?? 0,
    joined: u.createdAt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
    status: (u.suspendedAt ? "Suspended" : "Active") as "Active" | "Suspended",
    country: (u.country ?? u.locale).toUpperCase(),
    suspendReason: u.suspendReason,
  }));

  return (
    <AdminShell current="users" userEmail={session?.user?.email}>
      <AdminPageHeader helpKey="users" title="Users" sub={`${users.length} of ${totalUsers.toLocaleString()} users`} />
      <UsersTableClient users={users} totalUsers={totalUsers} plans={plans} />
    </AdminShell>
  );
}
