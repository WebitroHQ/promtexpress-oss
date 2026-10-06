import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import { AppSidebar } from "@/components/feature/layout/app-sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AppTopBar } from "@/components/feature/layout/app-top-bar";
import { HistoryRowActions } from "@/components/feature/history/history-row-actions";
import { getUserCredits } from "@/server/queries/credits";
import { getPromptHistory } from "@/server/queries/prompts";

const MODALITIES = ["All", "Text", "Image", "Code", "Audio", "Video"];

interface Props {
  searchParams: Promise<{ page?: string; modality?: string; search?: string }>;
}

export default async function HistoryPage({ searchParams }: Props) {
  const session = await auth();
  if (!session) redirect("/auth/login");

  const params = await searchParams;
  const page = Math.max(0, parseInt(params.page ?? "0", 10));
  const modality = params.modality ?? "All";
  const search = params.search?.trim() ?? "";
  const pageSize = 10;

  const [credits, history] = await Promise.all([
    getUserCredits(session.user.id),
    getPromptHistory(session.user.id, { page, pageSize, modality, search }),
  ]);
  const ROWS = history.rows;
  const totalPages = Math.max(1, Math.ceil(history.total / pageSize));

  // Build URL helper for page navigation
  function pageUrl(p: number) {
    const sp = new URLSearchParams();
    if (p > 0) sp.set("page", String(p));
    if (modality !== "All") sp.set("modality", modality);
    if (search) sp.set("search", search);
    const qs = sp.toString();
    return `/history${qs ? `?${qs}` : ""}`;
  }

  // Pagination window: show up to 5 page numbers around current
  function paginationPages(): (number | "…")[] {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i);
    const pages: (number | "…")[] = [];
    if (page <= 3) {
      pages.push(0, 1, 2, 3, 4, "…", totalPages - 1);
    } else if (page >= totalPages - 4) {
      pages.push(0, "…", totalPages - 5, totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1);
    } else {
      pages.push(0, "…", page - 1, page, page + 1, "…", totalPages - 1);
    }
    return pages;
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <AppSidebar credits={credits} />

      <main className="flex-1 min-w-0 flex flex-col">
        <AppTopBar userEmail={session.user?.email} />

        <div className="px-4 py-6 md:px-8 md:py-8 max-w-[1280px] w-full mx-auto pb-16">
          {/* Header */}
          <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
            <div>
              <h1 className="text-[28px] font-semibold tracking-[-0.025em]">History</h1>
              <p className="text-sm text-text-muted mt-1">{history.total} prompts total</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" asChild>
                <Link href="/generator">
                  <Plus className="h-3.5 w-3.5" /> New prompt
                </Link>
              </Button>
            </div>
          </div>

          {/* Filters row — GET form so filtering works without JS */}
          <form action="/history" method="GET">
            {search && <input type="hidden" name="search" value={search} />}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {MODALITIES.map((m) => {
                const isActive =
                  m === "All" ? !modality || modality === "All" : modality === m;
                return (
                  <button
                    key={m}
                    type="submit"
                    name="modality"
                    value={m === "All" ? "" : m}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      isActive
                        ? "bg-surface border-border-strong text-text"
                        : "border-border text-text-muted hover:text-text"
                    }`}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </form>

          {/* Search form */}
          <form action="/history" method="GET" className="mb-4">
            {modality !== "All" && <input type="hidden" name="modality" value={modality} />}
            <div className="flex gap-2">
              <input
                name="search"
                defaultValue={search}
                className="h-9 rounded-md border border-border bg-surface px-3 text-base md:h-8 md:text-sm w-full sm:w-[260px] focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Search prompts…"
              />
              <Button type="submit" variant="secondary" size="sm">Search</Button>
              {search && (
                <Link
                  href={modality !== "All" ? `/history?modality=${modality}` : "/history"}
                  className="flex items-center"
                >
                  <Button type="button" variant="ghost" size="sm">Clear</Button>
                </Link>
              )}
            </div>
          </form>

          {/* Mobile: card list */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden sm:hidden">
            {ROWS.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-text-muted">
                {search
                  ? `No results for "${search}"${modality !== "All" ? ` in ${modality}` : ""}.`
                  : "No prompts yet."}
              </div>
            ) : (
              ROWS.map((r, i) => (
                <div
                  key={r.id}
                  className={`px-4 py-3.5 ${i > 0 ? "border-t border-border" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{r.title}</p>
                      <p className="text-xs text-text-faint mt-0.5 font-mono truncate">{r.id}</p>
                    </div>
                    <HistoryRowActions row={r} />
                  </div>
                  <div className="flex items-center flex-wrap gap-2 mt-2.5">
                    <Badge>{r.modality}</Badge>
                    <Badge variant={r.status === "Failed" ? "error" : "success"}>
                      {r.status}
                    </Badge>
                    <span className="text-xs text-text-muted tabular-nums">{r.credits} cr</span>
                    <span className="text-xs text-text-faint ml-auto">{r.date}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop: table */}
          <div className="rounded-xl border border-border bg-surface overflow-hidden hidden sm:block">
            <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="bg-surface-2 border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-text-muted">Prompt</th>
                  <th className="px-4 py-3 text-left font-medium text-text-muted">Modality</th>
                  <th className="px-4 py-3 text-left font-medium text-text-muted">When</th>
                  <th className="px-4 py-3 text-left font-medium text-text-muted">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {ROWS.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm text-text-muted">
                      {search
                        ? `No results for "${search}"${modality !== "All" ? ` in ${modality}` : ""}.`
                        : "No prompts yet."}
                    </td>
                  </tr>
                ) : (
                  ROWS.map((r, i) => (
                    <tr
                      key={r.id}
                      className={`border-t border-border hover:bg-surface-2 transition-colors cursor-pointer ${i === 0 ? "border-t-0" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.title}</div>
                        <div className="text-xs text-text-faint mt-0.5 font-mono">{r.id}</div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge>{r.modality}</Badge>
                      </td>
                      <td className="px-4 py-3 text-text-muted">{r.date}</td>
                      <td className="px-4 py-3">
                        <Badge variant={r.status === "Failed" ? "error" : "success"}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <HistoryRowActions row={r} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4 text-sm text-text-muted">
            <span>
              {history.total === 0
                ? "No prompts yet"
                : `Showing ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, history.total)} of ${history.total}`}
            </span>
            {totalPages > 1 && (
              <div className="flex gap-1">
                <Link
                  href={pageUrl(Math.max(0, page - 1))}
                  className={`inline-flex items-center justify-center min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 px-2.5 sm:py-1 rounded text-sm transition-colors ${page === 0 ? "opacity-40 pointer-events-none" : "hover:bg-surface"}`}
                >
                  Prev
                </Link>
                {paginationPages().map((n, i) =>
                  n === "…" ? (
                    <span key={`sep-${i}`} className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 px-2.5 sm:py-1 text-sm text-text-faint">
                      …
                    </span>
                  ) : (
                    <Link
                      key={n}
                      href={pageUrl(n)}
                      className={`inline-flex items-center justify-center min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 px-2.5 sm:py-1 rounded text-sm transition-colors ${n === page ? "bg-surface-2 text-text" : "hover:bg-surface"}`}
                    >
                      {n + 1}
                    </Link>
                  )
                )}
                <Link
                  href={pageUrl(Math.min(totalPages - 1, page + 1))}
                  className={`inline-flex items-center justify-center min-w-[40px] min-h-[40px] sm:min-w-0 sm:min-h-0 px-2.5 sm:py-1 rounded text-sm transition-colors ${page >= totalPages - 1 ? "opacity-40 pointer-events-none" : "hover:bg-surface"}`}
                >
                  Next
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
