import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { UsersTableClient } from "@/components/feature/admin/users-table-client";
import { db } from "@/db/client";

export default async function AdminUsersPage() {
  const session = await auth();

  const [userRows, totalUsers] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        aiKeys: { where: { isActive: true }, select: { provider: true }, take: 1 },
        _count: { select: { prompts: true } },
      },
    }),
    db.user.count(),
  ]);

  const users = userRows.map((u) => ({
    id: u.id,
    name: u.name ?? u.email.split("@")[0]!,
    email: u.email,
    aiKey: u.aiKeys[0]?.provider ?? null,
    prompts: u._count.prompts,
    joined: u.createdAt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }),
    status: (u.suspendedAt ? "Suspended" : "Active") as "Active" | "Suspended",
    country: (u.country ?? u.locale).toUpperCase(),
    suspendReason: u.suspendReason,
  }));

  return (
    <AdminShell current="users" userEmail={session?.user?.email}>
      <AdminPageHeader helpKey="users" title="Users" sub={`${users.length} of ${totalUsers.toLocaleString()} users`} />
      <UsersTableClient users={users} totalUsers={totalUsers} />
    </AdminShell>
  );
}
