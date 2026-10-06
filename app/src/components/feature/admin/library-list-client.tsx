"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, ChevronLeft, ChevronRight, Zap, Languages, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  startBulkEmbed,
  stopBulkEmbed,
  getEmbeddingStatus,
  startBulkTranslate,
  stopBulkTranslate,
  getTranslationStatus,
} from "@/server/actions/admin-library";

type Row = {
  id: string;
  title: string | null;
  modality: string;
  subCategory: string | null;
  status: string;
  qualityScore: number | null;
  contentLength: number;
  embeddedAt: string | null;
  runCount: number;
  source: string;
  createdAt: string;
};

type Stat = { status: string; count: number };

const STATUS_COLORS: Record<string, string> = {
  REVIEW:   "bg-warning/15 text-warning",
  VERIFIED: "bg-primary/15 text-primary",
  GOLD:     "bg-yellow-100 text-yellow-700",
  ARCHIVED: "bg-surface-2 text-text-faint",
  REJECTED: "bg-error/15 text-error",
};

const MODALITIES = ["text", "image", "video", "audio", "code"];
const STATUSES = ["REVIEW", "VERIFIED", "GOLD", "ARCHIVED", "REJECTED"];

export function LibraryListClient({
  rows,
  total,
  page,
  pageSize,
  stats,
  filters,
}: {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  stats: Stat[];
  filters: { modality?: string; status?: string; q?: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  const [q, setQ] = React.useState(filters.q ?? "");
  const [bulkMsg, setBulkMsg] = React.useState<string | null>(null);

  type TrStats = {
    done: number;
    skipped: number;
    failed: number;
    total: number;     // candidate (non-English) count
    scanned?: number;  // total rows examined during pre-filter
    startedAt?: string;
    finishedAt?: string;
    lastError?: string;
  };
  type EmStats = {
    done: number;
    failed: number;
    total: number;     // un-embedded count at start
    scanned?: number;  // total rows in library
    startedAt?: string;
    finishedAt?: string;
    lastError?: string;
  };
  const [trStatus, setTrStatus] = React.useState<"idle" | "running">("idle");
  const [trStats, setTrStats] = React.useState<TrStats | null>(null);
  const [trBusy, setTrBusy] = React.useState(false);
  const [emStatus, setEmStatus] = React.useState<"idle" | "running">("idle");
  const [emStats, setEmStats] = React.useState<EmStats | null>(null);
  const [emBusy, setEmBusy] = React.useState(false);

  // Poll both bulk-job statuses every 2 seconds. While running we want
  // live counters; while idle one tick keeps the indicator honest.
  React.useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const [tr, em] = await Promise.all([getTranslationStatus(), getEmbeddingStatus()]);
        if (cancelled) return;
        setTrStatus(tr.status);
        setTrStats(tr.stats);
        setEmStatus(em.status);
        setEmStats(em.stats);
      } catch {
        /* ignore poll errors */
      }
    }
    tick();
    const interval = setInterval(tick, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function handleStartEmbed() {
    setEmBusy(true);
    try {
      // Long-running. Fire-and-forget: poll drives UI. Catch the
      // "no_unembedded" rejection up front so we surface a friendly notice.
      void startBulkEmbed().then((r) => {
        if (!r.success) {
          if (r.error === "no_unembedded") {
            setBulkMsg("All prompts are already embedded ✓");
          } else if (r.error) {
            setBulkMsg(`Start error: ${r.error}`);
          }
        }
      });
      setEmStatus("running");
    } finally {
      setTimeout(() => setEmBusy(false), 1000);
    }
  }

  async function handleStopEmbed() {
    setEmBusy(true);
    try {
      await stopBulkEmbed();
      setEmStatus("idle");
    } finally {
      setEmBusy(false);
    }
  }

  async function handleStartTranslate() {
    setTrBusy(true);
    try {
      // startBulkTranslate is long-running — fire and let polling drive UI.
      // We don't await it (it can run for hours); browser keeps the
      // request open in background until server completes / stop is sent.
      void startBulkTranslate().then((r) => {
        if (!r.success && r.error) setBulkMsg(`Start error: ${r.error}`);
      });
      // Immediately reflect "running" without waiting for the next poll.
      setTrStatus("running");
    } finally {
      setTimeout(() => setTrBusy(false), 1000);
    }
  }

  async function handleStopTranslate() {
    setTrBusy(true);
    try {
      await stopBulkTranslate();
      setTrStatus("idle");
    } finally {
      setTrBusy(false);
    }
  }

  function navigate(params: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(params)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    next.delete("page");
    router.push(`/pr/yonet/library?${next.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ q: q || undefined });
  }

  const statsMap = Object.fromEntries(stats.map((s) => [s.status, s.count]));

  return (
    <div className="flex flex-col gap-4">
      {/* Stats bar */}
      <div className="flex gap-3 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => navigate({ status: filters.status === s ? undefined : s })}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              filters.status === s
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-surface hover:bg-surface-2"
            }`}
          >
            {s} <span className="ml-1 opacity-60">{statsMap[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Bulk actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Embedding start/stop pair */}
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2 py-1">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              emStatus === "running" ? "bg-success animate-pulse" : "bg-error"
            }`}
            title={emStatus === "running" ? "Embedding worker running" : "Embedding worker idle"}
            aria-label={emStatus === "running" ? "Running" : "Idle"}
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-7"
            disabled={emBusy || emStatus === "running" || trStatus === "running"}
            onClick={handleStartEmbed}
          >
            <Zap className="h-3.5 w-3.5 mr-1" />
            Start embedding
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-error hover:text-error"
            disabled={emBusy || emStatus !== "running"}
            onClick={handleStopEmbed}
          >
            <Square className="h-3.5 w-3.5 mr-1" />
            Stop
          </Button>
          {emStats && (
            <span className="text-[11px] text-text-muted ml-1 tabular-nums">
              done {emStats.done} · failed {emStats.failed} · queue {emStats.total}
              {typeof emStats.scanned === "number" ? ` · scanned ${emStats.scanned}` : ""}
            </span>
          )}
        </div>

        {/* Translation start/stop pair */}
        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2 py-1">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              trStatus === "running" ? "bg-success animate-pulse" : "bg-error"
            }`}
            title={trStatus === "running" ? "Translation worker running" : "Translation worker idle"}
            aria-label={trStatus === "running" ? "Running" : "Idle"}
          />
          <Button
            size="sm"
            variant="ghost"
            className="h-7"
            disabled={trBusy || trStatus === "running" || emStatus === "running"}
            onClick={handleStartTranslate}
          >
            <Languages className="h-3.5 w-3.5 mr-1" />
            Start translation
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-error hover:text-error"
            disabled={trBusy || trStatus !== "running"}
            onClick={handleStopTranslate}
          >
            <Square className="h-3.5 w-3.5 mr-1" />
            Stop
          </Button>
          {trStats && (
            <span className="text-[11px] text-text-muted ml-1 tabular-nums">
              done {trStats.done} · skipped {trStats.skipped} · failed {trStats.failed} · candidates {trStats.total}
              {typeof trStats.scanned === "number" ? ` · scanned ${trStats.scanned}` : ""}
            </span>
          )}
        </div>

        {emStats?.lastError && (
          <span className="text-[11px] text-error bg-error/10 px-2 py-1 rounded border border-error/30 max-w-md truncate">
            embed error: {emStats.lastError}
          </span>
        )}
        {trStats?.lastError && (
          <span className="text-[11px] text-error bg-error/10 px-2 py-1 rounded border border-error/30 max-w-md truncate">
            translate error: {trStats.lastError}
          </span>
        )}
        {bulkMsg && (
          <span className="text-xs text-text-muted bg-surface-2 px-3 py-1 rounded-lg border border-border">{bulkMsg}</span>
        )}
      </div>

      {/* Filters row */}
      <div className="flex gap-2 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-1">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-faint" />
            <input
              className="h-9 pl-8 pr-3 rounded-md border border-border bg-surface text-sm w-60 focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Search prompts…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <Button type="submit" size="sm" variant="ghost">Search</Button>
        </form>

        <select
          className="h-9 rounded-md border border-border bg-surface px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          value={filters.modality ?? ""}
          onChange={(e) => navigate({ modality: e.target.value || undefined })}
        >
          <option value="">All modalities</option>
          {MODALITIES.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>

        {(filters.q || filters.status || filters.modality) && (
          <Button variant="ghost" size="sm" onClick={() => router.push("/pr/yonet/library")}>
            Clear filters
          </Button>
        )}

        <div className="ml-auto">
          <Link href="/pr/yonet/library/import">
            <Button size="sm">Import prompts</Button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-faint">Prompt</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-faint w-24">Modality</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-faint w-24">Status</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-faint w-16">Score</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-faint w-16">Len</th>
              <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-text-faint w-16">Vec</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-muted text-sm">
                  No prompts found. <Link href="/pr/yonet/library/import" className="text-primary hover:underline">Import some.</Link>
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-border hover:bg-surface-2 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/pr/yonet/library/${row.id}`} className="hover:text-primary transition-colors">
                    <div className="font-medium truncate max-w-[400px]">
                      {row.title ?? <span className="text-text-faint italic">Untitled</span>}
                    </div>
                    <div className="text-xs text-text-muted mt-0.5 truncate max-w-[400px]">
                      {row.source}
                    </div>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-text-muted">{row.modality}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium ${STATUS_COLORS[row.status] ?? ""}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-text-muted">
                  {row.qualityScore != null ? row.qualityScore.toFixed(1) : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-text-muted">
                  {row.contentLength.toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {row.embeddedAt ? (
                    <Zap className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <span className="text-text-faint text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">
            {((page - 1) * pageSize + 1).toLocaleString()}–{Math.min(page * pageSize, total).toLocaleString()} of {total.toLocaleString()}
          </span>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => navigate({ page: String(page - 1) })}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={page >= totalPages}
              onClick={() => navigate({ page: String(page + 1) })}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
