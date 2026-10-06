import Link from "next/link";
import { auth } from "@/lib/auth";
import { AdminShell } from "@/components/feature/admin/admin-shell";
import { AdminPageHeader } from "@/components/feature/admin/admin-page-header";
import { Badge } from "@/components/ui/badge";
import { listPackPurchases } from "@/server/queries/admin-billing";

interface SearchParams {
  page?: string;
  pack?: string;
  user?: string;
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

export default async function AdminBillingPacksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const page = sp.page ? Math.max(1, parseInt(sp.page, 10)) : 1;

  const data = await listPackPurchases({
    page,
    pageSize: 25,
    packSlug: sp.pack || undefined,
    userEmail: sp.user || undefined,
  });

  const buildPageHref = (newPage: number) => {
    const params = new URLSearchParams();
    if (sp.pack) params.set("pack", sp.pack);
    if (sp.user) params.set("user", sp.user);
    params.set("page", String(newPage));
    return `?${params.toString()}`;
  };

  return (
    <AdminShell current="billing-packs" userEmail={session?.user?.email}>
      <AdminPageHeader
        title="Pack purchases"
        sub={`${data.total.toLocaleString()} total · page ${data.page} of ${data.totalPages}`}
      />

      {/* Filters */}
      <form className="flex gap-2 mb-4 flex-wrap" method="get">
        <select
          name="pack"
          defaultValue={sp.pack ?? ""}
          className="h-8 rounded-md border border-border bg-surface px-3 text-sm"
        >
          <option value="">All packs</option>
          <option value="quick">Quick (50)</option>
          <option value="plus">Plus pack (100)</option>
          <option value="standard">Standard pack (200)</option>
          <option value="large">Large pack (500)</option>
        </select>
        <input
          name="user"
          defaultValue={sp.user ?? ""}
          placeholder="User email contains…"
          className="h-8 rounded-md border border-border bg-surface px-3 text-sm w-[240px]"
        />
        <button
          type="submit"
          className="h-8 rounded-md bg-primary text-primary-foreground px-3 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Filter
        </button>
        <Link
          href="/pr/yonet/billing/packs"
          className="h-8 inline-flex items-center px-3 text-sm text-text-muted hover:text-text"
        >
          Reset
        </Link>
      </form>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        {data.rows.length === 0 ? (
          <div className="px-5 py-16 text-center text-sm text-text-muted">
            No pack purchases match the filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-surface-2">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">
                    Purchased
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">
                    User
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">
                    Pack
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">
                    Granted
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">
                    Used
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">
                    Expires
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">
                    Transaction
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-border hover:bg-surface-2 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                      {fmtDateTime(p.purchasedAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      {p.userEmail ? (
                        <Link
                          href={`/pr/yonet/users/${p.userId}/billing`}
                          className="text-primary hover:underline"
                        >
                          {p.userEmail}
                        </Link>
                      ) : (
                        <span className="text-text-faint italic">unlinked</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium">{p.packName}</span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      +{p.creditsGranted}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-text-muted">
                      {p.creditsUsed}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {p.expiredAt ? (
                        <Badge variant="error">expired</Badge>
                      ) : (
                        fmtDateTime(p.expiresAt)
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {p.paddleTransactionId ? (
                        <Link
                          href={`/pr/yonet/billing/transactions/${p.paddleTransactionId}`}
                          className="text-xs text-primary hover:underline"
                        >
                          View →
                        </Link>
                      ) : (
                        <span className="text-text-faint text-xs">—</span>
                      )}
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
