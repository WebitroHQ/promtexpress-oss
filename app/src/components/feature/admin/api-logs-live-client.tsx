"use client";

import * as React from "react";
import { Pause, Play, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchApiLogs, type ApiLogRow } from "@/server/actions/admin-api-logs";

interface Props {
  initial: {
    rows: ApiLogRow[];
    total24h: number;
    errors24h: number;
    hourlyBuckets: { hour: string; count: number; errors: number }[];
  };
}

function statusVariant(code: number): "success" | "warning" | "error" {
  if (code >= 500) return "error";
  if (code >= 400) return "warning";
  return "success";
}

const POLL_MS = 5000;

export function ApiLogsLiveClient({ initial }: Props) {
  const [rows, setRows] = React.useState<ApiLogRow[]>(initial.rows);
  const [total24h, setTotal24h] = React.useState(initial.total24h);
  const [errors24h, setErrors24h] = React.useState(initial.errors24h);
  const [hourly, setHourly] = React.useState(initial.hourlyBuckets);
  const [paused, setPaused] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<"all" | "2xx" | "3xx" | "4xx" | "5xx">("all");
  const [pathFilter, setPathFilter] = React.useState("");
  const [userFilter, setUserFilter] = React.useState("");

  const refresh = React.useCallback(async () => {
    try {
      const data = await fetchApiLogs({
        status: statusFilter,
        path: pathFilter || undefined,
        user: userFilter || undefined,
      });
      setRows(data.rows);
      setTotal24h(data.total24h);
      setErrors24h(data.errors24h);
      setHourly(data.hourlyBuckets);
    } catch (e) {
      console.error("[api-logs] refresh failed:", e);
    }
  }, [statusFilter, pathFilter, userFilter]);

  React.useEffect(() => {
    if (paused) return;
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, [paused, refresh]);

  // Re-fetch when filters change
  React.useEffect(() => {
    refresh();
  }, [statusFilter, pathFilter, userFilter, refresh]);

  const maxBucket = Math.max(1, ...hourly.map((b) => b.count));

  return (
    <>
      {/* KPI bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted mb-1">24h calls</p>
          <p className="text-[24px] font-semibold tabular-nums">{total24h.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs text-text-muted mb-1">24h errors</p>
          <p className={`text-[24px] font-semibold tabular-nums ${errors24h > 0 ? "text-error" : ""}`}>{errors24h.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 col-span-2">
          <p className="text-xs text-text-muted mb-1">Last 24h (hourly)</p>
          <div className="flex items-end gap-0.5 h-10">
            {Array.from({ length: 24 }).map((_, i) => {
              const target = new Date(Date.now() - (23 - i) * 3600000);
              target.setMinutes(0, 0, 0);
              const bucket = hourly.find((h) => new Date(h.hour).getTime() === target.getTime());
              const count = bucket?.count ?? 0;
              const errors = bucket?.errors ?? 0;
              const height = (count / maxBucket) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 bg-surface-2 rounded-sm flex flex-col-reverse"
                  title={`${target.toLocaleString()} — ${count} (${errors} err)`}
                  style={{ minHeight: "1px" }}
                >
                  {errors > 0 && (
                    <div className="bg-error" style={{ height: `${(errors / maxBucket) * 100}%` }} />
                  )}
                  <div className="bg-primary" style={{ height: `${height}%` }} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter + controls */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="h-8 rounded-md border border-border bg-surface px-2 text-sm"
        >
          <option value="all">All status</option>
          <option value="2xx">2xx OK</option>
          <option value="3xx">3xx Redirect</option>
          <option value="4xx">4xx Client</option>
          <option value="5xx">5xx Server</option>
        </select>
        <input
          value={pathFilter}
          onChange={(e) => setPathFilter(e.target.value)}
          placeholder="Path contains…"
          className="h-8 rounded-md border border-border bg-surface px-3 text-sm w-[180px]"
        />
        <input
          value={userFilter}
          onChange={(e) => setUserFilter(e.target.value)}
          placeholder="User email / key prefix…"
          className="h-8 rounded-md border border-border bg-surface px-3 text-sm w-[200px]"
        />
        <Button variant="secondary" size="sm" onClick={refresh}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setPaused(!paused)}>
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          {paused ? "Resume" : "Pause"}
        </Button>
        <span className={`text-xs ${paused ? "text-warning" : "text-success"}`}>
          {paused ? "Paused" : `Live · ${POLL_MS / 1000}s`}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-surface-2 border-b border-border">
              {["Time", "Method", "Path", "Caller", "Status", "Latency"].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left font-medium text-text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">No results</td></tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="border-t border-border hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{new Date(c.createdAt).toLocaleTimeString()}</td>
                  <td className="px-4 py-3"><Badge variant="primary" className="text-[10px] font-mono">{c.method}</Badge></td>
                  <td className="px-4 py-3 font-mono text-xs">{c.path}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {c.userEmail ?? (c.apiKeyPrefix ? `${c.apiKeyPrefix}…` : "—")}
                  </td>
                  <td className="px-4 py-3"><Badge variant={statusVariant(c.status)}>{c.status}</Badge></td>
                  <td className="px-4 py-3 tabular-nums text-text-muted">{c.latencyMs} ms</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
