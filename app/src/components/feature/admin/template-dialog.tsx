"use client";

import { useMemo, useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/server/actions/admin-templates";

const MODALITIES = ["text", "image", "code", "audio", "video"] as const;
const STATUSES = ["DRAFT", "REVIEW", "PUBLISHED"] as const;

export type TemplateRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  modality: string;
  engine: string | null;
  template: string;
  variables: string[];
  status: "DRAFT" | "REVIEW" | "PUBLISHED";
  version: string;
  sortOrder: number;
};

type Mode = { type: "create" } | { type: "edit"; row: TemplateRow };

const VAR_REGEX = /\{\{(\w+)\}\}/g;
const inputCls =
  "h-9 w-full rounded-[var(--pe-r-md)] border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20";

function detectVars(tpl: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = VAR_REGEX.exec(tpl)) !== null) found.add(m[1]);
  return Array.from(found);
}

function TemplateForm({ mode, onClose }: { mode: Mode; onClose: () => void }) {
  const initial: TemplateRow =
    mode.type === "edit"
      ? mode.row
      : {
          id: "",
          title: "",
          description: "",
          category: "",
          modality: "text",
          engine: "",
          template: "",
          variables: [],
          status: "DRAFT",
          version: "v1.0",
          sortOrder: 0,
        };

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description ?? "");
  const [category, setCategory] = useState(initial.category);
  const [modality, setModality] = useState<(typeof MODALITIES)[number]>(
    (MODALITIES.includes(initial.modality as (typeof MODALITIES)[number])
      ? initial.modality
      : "text") as (typeof MODALITIES)[number],
  );
  const [engine, setEngine] = useState(initial.engine ?? "");
  const [template, setTemplate] = useState(initial.template);
  const [extraVars, setExtraVars] = useState<string[]>(initial.variables);
  const [varInput, setVarInput] = useState("");
  const [status, setStatus] = useState<(typeof STATUSES)[number]>(initial.status);
  const [version, setVersion] = useState(initial.version);
  const [sortOrder, setSortOrder] = useState(String(initial.sortOrder));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Auto-detect vars from template body + merge with manually added
  const allVars = useMemo(() => {
    const detected = detectVars(template);
    return Array.from(new Set([...detected, ...extraVars]));
  }, [template, extraVars]);

  const addVar = () => {
    const v = varInput.trim();
    if (!v) return;
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v)) {
      setError(`Invalid variable name: "${v}"`);
      return;
    }
    setExtraVars((prev) => Array.from(new Set([...prev, v])));
    setVarInput("");
    setError(null);
  };

  const removeVar = (v: string) => {
    setExtraVars((prev) => prev.filter((x) => x !== v));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      category: category.trim(),
      modality,
      engine: engine.trim() || null,
      template,
      variables: allVars,
      status,
      version: version.trim() || "v1.0",
      sortOrder: Number(sortOrder) || 0,
    };
    startTransition(async () => {
      try {
        if (mode.type === "edit") {
          await updateTemplate(mode.row.id, payload);
        } else {
          await createTemplate(payload);
        }
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Save failed");
      }
    });
  };

  const canSave =
    title.trim().length > 0 && category.trim().length > 0 && template.length > 0 && !pending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="t-title">Title *</Label>
          <Input
            id="t-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="LinkedIn launch post — series B"
            required
            autoFocus
          />
        </div>

        <div className="col-span-2 flex flex-col gap-1.5">
          <Label htmlFor="t-desc">Description</Label>
          <Input
            id="t-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional short summary (max 500)"
            maxLength={500}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="t-cat">Category *</Label>
          <Input
            id="t-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Social, Image, Code…"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="t-mod">Modality *</Label>
          <select
            id="t-mod"
            className={inputCls}
            value={modality}
            onChange={(e) => setModality(e.target.value as (typeof MODALITIES)[number])}
          >
            {MODALITIES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="t-engine">Engine (optional)</Label>
          <Input
            id="t-engine"
            value={engine}
            onChange={(e) => setEngine(e.target.value)}
            placeholder="Claude Sonnet 4, Midjourney v6…"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="t-version">Version</Label>
          <Input
            id="t-version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="v1.0"
            maxLength={20}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="t-status">Status</Label>
          <select
            id="t-status"
            className={inputCls}
            value={status}
            onChange={(e) => setStatus(e.target.value as (typeof STATUSES)[number])}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="t-sort">Sort order</Label>
          <Input
            id="t-sort"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="t-body">Template body * <span className="text-text-faint font-normal">(use {`{{var}}`} for placeholders)</span></Label>
        <Textarea
          id="t-body"
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          placeholder={"# Role: Senior brand writer\n# Audience: {{audience}}\n# Tone: {{tone}}"}
          rows={10}
          className="font-mono text-xs min-h-[200px] resize-y"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Variables <span className="text-text-faint font-normal">({allVars.length} detected)</span></Label>
        <div className="flex flex-wrap gap-1.5 p-2 rounded-[var(--pe-r-md)] border border-border-strong bg-surface min-h-[40px]">
          {allVars.length === 0 && (
            <span className="text-xs text-text-faint self-center">
              Detected from template body + manual entries appear here.
            </span>
          )}
          {allVars.map((v) => {
            const isManual = extraVars.includes(v) && !detectVars(template).includes(v);
            return (
              <span
                key={v}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-mono"
              >
                {`{{${v}}}`}
                {isManual && (
                  <button
                    type="button"
                    onClick={() => removeVar(v)}
                    className="hover:text-error"
                    aria-label={`Remove variable ${v}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
        <div className="flex gap-2">
          <Input
            value={varInput}
            onChange={(e) => setVarInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addVar();
              }
            }}
            placeholder="add_extra_var"
            className="h-8 text-xs"
          />
          <Button type="button" variant="secondary" size="sm" onClick={addVar}>
            Add
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-error">{error}</p>}

      <div className="flex items-center justify-between pt-3 border-t border-border">
        {mode.type === "edit" ? (
          <DeleteTemplateButton
            templateId={mode.row.id}
            templateTitle={mode.row.title}
            onDeleted={onClose}
          />
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!canSave}>
            {pending ? "Saving…" : mode.type === "edit" ? "Update" : "Create"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function DeleteTemplateButton({
  templateId,
  templateTitle,
  onDeleted,
}: {
  templateId: string;
  templateTitle: string;
  onDeleted: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      try {
        const r = await deleteTemplate(templateId);
        if (r.action === "deactivated") {
          setResultMsg(
            `This template was used in ${r.usageCount} prompts. Moved to DRAFT instead of deleting.`,
          );
          setTimeout(onDeleted, 1500);
        } else {
          onDeleted();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
        setConfirm(false);
      }
    });
  };

  if (resultMsg) return <p className="text-xs text-warning max-w-[280px]">{resultMsg}</p>;
  if (error) return <p className="text-xs text-error max-w-[280px]">{error}</p>;

  if (confirm) {
    return (
      <div className="flex flex-col gap-2 max-w-[320px]">
        <p className="text-xs text-error">
          "{templateTitle}" will be deleted. If it has usage records, it will be deactivated instead of physically deleted.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setConfirm(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            disabled={pending}
            className="bg-error text-primary-text hover:bg-error/90"
          >
            {pending ? "Processing…" : "Confirm"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirm(true)}
      className="text-xs text-error hover:underline"
    >
      Delete template
    </button>
  );
}

function TemplateModal({
  open,
  onOpenChange,
  title,
  children,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-overlay z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[640px] max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-lg focus:outline-none">
          <Dialog.Title className="text-base font-semibold mb-1">{title}</Dialog.Title>
          <Dialog.Description className="text-sm text-text-muted mb-5">
            All fields are used by the admin pipeline and the public API.
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function NewTemplateButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-3.5 w-3.5" /> New template
      </Button>
      <TemplateModal open={open} onOpenChange={setOpen} title="Create new template">
        {open && <TemplateForm mode={{ type: "create" }} onClose={() => setOpen(false)} />}
      </TemplateModal>
    </>
  );
}

export function EditTemplateButton({ row, label = "Edit" }: { row: TemplateRow; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="text-sm text-primary hover:underline"
      >
        {label}
      </button>
      <TemplateModal open={open} onOpenChange={setOpen} title={`Edit template: ${row.title}`}>
        {open && <TemplateForm mode={{ type: "edit", row }} onClose={() => setOpen(false)} />}
      </TemplateModal>
    </>
  );
}
