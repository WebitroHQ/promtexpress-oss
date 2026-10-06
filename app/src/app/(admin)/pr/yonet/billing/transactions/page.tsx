import Link from "next/link";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { listTransactions } from "@/server/queries/admin-billing";

interface SearchParams {
  page?: string;
  status?: string;
  user?: string;
  from?: string;
  to?: string;
}

function fmtMoney(n: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDateTime(d: Date) {
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminBillingTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const page = sp.page ? Math.max(1, parseInt(sp.page, 10)) : 1;

  const data = await listTransactions({
    page,
    pageSize: 25,
    status: sp.status || undefined,
    userEmail: sp.user || undefined,
    from: sp.from ? new Date(sp.from) : undefined,
    to: sp.to ? new Date(sp.to) : undefined,
  });

  const buildPageHref = (newPage: number) => {
    const params = new URLSearchParams();
    if (sp.status) params.set("status", sp.status);
    if (sp.user) params.set("user", sp.user);
    if (sp.from) params.set("from", sp.from);
    if (sp.to) params.set("to", sp.to);
    params.set("page", String(newPage));
    return `?${params.toString()}`;
  };

  return (
    <AdminShell current="billing-transactions" userEmail={session?.user?.email}>
      <AdminPageHeader
        title="Transactions"
        sub={`${data.total.toLocaleString()} total · page ${data.page} of ${data.totalPages}`}
      />

      {/* Filters */}
      <form className="flex gap-2 mb-4 flex-wrap" method="get">
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="h-8 rounded-md border border-border bg-surface px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="completed">Completed</option>
          <option value="canceled">Canceled</option>
          <option value="paid">Paid</option>
          <option value="past_due">Past due</option>
          <option value="ready">Ready</option>
        </select>
        <input
          name="user"
          defaultValue={sp.user ?? ""}
          placeholder="User email contains…"
          className="h-8 rounded-md border border-border bg-surface px-3 text-sm w-[240px]"
        />
        <input
          name="from"
          type="date"
          defaultValue={sp.from ?? ""}
          className="h-8 rounded-md border border-border bg-surface px-3 text-sm"
        />
        <input
          name="to"
          type="date"
          defaultValue={sp.to ?? ""}
          className="h-8 rounded-md border border-border bg-surface px-3 text-sm"
        />
        <button
          type="submit"
          className="h-8 rounded-md bg-primary text-primary-foreground px-3 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Filter
        </button>
        <Link
          href="/pr/yonet/billing/transactions"
          className="h-8 inline-flex items-center px-3 text-sm text-text-muted hover:text-text"
        >
          Reset
        </Link>
      </form>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {data.rows.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-text-muted">
            No transactions match the filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-surface-2">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-text-muted text-xs">
                    Date
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-text-muted text-xs">
                    User
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-text-muted text-xs">
                    Amount
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-text-muted text-xs">
                    Type
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-text-muted text-xs">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-text-muted text-xs">
                    Paddle ID
                  </th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {data.rows.map((t) => (
                  <tr
                    key={t.id}
                    className="border-t border-border hover:bg-surface-2 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-text-muted whitespace-nowrap">
                      {fmtDateTime(t.createdAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      {t.userEmail ? (
                        <Link
                          href={`/pr/yonet/users/${t.userId}/billing`}
                          className="text-primary hover:underline"
                        >
                          {t.userEmail}
                        </Link>
                      ) : (
                        <span className="text-text-faint italic">unlinked</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums font-medium">
                      {fmtMoney(t.amount, t.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-text-muted">{t.type}</td>
                    <td className="px-4 py-2.5">
                      <Badge
                        variant={
                          t.status === "completed"
                            ? "success"
                            : t.status === "past_due"
                            ? "error"
                            : "warning"
                        }
                      >
                        {t.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5">
                      <code className="text-[11px] text-text-faint">
                        {t.paddleTransactionId.slice(0, 24)}…
                      </code>
                    </td>
                    <td className="px-4 py-2.5">
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
          </div>
        )}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          {data.page > 1 && (
            <Link
              href={buildPageHref(data.page - 1)}
              className="h-8 inline-flex items-center px-3 text-sm rounded-md border border-border hover:bg-surface-2"
            >
              ← Prev
            </Link>
          )}
          <span className="text-sm text-text-muted px-2">
            Page {data.page} of {data.totalPages}
          </span>
          {data.page < data.totalPages && (
            <Link
              href={buildPageHref(data.page + 1)}
              className="h-8 inline-flex items-center px-3 text-sm rounded-md border border-border hover:bg-surface-2"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </AdminShell>
  );
}
