"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  UserCircle2,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Power,
  Search,
  Download,
  Upload,
  AlertTriangle,
  Eye,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  createPersona,
  updatePersona,
  deletePersona,
  togglePersonaActive,
  reorderPersonas,
  exportPersonas,
  importPersonas,
  type PersonaInput,
} from "@/server/actions/admin-personas";
import { renderPersonaSection } from "@/lib/personas/render";
import { lintPersona, findDuplicateSlugRisks, type PersonaLintIssue } from "@/lib/personas/lint";

export interface PersonaRow {
  id: string;
  domainSlug: string;
  name: string;
  body: string;
  jargon: string[];
  frameworks: string[];
  antiPatterns: string[];
  notes: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
  usageCount: number;
  avgQuality: number | null;
}

interface Props {
  personas: PersonaRow[];
  orphanDomains: string[];
}

const EMPTY_FORM: PersonaInput = {
  domainSlug: "",
  name: "",
  body: "",
  jargon: [],
  frameworks: [],
  antiPatterns: [],
  notes: null,
  isActive: true,
};

export function PersonasClient({ personas: initial, orphanDomains }: Props) {
  const [personas, setPersonas] = React.useState(initial);
  React.useEffect(() => setPersonas(initial), [initial]);

  const [q, setQ] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<"all" | "active" | "inactive">("all");

  const [editing, setEditing] = React.useState<PersonaRow | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [deletingTarget, setDeletingTarget] = React.useState<PersonaRow | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const ql = q.trim().toLowerCase();
    return personas.filter((p) => {
      if (activeFilter === "active" && !p.isActive) return false;
      if (activeFilter === "inactive" && p.isActive) return false;
      if (!ql) return true;
      return (
        p.name.toLowerCase().includes(ql) ||
        p.domainSlug.toLowerCase().includes(ql) ||
        p.body.toLowerCase().includes(ql)
      );
    });
  }, [personas, q, activeFilter]);

  const dupRisks = React.useMemo(
    () => findDuplicateSlugRisks(personas.map((p) => p.domainSlug)),
    [personas],
  );

  const dupMap = React.useMemo(() => {
    const m = new Map<string, string[]>();
    for (const r of dupRisks) {
      m.set(r.a, [...(m.get(r.a) ?? []), r.b]);
      m.set(r.b, [...(m.get(r.b) ?? []), r.a]);
    }
    return m;
  }, [dupRisks]);

  async function handleToggle(p: PersonaRow) {
    setBusy(p.id);
    try {
      await togglePersonaActive(p.id, !p.isActive);
      toast.success(`${p.name} ${!p.isActive ? "aktif" : "pasif"} edildi`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Hata");
    } finally {
      setBusy(null);
    }
  }

  async function handleMove(p: PersonaRow, dir: -1 | 1) {
    const sorted = [...personas].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((x) => x.id === p.id);
    const ni = idx + dir;
    if (ni < 0 || ni >= sorted.length) return;
    const swapped = [...sorted];
    [swapped[idx], swapped[ni]] = [swapped[ni], swapped[idx]];
    setBusy(p.id);
    try {
      await reorderPersonas(swapped.map((x) => x.id));
      toast.success("Order updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(force: boolean) {
    if (!deletingTarget) return;
    setBusy(deletingTarget.id);
    try {
      const res = await deletePersona(deletingTarget.id, force);
      toast.success(
        res.mode === "soft"
          ? `${deletingTarget.name} deactivated (used ${res.used} times)`
          : `${deletingTarget.name} deleted`,
      );
      setDeletingTarget(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(null);
    }
  }

  async function handleExport() {
    try {
      const data = await exportPersonas();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `personas-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${data.length} personas exported`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export error");
    }
  }

  return (
    <div className="space-y-4">
      {/* Lint summary + Orphan rapor */}
      {(orphanDomains.length > 0 || dupRisks.length > 0) && (
        <Card className="border-warning/40 bg-warning/5">
          <CardContent className="p-4 text-sm space-y-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                {orphanDomains.length > 0 && (
                  <div>
                    <span className="font-medium">Orphan domains:</span> Intent analyzer produced these domains in the last 30 days
                    but no persona exists —{" "}
                    <span className="font-mono text-[12px]">{orphanDomains.join(", ")}</span>
                  </div>
                )}
                {dupRisks.length > 0 && (
                  <div>
                    <span className="font-medium">Duplicate slug risk:</span>{" "}
                    {dupRisks
                      .slice(0, 5)
                      .map((r) => `${r.a} ↔ ${r.b}`)
                      .join(" · ")}
                    {dupRisks.length > 5 && ` (+${dupRisks.length - 5})`}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name, slug, or body…"
            className="pl-9"
          />
        </div>
        <select
          value={activeFilter}
          onChange={(e) => setActiveFilter(e.target.value as typeof activeFilter)}
          className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" />
            Import
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Persona
          </Button>
        </div>
      </div>

      {/* Liste */}
      {personas.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={UserCircle2}
              title="No personas yet"
              description="Create the first expert persona to give the Synthesizer domain knowledge. You can also bulk-import from a seed file."
              action={
                <div className="flex gap-2">
                  <Button onClick={() => setCreating(true)}>
                    <Plus className="h-4 w-4 mr-1.5" /> Add First Persona
                  </Button>
                  <Button variant="outline" onClick={() => setImportOpen(true)}>
                    <Upload className="h-4 w-4 mr-1.5" /> JSON Import
                  </Button>
                </div>
              }
            />
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-text-muted">
            No personas match the filter.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((p) => (
            <PersonaCard
              key={p.id}
              p={p}
              dupOf={dupMap.get(p.domainSlug) ?? []}
              busy={busy === p.id}
              onEdit={() => setEditing(p)}
              onDelete={() => setDeletingTarget(p)}
              onToggle={() => handleToggle(p)}
              onMoveUp={() => handleMove(p, -1)}
              onMoveDown={() => handleMove(p, 1)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit drawer */}
      {(creating || editing) && (
        <PersonaFormDrawer
          open={creating || !!editing}
          onOpenChange={(open) => {
            if (!open) {
              setCreating(false);
              setEditing(null);
            }
          }}
          initial={editing ? toFormInput(editing) : EMPTY_FORM}
          mode={editing ? "edit" : "create"}
          editingMeta={editing}
          onSubmit={async (input) => {
            try {
              if (editing) {
                await updatePersona(editing.id, input);
                toast.success(`${input.name} updated`);
              } else {
                await createPersona(input);
                toast.success(`${input.name} added`);
              }
              setCreating(false);
              setEditing(null);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Save error");
              throw e;
            }
          }}
        />
      )}

      {/* Delete confirm */}
      {deletingTarget && (
        <ConfirmDialog
          open={!!deletingTarget}
          onOpenChange={(open) => !open && setDeletingTarget(null)}
          title={`Delete '${deletingTarget.name}'?`}
          description={
            deletingTarget.usageCount > 0
              ? `This persona was used in ${deletingTarget.usageCount} prompt generations. Default: deactivate (soft delete) — historical traces are preserved. Use the "Delete completely" button below for hard delete.`
              : "This persona has never been used. It will be deleted completely."
          }
          confirmLabel={deletingTarget.usageCount > 0 ? "Deactivate" : "Delete"}
          destructive
          onConfirm={() => handleDelete(false)}
        />
      )}

      {/* Import dialog */}
      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSubmit={async (items, mode) => {
          const res = await importPersonas({ items, mode });
          toast.success(
            `Import: ${res.created} new · ${res.updated} updated · ${res.skipped} skipped`,
          );
          setImportOpen(false);
        }}
      />
    </div>
  );
}

function toFormInput(p: PersonaRow): PersonaInput {
  return {
    domainSlug: p.domainSlug,
    name: p.name,
    body: p.body,
    jargon: p.jargon,
    frameworks: p.frameworks,
    antiPatterns: p.antiPatterns,
    notes: p.notes,
    isActive: p.isActive,
  };
}

// ── Persona Card ─────────────────────────────────────────────

function PersonaCard({
  p,
  dupOf,
  busy,
  onEdit,
  onDelete,
  onToggle,
  onMoveUp,
  onMoveDown,
}: {
  p: PersonaRow;
  dupOf: string[];
  busy: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const issues = lintPersona(p);
  const warnCount = issues.filter((i) => i.severity === "warn").length;

  return (
    <Card className={!p.isActive ? "opacity-60" : ""}>
      <CardContent className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold truncate">{p.name}</h3>
              {!p.isActive && <Badge variant="outline">inactive</Badge>}
              {warnCount > 0 && (
                <Badge variant="outline" className="border-warning/50 text-warning">
                  {warnCount} warnings
                </Badge>
              )}
              {dupOf.length > 0 && (
                <Badge variant="outline" className="border-warning/50 text-warning">
                  similar: {dupOf.join(", ")}
                </Badge>
              )}
            </div>
            <code className="text-[11px] text-text-faint">{p.domainSlug}</code>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" onClick={onMoveUp} disabled={busy} title="Move up">
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onMoveDown} disabled={busy} title="Move down">
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <p className="text-[12px] text-text-muted line-clamp-2">{p.body}</p>

        <div className="flex flex-wrap gap-1">
          {p.jargon.slice(0, 3).map((j) => (
            <span key={j} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-2 text-text-muted">
              {j}
            </span>
          ))}
          {p.jargon.length > 3 && (
            <span className="text-[10px] text-text-faint">+{p.jargon.length - 3} jargon</span>
          )}
          {p.frameworks.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary-soft text-primary">
              {p.frameworks.length} framework
            </span>
          )}
          {p.antiPatterns.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-error/15 text-error">
              {p.antiPatterns.length} anti-pattern
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-[11px] text-text-faint pt-1 border-t border-border">
          <div className="flex gap-3">
            <span>
              30d uses: <strong className="text-text-muted">{p.usageCount}</strong>
            </span>
            {p.avgQuality !== null && (
              <span>
                avg quality: <strong className="text-text-muted">{p.avgQuality.toFixed(2)}</strong>
              </span>
            )}
            <span>order: {p.sortOrder}</span>
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" onClick={onToggle} disabled={busy} title={p.isActive ? "Deactivate" : "Activate"}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={onEdit} disabled={busy} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDelete} disabled={busy} title="Delete">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Form Drawer ─────────────────────────────────────────────

function PersonaFormDrawer({
  open,
  onOpenChange,
  initial,
  mode,
  editingMeta,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: PersonaInput;
  mode: "create" | "edit";
  editingMeta: PersonaRow | null;
  onSubmit: (input: PersonaInput) => Promise<void>;
}) {
  const [form, setForm] = React.useState<PersonaInput>(initial);
  const [pending, setPending] = React.useState(false);
  React.useEffect(() => {
    if (open) setForm(initial);
  }, [open, initial]);

  const issues = lintPersona({
    domainSlug: form.domainSlug,
    body: form.body,
    jargon: form.jargon,
    frameworks: form.frameworks,
    antiPatterns: form.antiPatterns,
  });

  async function submit() {
    setPending(true);
    try {
      await onSubmit(form);
    } catch {
      // toast handled upstream
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "New Persona" : `Edit: ${initial.name}`}</SheetTitle>
          <SheetDescription>
            Injected into the Synthesizer's system prompt when <code>intent.domain</code> = <code>domainSlug</code>.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="edit" className="mt-4">
          <TabsList>
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              Synthesizer Preview
            </TabsTrigger>
            {mode === "edit" && editingMeta && <TabsTrigger value="usage">Usage</TabsTrigger>}
          </TabsList>

          <TabsContent value="edit" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="domainSlug">Domain Slug *</Label>
                <Input
                  id="domainSlug"
                  value={form.domainSlug}
                  onChange={(e) => setForm({ ...form, domainSlug: e.target.value.toLowerCase() })}
                  placeholder="e.g. seo-content, copywriting"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Senior SEO Strategist"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="body">Body * (expertise definition)</Label>
                <span className="text-[11px] text-text-faint">{form.body.length} / 4000</span>
              </div>
              <Textarea
                id="body"
                rows={8}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="You are a senior X who..."
              />
            </div>

            <TagListInput
              label="Jargon"
              hint="Domain terms the Synthesizer can use"
              values={form.jargon}
              onChange={(jargon) => setForm({ ...form, jargon })}
            />
            <TagListInput
              label="Frameworks"
              hint="Mental models / methodologies (e.g. AIDA, RICE, STAR)"
              values={form.frameworks}
              onChange={(frameworks) => setForm({ ...form, frameworks })}
            />
            <TagListInput
              label="Anti-Patterns"
              hint="Patterns to avoid in this domain"
              values={form.antiPatterns}
              onChange={(antiPatterns) => setForm({ ...form, antiPatterns })}
            />

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                rows={2}
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={form.isActive}
                onCheckedChange={(c) => setForm({ ...form, isActive: c })}
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active
              </Label>
            </div>

            {issues.length > 0 && (
              <div className="rounded-md border border-warning/30 bg-warning/5 p-3 space-y-1">
                {issues.map((i) => (
                  <LintLine key={i.code} issue={i} />
                ))}
              </div>
            )}

            {editingMeta && (
              <div className="text-[11px] text-text-faint border-t border-border pt-3">
                Last edited by: {editingMeta.updatedBy ?? "—"} · Updated: {new Date(editingMeta.updatedAt).toLocaleString()}
              </div>
            )}

            <div className="flex gap-2 sticky bottom-0 bg-surface pt-3 border-t border-border">
              <Button onClick={submit} disabled={pending}>
                {pending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
                {mode === "create" ? "Create" : "Save"}
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>
                Cancel
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="pt-4">
            <p className="text-[12px] text-text-muted mb-2">
              The block below is added <strong>verbatim</strong> to the Synthesizer's system prompt
              (source: <code className="text-[11px]">3-context-assembly.ts</code> → <code className="text-[11px]">renderPersonaSection</code>):
            </p>
            <pre className="text-[11px] bg-surface-2 border border-border rounded-md p-3 overflow-x-auto whitespace-pre-wrap">
              {form.name && form.body
                ? renderPersonaSection({
                    name: form.name,
                    body: form.body,
                    jargon: form.jargon,
                    frameworks: form.frameworks,
                    antiPatterns: form.antiPatterns,
                  })
                : "(Enter name + body first)"}
            </pre>
          </TabsContent>

          {mode === "edit" && editingMeta && (
            <TabsContent value="usage" className="pt-4 space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-md border border-border p-3">
                  <div className="text-[11px] text-text-muted">Last 30 days usage</div>
                  <div className="text-2xl font-semibold">{editingMeta.usageCount}</div>
                </div>
                <div className="rounded-md border border-border p-3">
                  <div className="text-[11px] text-text-muted">Average Quality Score</div>
                  <div className="text-2xl font-semibold">
                    {editingMeta.avgQuality !== null ? editingMeta.avgQuality.toFixed(2) : "—"}
                  </div>
                </div>
              </div>
              <p className="text-[12px] text-text-muted">
                For detailed traces use the <a className="text-primary underline" href="/pr/yonet/traces">/pr/yonet/traces</a> page.
              </p>
            </TabsContent>
          )}
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function LintLine({ issue }: { issue: PersonaLintIssue }) {
  return (
    <div className="text-[12px] flex gap-1.5">
      <span className={issue.severity === "warn" ? "text-warning" : "text-text-muted"}>•</span>
      <span className={issue.severity === "warn" ? "text-warning" : "text-text-muted"}>{issue.message}</span>
    </div>
  );
}

// ── Tag list input (chip editor) ────────────────────────────

function TagListInput({
  label,
  hint,
  values,
  onChange,
}: {
  label: string;
  hint?: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [input, setInput] = React.useState("");

  function add(raw: string) {
    const next = raw
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (next.length === 0) return;
    onChange([...values, ...next.filter((v) => !values.includes(v))]);
    setInput("");
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {hint && <p className="text-[11px] text-text-faint">{hint}</p>}
      <div className="flex flex-wrap gap-1 p-2 rounded-md border border-border bg-surface min-h-[40px]">
        {values.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className="text-[11px] px-1.5 py-0.5 rounded bg-surface-2 inline-flex items-center gap-1"
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((_, j) => j !== i))}
              className="text-text-faint hover:text-error"
              aria-label={`Remove '${v}'`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(input);
            } else if (e.key === "Backspace" && input === "" && values.length > 0) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={() => input && add(input)}
          placeholder="Add item, press Enter or comma…"
          className="flex-1 min-w-[140px] bg-transparent outline-none text-sm px-1"
        />
      </div>
    </div>
  );
}

// ── Import Dialog ───────────────────────────────────────────

function ImportDialog({
  open,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (items: PersonaInput[], mode: "upsert" | "skip-existing") => Promise<void>;
}) {
  const [text, setText] = React.useState("");
  const [mode, setMode] = React.useState<"upsert" | "skip-existing">("upsert");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setText("");
      setError(null);
    }
  }, [open]);

  async function submit() {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setError(`JSON parse error: ${e instanceof Error ? e.message : "invalid"}`);
      return;
    }
    if (!Array.isArray(parsed)) {
      setError("JSON root: array expected");
      return;
    }
    setBusy(true);
    try {
      await onSubmit(parsed as PersonaInput[], mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Persona JSON Import</SheetTitle>
          <SheetDescription>
            Paste exported JSON. If <code>domainSlug</code> already exists, behavior is selected below.
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-3 mt-4">
          <div className="flex gap-3 text-sm">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={mode === "upsert"}
                onChange={() => setMode("upsert")}
              />
              Upsert (existing → update)
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={mode === "skip-existing"}
                onChange={() => setMode("skip-existing")}
              />
              Skip-existing (new → add, existing → skip)
            </label>
          </div>
          <Textarea
            rows={14}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder='[{"domainSlug":"seo","name":"...","body":"...","jargon":[],"frameworks":[],"antiPatterns":[],"isActive":true}]'
            className="font-mono text-[11px]"
          />
          {error && (
            <div className="text-sm text-error rounded-md border border-error/30 bg-error/5 p-2.5">{error}</div>
          )}
          <div className="flex gap-2">
            <Button onClick={submit} disabled={busy || !text.trim()}>
              {busy ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : null}
              Import
            </Button>
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
