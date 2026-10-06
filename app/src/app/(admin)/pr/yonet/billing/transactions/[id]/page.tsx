import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import {
  getTransactionDetail,
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
    second: "2-digit",
  });
}

export default async function AdminTransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;
  const data = await getTransactionDetail(id);

  if (!data) notFound();

  const { transaction: tx, packPurchases, ledgerEntries, webhookEvents } = data;

  return (
    <AdminShell current="billing-transactions" userEmail={session?.user?.email}>
      <div className="mb-2">
        <Link
          href="/pr/yonet/billing/transactions"
          className="text-xs text-text-muted hover:text-text"
        >
          ← Back to transactions
        </Link>
      </div>

      <AdminPageHeader
        title={`Transaction ${tx.paddleTransactionId}`}
        sub={`${tx.type} · ${fmtMoney(tx.amount, tx.currency)} · ${tx.status}`}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Summary */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs text-text-faint uppercase tracking-[0.06em] mb-3">
            Summary
          </p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">Status</dt>
              <dd>
                <Badge
                  variant={
                    tx.status === "completed"
                      ? "success"
                      : tx.status === "past_due"
                      ? "error"
                      : "warning"
                  }
                >
                  {tx.status}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">Amount</dt>
              <dd className="font-medium tabular-nums">
                {fmtMoney(tx.amount, tx.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">Type</dt>
              <dd>{tx.type}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">Created</dt>
              <dd className="text-xs">{fmtDateTime(tx.createdAt)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">Processed</dt>
              <dd className="text-xs">{fmtDateTime(tx.processedAt)}</dd>
            </div>
          </dl>
        </div>

        {/* Customer */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs text-text-faint uppercase tracking-[0.06em] mb-3">
            Customer
          </p>
          {tx.userId ? (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-text-muted text-xs">User</dt>
                <dd className="mt-0.5">
                  <Link
                    href={`/pr/yonet/users/${tx.userId}/billing`}
                    className="text-primary hover:underline"
                  >
                    {tx.userEmail}
                  </Link>
                  {tx.userName && (
                    <span className="text-text-faint text-xs ml-1">
                      ({tx.userName})
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-text-muted text-xs">Paddle customer</dt>
                <dd className="mt-0.5 font-mono text-xs break-all">
                  {tx.paddleCustomerId ?? "—"}
                </dd>
              </div>
            </dl>
          ) : (
            <div className="text-sm text-text-faint">
              <p className="italic">No user linked.</p>
              {tx.paddleCustomerId && (
                <p className="mt-2 text-xs">
                  Paddle customer:{" "}
                  <code className="font-mono">{tx.paddleCustomerId}</code>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Paddle links */}
        <div className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs text-text-faint uppercase tracking-[0.06em] mb-3">
            Paddle dashboard
          </p>
          <div className="flex flex-col gap-2">
            <a
              href={paddleDashboardUrl("transaction", tx.paddleTransactionId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Open transaction ↗
            </a>
            {tx.paddleCustomerId && (
              <a
                href={paddleDashboardUrl("customer", tx.paddleCustomerId)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Open customer ↗
              </a>
            )}
            <p className="text-[11px] text-text-faint mt-2">
              Refunds and admin actions happen on Paddle dashboard until Phase 2.
            </p>
          </div>
        </div>
      </div>

      {/* Pack purchases */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">
            Pack purchases ({packPurchases.length})
          </h3>
        </div>
        {packPurchases.length === 0 ? (
          <div className="px-5 py-6 text-sm text-text-muted">
            No pack purchases linked to this transaction.
          </div>
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
                  <td className="px-5 py-2.5">
                    <span className="font-medium">{p.packName}</span>
                    <span className="text-text-faint text-xs ml-2">
                      ({p.packSlug})
                    </span>
                  </td>
                  <td className="px-5 py-2.5 tabular-nums">
                    +{p.creditsGranted}
                  </td>
                  <td className="px-5 py-2.5 tabular-nums text-text-muted">
                    {p.creditsUsed}
                  </td>
                  <td className="px-5 py-2.5 text-xs">
                    {fmtDateTime(p.purchasedAt)}
                  </td>
                  <td className="px-5 py-2.5 text-xs">
                    {p.expiredAt ? (
                      <span className="text-error">expired</span>
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

      {/* Credit ledger entries */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden mb-6">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">
            Credit ledger ({ledgerEntries.length})
          </h3>
        </div>
        {ledgerEntries.length === 0 ? (
          <div className="px-5 py-6 text-sm text-text-muted">
            No credit ledger entries linked to this transaction.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Delta
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Reason
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Created
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-5 py-2.5 tabular-nums font-medium">
                    {l.delta > 0 ? `+${l.delta}` : l.delta}
                  </td>
                  <td className="px-5 py-2.5 text-text-muted">{l.reason}</td>
                  <td className="px-5 py-2.5 text-xs">
                    {fmtDateTime(l.createdAt)}
                  </td>
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

      {/* Webhook events */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="font-semibold text-sm">
            Related webhook events ({webhookEvents.length})
          </h3>
        </div>
        {webhookEvents.length === 0 ? (
          <div className="px-5 py-6 text-sm text-text-muted">
            No webhook events found.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Event
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Received
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Processed
                </th>
                <th className="px-5 py-2.5 text-left text-xs font-medium text-text-muted">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {webhookEvents.map((e) => (
                <tr key={e.id} className="border-t border-border">
                  <td className="px-5 py-2.5">
                    <span className="font-medium">{e.eventType}</span>
                    <code className="block text-[11px] text-text-faint mt-0.5">
                      {e.paddleEventId.slice(0, 24)}…
                    </code>
                  </td>
                  <td className="px-5 py-2.5 text-xs">
                    {fmtDateTime(e.receivedAt)}
                  </td>
                  <td className="px-5 py-2.5 text-xs">
                    {fmtDateTime(e.processedAt)}
                  </td>
                  <td className="px-5 py-2.5">
                    {e.error ? (
                      <Badge variant="error">{e.error.slice(0, 30)}</Badge>
                    ) : e.processedAt ? (
                      <Badge variant="success">processed</Badge>
                    ) : (
                      <Badge variant="warning">pending</Badge>
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
