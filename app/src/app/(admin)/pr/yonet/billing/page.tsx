import Link from "next/link";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { getBillingOverview } from "@/server/queries/admin-billing";

function fmtMoney(n: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtRel(d: Date) {
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminBillingOverviewPage() {
  const session = await auth();
  const data = await getBillingOverview();

  return (
    <AdminShell current="billing" userEmail={session?.user?.email}>
      <AdminPageHeader
        title="Billing overview"
        sub="Real-time view of Paddle transactions, webhooks, and revenue"
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-text-faint uppercase tracking-[0.06em] mb-1">
            Last 24h
          </p>
          <p className="text-[24px] font-semibold tabular-nums">
            {data.last24hTransactions}
          </p>
          <p className="text-xs text-text-muted mt-0.5">transactions</p>
          <p className="text-sm font-medium tabular-nums mt-1.5">
            {fmtMoney(data.last24hRevenueUsd, "USD")}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-text-faint uppercase tracking-[0.06em] mb-1">
            Last 30d
          </p>
          <p className="text-[24px] font-semibold tabular-nums">
            {data.last30dTransactions}
          </p>
          <p className="text-xs text-text-muted mt-0.5">transactions</p>
          <p className="text-sm font-medium tabular-nums mt-1.5">
            {fmtMoney(data.last30dRevenueUsd, "USD")}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-text-faint uppercase tracking-[0.06em] mb-1">
            Failed webhooks (24h)
          </p>
          <p
            className={`text-[24px] font-semibold tabular-nums ${
              data.failedWebhooksLast24h > 0 ? "text-error" : ""
            }`}
          >
            {data.failedWebhooksLast24h}
          </p>
          <p className="text-xs text-text-muted mt-0.5">need attention</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-text-faint uppercase tracking-[0.06em] mb-1">
            Pending webhooks
          </p>
          <p
            className={`text-[24px] font-semibold tabular-nums ${
              data.pendingWebhooks > 0 ? "text-warning" : ""
            }`}
          >
            {data.pendingWebhooks}
          </p>
          <p className="text-xs text-text-muted mt-0.5">unprocessed</p>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm">Recent transactions</h3>
          <Link
            href="/pr/yonet/billing/transactions"
            className="text-xs text-primary hover:underline"
          >
            View all →
          </Link>
        </div>
        {data.recentTransactions.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-text-muted">
            No transactions yet.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-5 py-2.5 text-left font-medium text-text-muted text-xs">
                  Date
                </th>
                <th className="px-5 py-2.5 text-left font-medium text-text-muted text-xs">
                  User
                </th>
                <th className="px-5 py-2.5 text-left font-medium text-text-muted text-xs">
                  Amount
                </th>
                <th className="px-5 py-2.5 text-left font-medium text-text-muted text-xs">
                  Type
                </th>
                <th className="px-5 py-2.5 text-left font-medium text-text-muted text-xs">
                  Status
                </th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {data.recentTransactions.map((t) => (
                <tr
                  key={t.id}
                  className="border-t border-border hover:bg-surface-2 transition-colors"
                >
                  <td className="px-5 py-2.5 text-text-muted whitespace-nowrap">
                    {fmtRel(t.createdAt)}
                  </td>
                  <td className="px-5 py-2.5">
                    {t.userEmail ? (
                      <Link
                        href={`/pr/yonet/users/${t.userId}/billing`}
                        className="text-primary hover:underline"
                      >
                        {t.userEmail}
                      </Link>
                    ) : (
                      <span className="text-text-faint">— unlinked —</span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 tabular-nums font-medium">
                    {fmtMoney(t.amount, t.currency)}
                  </td>
                  <td className="px-5 py-2.5 text-text-muted">{t.type}</td>
                  <td className="px-5 py-2.5">
                    <Badge variant={t.status === "completed" ? "success" : "warning"}>
                      {t.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-2.5">
                    <Link
                      href={`/pr/yonet/billing/transactions/${t.paddleTransactionId}`}
                      className="text-xs text-primary hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
