"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  setBlogPostStatus,
} from "@/server/actions/admin-blog";

type BlogStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";

type BlogRow = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  authorEmail: string;
  status: BlogStatus;
  views: number;
  publishedAt: string | null;
  createdAt: string;
};

const STATUS_VARIANT: Record<BlogStatus, "default" | "success" | "warning" | "error"> = {
  DRAFT: "default",
  REVIEW: "warning",
  PUBLISHED: "success",
  ARCHIVED: "error",
};

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 120);
}

export function BlogEditorClient({ posts }: { posts: BlogRow[] }) {
  const [editing, setEditing] = React.useState<BlogRow | "new" | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    const payload = {
      slug: String(fd.get("slug") ?? "").trim(),
      title: String(fd.get("title") ?? "").trim(),
      excerpt: String(fd.get("excerpt") ?? "").trim() || null,
      body: String(fd.get("body") ?? ""),
      status: String(fd.get("status") ?? "DRAFT") as BlogStatus,
    };
    setBusy(true);
    try {
      if (editing === "new") await createBlogPost(payload);
      else await updateBlogPost(editing.id, payload);
      setEditing(null);
    } catch (err) {
      window.alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`"${title}" silinsin mi?`)) return;
    try {
      await deleteBlogPost(id);
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  async function handlePublish(id: string) {
    try {
      await setBlogPostStatus(id, "PUBLISHED");
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="h-3.5 w-3.5" /> New post
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-surface overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-surface-2 border-b border-border">
              {["Title", "Author", "Status", "Views", "Date", ""].map((h, i) => (
                <th key={i} className="px-4 py-3 text-left font-medium text-text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {posts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-text-muted">No posts yet</td>
              </tr>
            ) : (
              posts.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    <div>{p.title}</div>
                    <div className="text-xs text-text-faint">/{p.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{p.authorEmail}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge></td>
                  <td className="px-4 py-3 tabular-nums text-text-muted">{p.views.toLocaleString()}</td>
                  <td className="px-4 py-3 text-text-muted">
                    {p.publishedAt ? new Date(p.publishedAt).toLocaleDateString() : new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {p.status !== "PUBLISHED" && (
                        <button onClick={() => handlePublish(p.id)} className="text-xs text-success hover:underline">Publish</button>
                      )}
                      <button onClick={() => setEditing(p)} className="text-sm text-primary hover:underline">Edit</button>
                      <button onClick={() => handleDelete(p.id, p.title)} className="text-sm text-error hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4" onClick={() => !busy && setEditing(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-5 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold mb-4">{editing === "new" ? "New post" : "Edit post"}</h3>

            <label className="block text-xs text-text-muted mb-1">Title</label>
            <input
              name="title"
              required
              defaultValue={editing === "new" ? "" : editing.title}
              onChange={(e) => {
                const slugInput = (e.currentTarget.form?.elements.namedItem("slug") as HTMLInputElement | null);
                if (slugInput && (editing === "new" || !slugInput.value)) slugInput.value = slugify(e.currentTarget.value);
              }}
              className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm mb-3"
            />

            <label className="block text-xs text-text-muted mb-1">Slug</label>
            <input
              name="slug"
              required
              defaultValue={editing === "new" ? "" : editing.slug}
              className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm mb-3 font-mono"
            />

            <label className="block text-xs text-text-muted mb-1">Excerpt</label>
            <textarea
              name="excerpt"
              defaultValue={editing === "new" ? "" : editing.excerpt ?? ""}
              rows={2}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm mb-3"
            />

            <label className="block text-xs text-text-muted mb-1">Body (Markdown)</label>
            <textarea
              name="body"
              required
              defaultValue={editing === "new" ? "" : editing.body}
              rows={14}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm mb-3 font-mono"
            />

            <label className="block text-xs text-text-muted mb-1">Status</label>
            <select
              name="status"
              defaultValue={editing === "new" ? "DRAFT" : editing.status}
              className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm mb-4"
            >
              <option value="DRAFT">Draft</option>
              <option value="REVIEW">Review</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>

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
