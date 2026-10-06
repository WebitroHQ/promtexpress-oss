import { auth } from "@/lib/auth";
import { db } from "@/db/client";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";

export const dynamic = "force-dynamic";

export default async function AdminCreditAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; reason?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  const where: Record<string, unknown> = {};
  if (params.userId) where.userId = params.userId;
  if (params.reason) where.reason = params.reason;

  const entries = await db.creditLedger.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      user: { select: { email: true } },
    },
  });

  const totals = await db.creditLedger.aggregate({
    _sum: { delta: true },
    where,
  });

  return (
    <AdminShell current="billing-credit-audit" userEmail={session?.user?.email}>
      <AdminPageHeader
        title="Credit Audit"
        sub="Last 200 ledger rows (single source of truth)"
      />

      <div className="mb-4 px-3 py-2 rounded border border-border text-sm">
        Net delta (filtered):{" "}
        <span className="font-mono">{totals._sum.delta ?? 0}</span>
      </div>

      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-sm">
          <thead className="bg-bg-elev text-text-muted">
            <tr>
              <th className="px-3 py-2 text-left">When</th>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Reason</th>
              <th className="px-3 py-2 text-right">Δ</th>
              <th className="px-3 py-2 text-right">Consumed</th>
              <th className="px-3 py-2 text-left">Expires</th>
              <th className="px-3 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-border">
                <td className="px-3 py-2 text-xs">
                  {new Date(e.createdAt).toISOString()}
                </td>
                <td className="px-3 py-2 text-xs">{e.user.email}</td>
                <td className="px-3 py-2 font-mono text-xs">{e.reason}</td>
                <td
                  className={`px-3 py-2 text-right font-mono ${e.delta >= 0 ? "text-success" : "text-error"}`}
                >
                  {e.delta > 0 ? "+" : ""}
                  {e.delta}
                </td>
                <td className="px-3 py-2 text-right font-mono text-xs">
                  {e.delta > 0 ? `${e.consumedAmount}/${e.delta}` : "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {e.expiresAt ? new Date(e.expiresAt).toISOString().slice(0, 10) : "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {e.consumed ? "consumed" : "active"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
