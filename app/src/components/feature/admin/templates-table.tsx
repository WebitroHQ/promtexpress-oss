"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { EditTemplateButton, type TemplateRow } from "./template-dialog";
import { setTemplateStatus } from "@/server/actions/admin-templates";

const MODALITIES = ["text", "image", "code", "audio", "video"] as const;
const STATUSES = ["DRAFT", "REVIEW", "PUBLISHED"] as const;

type Row = TemplateRow & {
  uses30d: number;
  updatedLabel: string;
};

interface Props {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  modality: string;
  status: string;
}

function statusVariant(s: string): "success" | "warning" | "default" {
  if (s === "PUBLISHED") return "success";
  if (s === "REVIEW") return "warning";
  return "default";
}

export function TemplatesTable({
  rows,
  total,
  page,
  pageSize,
  query,
  modality,
  status,
}: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = useState(query);

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(sp.toString());
    if (value && value.length > 0) params.set(key, value);
    else params.delete(key);
    if (key !== "page") params.delete("page");
    router.push(`/pr/yonet/templates?${params.toString()}`);
  };

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setParam("q", q.trim());
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-3">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <form onSubmit={onSearchSubmit} className="flex-1 min-w-[200px]">
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Title veya category ara…"
            className="h-9 w-full rounded-[var(--pe-r-md)] border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20"
          />
        </form>
        <select
          value={modality}
          onChange={(e) => setParam("modality", e.target.value || null)}
          className="h-9 rounded-[var(--pe-r-md)] border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:border-primary"
          aria-label="Filter by modality"
        >
          <option value="">All modalities</option>
          {MODALITIES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setParam("status", e.target.value || null)}
          className="h-9 rounded-[var(--pe-r-md)] border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:border-primary"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-surface-2 border-b border-border">
              {["Template", "Category", "Version", "Uses (30d)", "Updated", "Status", ""].map(
                (h, i) => (
                  <th key={i} className="px-4 py-3 text-left font-medium text-text-muted">
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-text-muted text-sm">
                  No templates found. Adjust filters or create one with "New template".
                </td>
              </tr>
            )}
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-border hover:bg-surface-2 transition-colors">
                <td className="px-4 py-3">
                  <div className="font-medium">{t.title}</div>
                  <div className="text-xs text-text-faint">{t.id}</div>
                </td>
                <td className="px-4 py-3 text-text-muted">
                  {t.category} · {t.modality.charAt(0).toUpperCase() + t.modality.slice(1)}
                </td>
                <td className="px-4 py-3 text-text-muted">{t.version}</td>
                <td className="px-4 py-3 tabular-nums text-text-muted">
                  {t.uses30d.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-text-muted">{t.updatedLabel}</td>
                <td className="px-4 py-3">
                  <StatusBadge id={t.id} status={t.status} />
                </td>
                <td className="px-4 py-3">
                  <EditTemplateButton row={t} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-text-muted">
          <span>
            Page {page} / {totalPages} · Total {total} templates
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setParam("page", String(page - 1))}
              className="px-3 py-1.5 rounded-md border border-border-strong bg-surface text-sm disabled:opacity-50 hover:bg-surface-2"
            >
              ← Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setParam("page", String(page + 1))}
              className="px-3 py-1.5 rounded-md border border-border-strong bg-surface text-sm disabled:opacity-50 hover:bg-surface-2"
            >
              Sonraki →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ id, status }: { id: string; status: TemplateRow["status"] }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useState(status);

  const change = (next: TemplateRow["status"]) => {
    if (next === current) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      try {
        await setTemplateStatus(id, next);
        setCurrent(next);
      } catch {
        // server action throws; revalidate will fix UI on next render
      } finally {
        setOpen(false);
      }
    });
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className="inline-flex items-center cursor-pointer disabled:opacity-50"
        aria-label="Change status"
      >
        <Badge variant={statusVariant(current)}>{current}</Badge>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 right-0 min-w-[140px] rounded-md border border-border bg-surface shadow-lg p-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => change(s)}
                disabled={pending}
                className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface-2 ${
                  s === current ? "font-semibold text-primary" : "text-text-muted"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
