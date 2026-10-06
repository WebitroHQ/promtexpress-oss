import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import {
  getUserBilling,
  paddleDashboardUrl,
} from "@/server/queries/admin-billing";

function fmtMoney(n: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDateTime(d: Date | null) {
  if (!d) return "—";
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminUserBillingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const data = await getUserBilling(id);

  if (!data) notFound();

  const { user, paddleCustomer, subscription, transactions, packPurchases, recentLedger } =
    data;

  const totalGranted = packPurchases.reduce((s, p) => s + p.creditsGranted, 0);
  const totalUsed = packPurchases.reduce((s, p) => s + p.creditsUsed, 0);

  return (
    <AdminShell current="users" userEmail={session?.user?.email}>
      <div className="mb-2">
        <Link
          href={`/pr/yonet/users/${user.id}`}
          className="text-xs text-text-muted hover:text-text"
        >
          ← Back to user
        </Link>
      </div>

      <AdminPageHeader
        title={`Billing — ${user.email}`}
        sub={user.name ?? "Unnamed user"}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Paddle Customer */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs text-text-faint uppercase tracking-[0.06em] mb-3">
            Paddle customer
          </p>
          {paddleCustomer ? (
            <>
              <p className="font-mono text-xs break-all mb-2">
                {paddleCustomer.paddleCustomerId}
              </p>
              <a
                href={paddleDashboardUrl("customer", paddleCustomer.paddleCustomerId)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Open in Paddle ↗
              </a>
              <p className="text-[11px] text-text-faint mt-2">
                Linked: {fmtDateTime(paddleCustomer.createdAt)}
              </p>
            </>
          ) : (
            <p className="text-sm text-text-faint italic">
              No Paddle customer linked yet.
            </p>
          )}
        </div>

        {/* Subscription */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs text-text-faint uppercase tracking-[0.06em] mb-3">
            Subscription
          </p>
          {subscription ? (
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-text-muted">Plan</dt>
                <dd className="font-medium">{subscription.plan.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Status</dt>
                <dd>
                  <Badge
                    variant={
                      subscription.status === "ACTIVE"
                        ? "success"
                        : subscription.status === "PAST_DUE"
                        ? "error"
                        : "warning"
                    }
                  >
                    {subscription.status}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Cycle</dt>
                <dd>{subscription.billingCycle}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-text-muted">Renews</dt>
                <dd className="text-xs">
                  {fmtDateTime(subscription.currentPeriodEnd)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-text-faint italic">No active subscription.</p>
          )}
        </div>

        {/* Pack credits */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs text-text-faint uppercase tracking-[0.06em] mb-3">
            Pack credits
          </p>
          <p className="text-[24px] font-semibold tabular-nums">
            {totalGranted - totalUsed}
          </p>
          <p className="text-xs text-text-muted">
            granted {totalGranted} · used {totalUsed}
          </p>
          <p className="text-[11px] text-text-faint mt-2">
            From {packPurchases.length} pack purchase
            {packPurchases.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {/* Transactions */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">
            Transactions ({transactions.length})
          </h3>
        </div>
        {transactions.length === 0 ? (
          <div className="px-5 py-6 text-sm text-text-muted">
            No transactions for this user.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Date
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Amount
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Type
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Status
                </th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="px-5 py-2.5 text-xs">{fmtDateTime(t.createdAt)}</td>
                  <td className="px-5 py-2.5 tabular-nums font-medium">
                    {fmtMoney(t.amount, t.currency)}
                  </td>
                  <td className="px-5 py-2.5 text-text-muted">{t.type}</td>
                  <td className="px-5 py-2.5">
                    <Badge
                      variant={t.status === "completed" ? "success" : "warning"}
                    >
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

      {/* Pack purchases */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">
            Pack purchases ({packPurchases.length})
          </h3>
        </div>
        {packPurchases.length === 0 ? (
          <div className="px-5 py-6 text-sm text-text-muted">No pack purchases.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Pack
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Granted
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Used
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Purchased
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Expires
                </th>
              </tr>
            </thead>
            <tbody>
              {packPurchases.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-5 py-2.5 font-medium">{p.packName}</td>
                  <td className="px-5 py-2.5 tabular-nums">+{p.creditsGranted}</td>
                  <td className="px-5 py-2.5 tabular-nums text-text-muted">
                    {p.creditsUsed}
                  </td>
                  <td className="px-5 py-2.5 text-xs">{fmtDateTime(p.purchasedAt)}</td>
                  <td className="px-5 py-2.5 text-xs">
                    {p.expiredAt ? (
                      <Badge variant="error">expired</Badge>
                    ) : (
                      fmtDateTime(p.expiresAt)
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent ledger */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">
            Recent credit ledger ({recentLedger.length})
          </h3>
        </div>
        {recentLedger.length === 0 ? (
          <div className="px-5 py-6 text-sm text-text-muted">
            No credit ledger entries.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Date
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Delta
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Reason
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {recentLedger.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-5 py-2.5 text-xs">{fmtDateTime(l.createdAt)}</td>
                  <td className="px-5 py-2.5 tabular-nums font-medium">
                    {l.delta > 0 ? `+${l.delta}` : l.delta}
                  </td>
                  <td className="px-5 py-2.5 text-text-muted">{l.reason}</td>
                  <td className="px-5 py-2.5 text-xs">
                    {l.meta && (l.meta as Record<string, unknown>).manualRecovery ? (
                      <Badge variant="warning">Manual recovery</Badge>
                    ) : (
                      <span className="text-text-faint">—</span>
                    )}
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
