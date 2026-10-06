"use client";

import * as React from "react";
import { Plus, ChevronUp, ChevronDown, Edit2, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
} from "@/server/actions/admin-taxonomy";

const MODALITIES = ["text", "image", "code", "audio", "video", "music"] as const;
type Modality = (typeof MODALITIES)[number];

type CategoryRow = {
  id: string;
  modality: string;
  slug: string;
  name: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  templateCount: number;
  children: CategoryRow[];
};

interface Props {
  groups: { modality: string; total: number; categories: CategoryRow[] }[];
}

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export function TaxonomyClient({ groups }: Props) {
  const [editing, setEditing] = React.useState<CategoryRow | { modality: Modality; parentId: string | null } | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    const fd = new FormData(e.currentTarget);
    const isEdit = "id" in editing;
    const payload = {
      modality: String(fd.get("modality")) as Modality,
      slug: String(fd.get("slug") ?? "").trim(),
      name: String(fd.get("name") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim() || null,
      parentId: (fd.get("parentId") ? String(fd.get("parentId")) : null) || null,
      isActive: fd.get("isActive") === "on",
    };
    setBusy(true);
    try {
      if (isEdit) {
        await updateCategory({ id: (editing as CategoryRow).id, ...payload });
      } else {
        await createCategory(payload);
      }
      setEditing(null);
    } catch (err) {
      window.alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(c: CategoryRow) {
    if (!window.confirm(`Delete "${c.name}"?${c.templateCount > 0 ? ` (${c.templateCount} templates use it — soft delete)` : ""}`)) return;
    try {
      await deleteCategory(c.id);
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  async function handleMove(c: CategoryRow, direction: "up" | "down", siblings: CategoryRow[]) {
    const idx = siblings.findIndex((s) => s.id === c.id);
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= siblings.length) return;
    const newOrder = [...siblings];
    [newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx]!, newOrder[idx]!];
    try {
      await reorderCategories(c.modality, c.parentId, newOrder.map((s) => s.id));
    } catch (e) {
      window.alert((e as Error).message);
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {MODALITIES.map((modality) => {
          const group = groups.find((g) => g.modality === modality);
          const cats = group?.categories ?? [];
          return (
            <div key={modality} className="rounded-xl border border-border bg-surface p-5">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <p className="font-semibold capitalize">{modality}</p>
                  <p className="text-xs text-text-faint">{group?.total ?? 0} templates · {cats.length} categor{cats.length === 1 ? "y" : "ies"}</p>
                </div>
                <button
                  onClick={() => setEditing({ modality, parentId: null })}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add
                </button>
              </div>

              {cats.length === 0 ? (
                <p className="text-xs text-text-faint italic">No categories yet</p>
              ) : (
                <ul className="space-y-1.5">
                  {cats.map((c, i) => (
                    <li key={c.id} className="space-y-1">
                      <div className={`flex items-center justify-between gap-2 p-2 rounded ${c.isActive ? "bg-surface-2" : "bg-surface-2 opacity-50"}`}>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{c.name}</span>
                            <Badge variant="default" className="text-[9px]">{c.templateCount}</Badge>
                            {!c.isActive && <Badge variant="error" className="text-[9px]">inactive</Badge>}
                          </div>
                          {c.description && <p className="text-[11px] text-text-faint">{c.description}</p>}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button onClick={() => handleMove(c, "up", cats)} disabled={i === 0} className="p-1 text-text-muted hover:text-text disabled:opacity-30">
                            <ChevronUp className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleMove(c, "down", cats)} disabled={i === cats.length - 1} className="p-1 text-text-muted hover:text-text disabled:opacity-30">
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setEditing(c)} className="p-1 text-text-muted hover:text-primary">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleDelete(c)} className="p-1 text-text-muted hover:text-error">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setEditing({ modality: modality as Modality, parentId: c.id })}
                            title="Add sub-category"
                            className="p-1 text-text-muted hover:text-primary text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      {c.children.length > 0 && (
                        <ul className="ml-4 space-y-1 border-l border-border pl-3">
                          {c.children.map((ch, j) => (
                            <li key={ch.id} className={`flex items-center justify-between gap-2 p-1.5 rounded text-xs ${ch.isActive ? "" : "opacity-50"}`}>
                              <div className="flex items-center gap-2 min-w-0">
                                <span>{ch.name}</span>
                                <Badge variant="default" className="text-[9px]">{ch.templateCount}</Badge>
                              </div>
                              <div className="flex gap-0.5 shrink-0">
                                <button onClick={() => handleMove(ch, "up", c.children)} disabled={j === 0} className="p-0.5 disabled:opacity-30"><ChevronUp className="h-3 w-3" /></button>
                                <button onClick={() => handleMove(ch, "down", c.children)} disabled={j === c.children.length - 1} className="p-0.5 disabled:opacity-30"><ChevronDown className="h-3 w-3" /></button>
                                <button onClick={() => setEditing(ch)} className="p-0.5"><Edit2 className="h-3 w-3" /></button>
                                <button onClick={() => handleDelete(ch)} className="p-0.5 hover:text-error"><Trash2 className="h-3 w-3" /></button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              <Link href={`/pr/yonet/templates?modality=${modality}`} className="text-xs text-primary hover:underline mt-3 inline-block">
                Manage templates →
              </Link>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-text-faint mt-4">
        Categories are managed in the TaxonomyCategory table. Existing PromptTemplate.category values are auto-linked by seed. Max sub-category depth: 1.
      </p>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4" onClick={() => !busy && setEditing(null)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit} className="bg-surface border border-border rounded-xl p-5 w-full max-w-md">
            <h3 className="font-semibold mb-4">
              {"id" in editing ? `Edit: ${editing.name}` : "New category"}
            </h3>

            <label className="block text-xs text-text-muted mb-1">Modality</label>
            <select
              name="modality"
              required
              defaultValue={"id" in editing ? editing.modality : editing.modality}
              disabled={"id" in editing}
              className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm mb-3 disabled:opacity-60"
            >
              {MODALITIES.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>

            <label className="block text-xs text-text-muted mb-1">Name</label>
            <input
              name="name"
              required
              defaultValue={"id" in editing ? editing.name : ""}
              onChange={(e) => {
                const slugInput = e.currentTarget.form?.elements.namedItem("slug") as HTMLInputElement | null;
                if (slugInput && (!("id" in editing) || !slugInput.value)) slugInput.value = slugify(e.currentTarget.value);
              }}
              className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm mb-3"
            />

            <label className="block text-xs text-text-muted mb-1">Slug</label>
            <input
              name="slug"
              required
              defaultValue={"id" in editing ? editing.slug : ""}
              className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm mb-3 font-mono"
            />

            <label className="block text-xs text-text-muted mb-1">Description</label>
            <textarea
              name="description"
              rows={2}
              defaultValue={"id" in editing ? editing.description ?? "" : ""}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm mb-3"
            />

            {!("id" in editing) && editing.parentId && (
              <input type="hidden" name="parentId" value={editing.parentId} />
            )}

            <label className="flex items-center gap-2 mb-4 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={!("id" in editing) || editing.isActive} />
              Active
            </label>

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
