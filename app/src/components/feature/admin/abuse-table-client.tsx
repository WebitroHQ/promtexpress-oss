"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createAbuseReport,
  updateAbuseReportStatus,
  deleteAbuseReport,
} from "@/server/actions/admin-abuse";

type ReportRow = {
  id: string;
  reporterEmail: string | null;
  type: "SPAM" | "POLICY_VIOLATION" | "RATE_LIMIT" | "BUG" | "OTHER";
  severity: "LOW" | "MED" | "HIGH" | "CRITICAL";
  targetType: string;
  targetId: string;
  description: string | null;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";
  createdAt: string;
};

const SEVERITY_VARIANT: Record<ReportRow["severity"], "error" | "warning" | "default"> = {
  CRITICAL: "error",
  HIGH: "error",
  MED: "warning",
  LOW: "default",
};

const STATUS_VARIANT: Record<ReportRow["status"], "error" | "warning" | "success" | "default"> = {
  OPEN: "error",
  INVESTIGATING: "warning",
  RESOLVED: "success",
  DISMISSED: "default",
};

function relTime(iso: string): string {
  const sec = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function AbuseTableClient({ reports }: { reports: ReportRow[] }) {
  const [showNew, setShowNew] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await createAbuseReport({
        type: fd.get("type") as ReportRow["type"],
        severity: fd.get("severity") as ReportRow["severity"],
        targetType: String(fd.get("targetType")),
        targetId: String(fd.get("targetId")),
        description: String(fd.get("description") ?? ""),
      });
      setShowNew(false);
    } catch (err) {
      window.alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusChange(id: string, status: ReportRow["status"]) {
    try {
      await updateAbuseReportStatus(id, status);
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Bu raporu sil?")) return;
    try {
      await deleteAbuseReport(id);
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => setShowNew(true)}>
          <Plus className="h-3.5 w-3.5" /> New report
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-surface-2 border-b border-border">
              {["ID", "Type", "Severity", "Target", "Reporter", "When", "Status", ""].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left font-medium text-text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-text-muted">No reports yet</td></tr>
            ) : (
              reports.map((r) => (
                <tr key={r.id} className="border-t border-border hover:bg-surface-2">
                  <td className="px-4 py-3 tabular-nums font-mono text-xs">{r.id.slice(0, 8)}</td>
                  <td className="px-4 py-3 text-text-muted">{r.type}</td>
                  <td className="px-4 py-3"><Badge variant={SEVERITY_VARIANT[r.severity]}>{r.severity}</Badge></td>
                  <td className="px-4 py-3 text-text-muted">{r.targetType}:{r.targetId.slice(0, 12)}</td>
                  <td className="px-4 py-3 text-text-muted">{r.reporterEmail ?? "—"}</td>
                  <td className="px-4 py-3 text-text-muted">{relTime(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={r.status}
                      onChange={(e) => handleStatusChange(r.id, e.target.value as ReportRow["status"])}
                      className="h-7 rounded border border-border bg-surface px-2 text-xs"
                    >
                      <option value="OPEN">Open</option>
                      <option value="INVESTIGATING">Investigating</option>
                      <option value="RESOLVED">Resolved</option>
                      <option value="DISMISSED">Dismissed</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(r.id)} className="text-sm text-error hover:underline">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4" onClick={() => !busy && setShowNew(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleCreate} className="bg-surface border border-border rounded-xl p-5 w-full max-w-md">
            <h3 className="font-semibold mb-4">New abuse report</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">Type</label>
                <select name="type" required className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm">
                  <option value="SPAM">Spam</option>
                  <option value="POLICY_VIOLATION">Policy violation</option>
                  <option value="RATE_LIMIT">Rate limit</option>
                  <option value="BUG">Bug</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Severity</label>
                <select name="severity" required defaultValue="LOW" className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm">
                  <option value="LOW">Low</option>
                  <option value="MED">Med</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">Target type</label>
                <input name="targetType" required placeholder="user / apikey / prompt" className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Target ID</label>
                <input name="targetId" required className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm font-mono" />
              </div>
            </div>
            <label className="block text-xs text-text-muted mb-1">Description</label>
            <textarea name="description" rows={3} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm mb-4" />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowNew(false)} disabled={busy}>Cancel</Button>
              <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
