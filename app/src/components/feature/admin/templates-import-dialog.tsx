"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importTemplates, type ImportResult } from "@/server/actions/admin-templates";

const SAMPLE = `[
  {
    "title": "Example template",
    "description": "Optional one-liner",
    "category": "Social",
    "modality": "text",
    "engine": "Claude Sonnet 4",
    "template": "# Role: ...\\n# Audience: {{audience}}",
    "variables": ["audience"],
    "status": "DRAFT",
    "version": "v1.0",
    "sortOrder": 0
  }
]`;

export function TemplatesImportDialog() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setText("");
    setResult(null);
    setError(null);
  };

  const onFile = async (file: File) => {
    setError(null);
    try {
      const t = await file.text();
      setText(t);
    } catch (e) {
      setError(e instanceof Error ? e.message : "File read failed");
    }
  };

  const handleImport = () => {
    setError(null);
    setResult(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid JSON");
      return;
    }
    if (!Array.isArray(parsed)) {
      setError("Root must be a JSON array of template objects");
      return;
    }
    startTransition(async () => {
      try {
        const r = await importTemplates(parsed);
        setResult(r);
        if (r.failed.length === 0) {
          setTimeout(() => {
            setOpen(false);
            reset();
          }, 2500);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import failed");
      }
    });
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <Button variant="secondary" size="sm">
          <Upload className="h-3.5 w-3.5" /> Import
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-overlay z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[640px] max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-lg focus:outline-none">
          <Dialog.Title className="text-base font-semibold mb-1">Import templates from JSON</Dialog.Title>
          <Dialog.Description className="text-sm text-text-muted mb-5">
            Existing (title, modality) pairs are updated; missing ones are created. All rows are processed independently.
          </Dialog.Description>

          <div className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm">Select JSON file</span>
              <input
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                }}
                className="text-sm file:mr-3 file:rounded file:border file:border-border-strong file:bg-surface-2 file:px-3 file:py-1.5 file:text-sm file:cursor-pointer"
              />
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm">or paste JSON</span>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={12}
                placeholder={SAMPLE}
                className="w-full rounded-[var(--pe-r-md)] border border-border-strong bg-surface p-3 font-mono text-xs focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20 resize-y"
              />
            </div>

            {error && <p className="text-sm text-error">{error}</p>}

            {result && (
              <div className="rounded-md border border-border bg-surface-2 p-3 text-sm flex flex-col gap-1">
                <div>
                  <span className="text-success font-medium">Created:</span> {result.created}
                </div>
                <div>
                  <span className="text-primary font-medium">Updated:</span> {result.updated}
                </div>
                {result.failed.length > 0 && (
                  <div className="mt-1">
                    <span className="text-error font-medium">Failed:</span> {result.failed.length}
                    <ul className="mt-1 ml-4 text-xs text-error list-disc">
                      {result.failed.slice(0, 10).map((f, i) => (
                        <li key={i}>
                          [{f.index}] {f.title ?? "(no title)"}: {f.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </Dialog.Close>
            <Button size="sm" onClick={handleImport} disabled={pending || text.trim().length === 0}>
              {pending ? "Importing…" : "Import"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
