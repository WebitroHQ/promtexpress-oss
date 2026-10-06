"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  sendTestEmail,
} from "@/server/actions/admin-emails";

type EmailRow = {
  id: string;
  slug: string;
  locale: string;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
  isActive: boolean;
  sentCount: number;
  updatedAt: string;
};

export function EmailEditorClient({ templates }: { templates: EmailRow[] }) {
  const [editing, setEditing] = React.useState<EmailRow | "new" | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    const payload = {
      slug: String(fd.get("slug") ?? "").trim(),
      locale: String(fd.get("locale") ?? "en").trim(),
      subject: String(fd.get("subject") ?? "").trim(),
      bodyHtml: String(fd.get("bodyHtml") ?? ""),
      bodyText: String(fd.get("bodyText") ?? ""),
      isActive: fd.get("isActive") === "on",
    };
    setBusy(true);
    try {
      if (editing === "new") await createEmailTemplate(payload);
      else await updateEmailTemplate(editing.id, payload);
      setEditing(null);
    } catch (err) {
      window.alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSendTest(slug: string, locale: string) {
    const to = window.prompt(`Send test email (${slug} / ${locale}) — recipient email:`, "");
    if (!to || !to.trim()) return;
    try {
      const result = await sendTestEmail({ slug, locale, to: to.trim() });
      if (result.ok) {
        window.alert(`Test email sent: ${to.trim()}`);
      } else {
        window.alert(`Send failed: ${result.reason}`);
      }
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  async function handleDelete(id: string, slug: string) {
    if (!window.confirm(`Delete template "${slug}"?`)) return;
    try {
      await deleteEmailTemplate(id);
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  // Group by slug → languages
  const grouped = templates.reduce<Record<string, EmailRow[]>>((acc, t) => {
    (acc[t.slug] ??= []).push(t);
    return acc;
  }, {});

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="h-3.5 w-3.5" /> New email
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-surface-2 border-b border-border">
              {["Template", "Locales", "Active", "Sent", "Last edited", ""].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left font-medium text-text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(grouped).length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">
                  No templates yet. Seed needs to be run: <code className="text-[11px] bg-surface-2 px-1 py-0.5 rounded">prisma/seed.sql</code>
                </td>
              </tr>
            ) : (
              Object.entries(grouped).map(([slug, items]) => {
                const first = items[0]!;
                const totalSent = items.reduce((s, i) => s + i.sentCount, 0);
                const lastEdited = items.map((i) => new Date(i.updatedAt)).sort((a, b) => b.getTime() - a.getTime())[0]!;
                return (
                  <tr key={slug} className="border-t border-border hover:bg-surface-2">
                    <td className="px-4 py-3">
                      <div className="font-medium">{first.slug}</div>
                      <div className="text-xs text-text-faint">{first.subject}</div>
                    </td>
                    <td className="px-4 py-3 text-text-muted">
                      <div className="flex gap-1 flex-wrap">
                        {items.map((i) => (
                          <button key={i.id} onClick={() => setEditing(i)} className="cursor-pointer">
                            <Badge variant={i.isActive ? "success" : "default"}>{i.locale}</Badge>
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={items.some((i) => i.isActive) ? "success" : "error"}>
                        {items.filter((i) => i.isActive).length}/{items.length}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-text-muted">{totalSent.toLocaleString()}</td>
                    <td className="px-4 py-3 text-text-muted">{lastEdited.toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setPreview(first.bodyHtml)} className="text-sm text-text-muted hover:text-text mr-2">Preview</button>
                      <button onClick={() => handleSendTest(first.slug, first.locale)} className="text-sm text-success hover:underline mr-2">Send test</button>
                      <button onClick={() => setEditing(first)} className="text-sm text-primary hover:underline mr-2">Edit</button>
                      <button onClick={() => handleDelete(first.id, first.slug)} className="text-sm text-error hover:underline">Delete</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4" onClick={() => !busy && setEditing(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-5 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-4">{editing === "new" ? "New email template" : `Edit: ${editing.slug} / ${editing.locale}`}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs text-text-muted mb-1">Slug</label>
                <input name="slug" required defaultValue={editing === "new" ? "" : editing.slug} className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm font-mono" />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1">Locale</label>
                <input name="locale" required defaultValue={editing === "new" ? "en" : editing.locale} className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm font-mono" />
              </div>
            </div>

            <label className="block text-xs text-text-muted mb-1">Subject</label>
            <input name="subject" required defaultValue={editing === "new" ? "" : editing.subject} className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm mb-3" />

            <label className="block text-xs text-text-muted mb-1">HTML body</label>
            <textarea name="bodyHtml" required defaultValue={editing === "new" ? "" : editing.bodyHtml} rows={10} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm mb-3 font-mono" />

            <label className="block text-xs text-text-muted mb-1">Plain text fallback</label>
            <textarea name="bodyText" defaultValue={editing === "new" ? "" : editing.bodyText ?? ""} rows={4} className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm mb-3" />

            <label className="flex items-center gap-2 mb-4 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={editing === "new" ? true : editing.isActive} />
              Active
            </label>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setEditing(null)} disabled={busy}>Cancel</Button>
              <Button type="submit" size="sm" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
            </div>
          </form>
        </div>
      )}

      {preview !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4" onClick={() => setPreview(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-surface border border-border rounded-xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-3">Preview</h3>
            <div className="bg-white text-black rounded p-4 text-sm" dangerouslySetInnerHTML={{ __html: preview }} />
            <div className="flex justify-end mt-4">
              <Button size="sm" variant="secondary" onClick={() => setPreview(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
