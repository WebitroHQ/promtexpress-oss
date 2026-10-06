"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createTrainingResource,
  updateTrainingResource,
  deleteTrainingResource,
  setTrainingResourceStatus,
  fetchResourceNow,
} from "@/server/actions/admin-training";

type ResourceRow = {
  id: string;
  type: "URL" | "RSS" | "SITEMAP" | "MANUAL_TEXT" | "UPLOAD";
  url: string | null;
  title: string;
  description: string | null;
  targetPersonaSlugs: string[];
  targetTags: string[];
  refreshPolicy: "MANUAL" | "DAILY" | "WEEKLY" | "MONTHLY";
  status: "ACTIVE" | "PAUSED" | "ERROR" | "ARCHIVED";
  lastFetchedAt: string | null;
  snapshotCount: number;
  distillationCount: number;
};

export function TrainingResourcesClient({ resources }: { resources: ResourceRow[] }) {
  const [editing, setEditing] = React.useState<ResourceRow | "new" | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [fetchingId, setFetchingId] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    const payload = {
      type: fd.get("type") as ResourceRow["type"],
      url: String(fd.get("url") ?? "").trim() || null,
      title: String(fd.get("title") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim() || null,
      targetPersonaSlugs: String(fd.get("targetPersonaSlugs") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      targetTags: String(fd.get("targetTags") ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      refreshPolicy: fd.get("refreshPolicy") as ResourceRow["refreshPolicy"],
    };
    setBusy(true);
    try {
      if (editing === "new") await createTrainingResource(payload);
      else await updateTrainingResource(editing.id, payload);
      setEditing(null);
    } catch (err) {
      window.alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`"${title}" silinsin mi? (snapshots & distillations cascade silinir)`)) return;
    try {
      await deleteTrainingResource(id);
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  async function handleFetchNow(id: string) {
    setFetchingId(id);
    try {
      const r = await fetchResourceNow(id);
      window.alert(
        `Done.\nSnapshots: new=${r.snapshotsNew}, existing=${r.snapshotsExisting}\nDistillations: ${r.distillationsCreated}\nDuration: ${r.durationMs}ms`,
      );
    } catch (e) {
      window.alert(`Error: ${(e as Error).message}`);
    } finally {
      setFetchingId(null);
    }
  }

  async function handleToggle(id: string, current: ResourceRow["status"]) {
    const next = current === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      await setTrainingResourceStatus(id, next);
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  return (
    <>
      <div className="flex justify-between mb-3">
        <Link href="/pr/yonet/training/distillations" className="text-sm text-primary hover:underline self-center">
          Distillation queue →
        </Link>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="h-3.5 w-3.5" /> New resource
        </Button>
      </div>

      {resources.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-text-muted">
            No training resources yet. Add one above.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {resources.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold flex items-center gap-2 flex-wrap">
                      {r.title}
                      <Badge variant="default">{r.type}</Badge>
                      <Badge variant="outline">{r.refreshPolicy}</Badge>
                      {r.status !== "ACTIVE" && <Badge variant="error">{r.status}</Badge>}
                    </h3>
                    {r.url && (
                      <a href={r.url} target="_blank" rel="noopener" className="text-xs text-primary hover:underline">
                        {r.url}
                      </a>
                    )}
                    {r.description && <p className="text-xs text-text-muted mt-1">{r.description}</p>}
                    <p className="text-[11px] text-text-faint mt-2">
                      {r.snapshotCount} snapshot · {r.distillationCount} distillations · last fetch:{" "}
                      {r.lastFetchedAt ? new Date(r.lastFetchedAt).toLocaleString("en-US") : "never"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      onClick={() => handleFetchNow(r.id)}
                      disabled={fetchingId === r.id}
                      className="text-xs text-primary hover:underline disabled:opacity-50"
                    >
                      {fetchingId === r.id ? "Fetching…" : "Fetch now"}
                    </button>
                    <button onClick={() => setEditing(r)} className="text-xs text-text-muted hover:text-text">Edit</button>
                    <button onClick={() => handleToggle(r.id, r.status)} className="text-xs text-text-muted hover:text-text">
                      {r.status === "ACTIVE" ? "Pause" : "Activate"}
                    </button>
                    <button onClick={() => handleDelete(r.id, r.title)} className="text-xs text-error hover:underline">Delete</button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4" onClick={() => !busy && setEditing(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-5 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-4">{editing === "new" ? "New training resource" : `Edit: ${editing.title}`}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">Type</label>
                <select name="type" required defaultValue={editing === "new" ? "URL" : editing.type} className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm">
                  <option value="URL">URL</option>
                  <option value="RSS">RSS</option>
                  <option value="SITEMAP">Sitemap</option>
                  <option value="MANUAL_TEXT">Manual text</option>
                  <option value="UPLOAD">Upload</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Refresh</label>
                <select name="refreshPolicy" required defaultValue={editing === "new" ? "MANUAL" : editing.refreshPolicy} className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm">
                  <option value="MANUAL">Manual</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>
            </div>

            <label className="block text-xs text-text-muted mb-1">Title</label>
            <input name="title" required defaultValue={editing === "new" ? "" : editing.title} className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm mb-3" />

            <label className="block text-xs text-text-muted mb-1">URL</label>
            <input name="url" defaultValue={editing === "new" ? "" : editing.url ?? ""} className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm mb-3 font-mono" />

            <label className="block text-xs text-text-muted mb-1">Description</label>
            <textarea name="description" rows={2} defaultValue={editing === "new" ? "" : editing.description ?? ""} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm mb-3" />

            <label className="block text-xs text-text-muted mb-1">Target persona slugs (comma-separated)</label>
            <input name="targetPersonaSlugs" defaultValue={editing === "new" ? "" : editing.targetPersonaSlugs.join(", ")} className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm mb-3" />

            <label className="block text-xs text-text-muted mb-1">Tags (comma-separated)</label>
            <input name="targetTags" defaultValue={editing === "new" ? "" : editing.targetTags.join(", ")} className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm mb-4" />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
              <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
