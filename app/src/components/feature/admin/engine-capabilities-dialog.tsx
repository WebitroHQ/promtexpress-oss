"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateEngineCapabilities } from "@/server/actions/admin-engines";

const PREFERRED_FORMATS = [
  { value: "", label: "(none)" },
  { value: "xml", label: "XML (Anthropic-style tags)" },
  { value: "json", label: "JSON" },
  { value: "markdown", label: "Markdown" },
  { value: "plain", label: "Plain text" },
];

export interface EngineCapabilitiesValues {
  contextWindow: number | null;
  maxOutputTokens: number | null;
  preferredFormat: string | null;
  promptGuidelines: string | null;
  supportsVision: boolean;
  supportsReasoning: boolean;
}

export function EngineCapabilitiesDialog({
  engineId,
  engineName,
  initial,
}: {
  engineId: string;
  engineName: string;
  initial: EngineCapabilitiesValues;
}) {
  const [open, setOpen] = useState(false);
  const [contextWindow, setContextWindow] = useState(
    initial.contextWindow != null ? String(initial.contextWindow) : "",
  );
  const [maxOutputTokens, setMaxOutputTokens] = useState(
    initial.maxOutputTokens != null ? String(initial.maxOutputTokens) : "",
  );
  const [preferredFormat, setPreferredFormat] = useState(initial.preferredFormat ?? "");
  const [promptGuidelines, setPromptGuidelines] = useState(initial.promptGuidelines ?? "");
  const [supportsVision, setSupportsVision] = useState(initial.supportsVision);
  const [supportsReasoning, setSupportsReasoning] = useState(initial.supportsReasoning);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectCls =
    "h-9 w-full rounded-[var(--pe-r-md)] border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20";

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      try {
        await updateEngineCapabilities(engineId, {
          contextWindow: contextWindow ? parseInt(contextWindow, 10) : null,
          maxOutputTokens: maxOutputTokens ? parseInt(maxOutputTokens, 10) : null,
          preferredFormat: preferredFormat || null,
          promptGuidelines: promptGuidelines || null,
          supportsVision,
          supportsReasoning,
        });
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary">
          <Sliders className="h-3 w-3" /> Capabilities
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-overlay z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[560px] max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-lg focus:outline-none">
          <Dialog.Title className="text-base font-semibold mb-1">
            Capabilities — {engineName}
          </Dialog.Title>
          <Dialog.Description className="text-sm text-text-muted mb-5">
            Pipeline reads these fields when shaping prompts for this model.
          </Dialog.Description>

          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cap-ctx">Context window (tokens)</Label>
                <Input
                  id="cap-ctx"
                  type="number"
                  min="0"
                  placeholder="200000"
                  value={contextWindow}
                  onChange={(e) => setContextWindow(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cap-mout">Max output tokens</Label>
                <Input
                  id="cap-mout"
                  type="number"
                  min="0"
                  placeholder="8192"
                  value={maxOutputTokens}
                  onChange={(e) => setMaxOutputTokens(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cap-fmt">Preferred format</Label>
                <select
                  id="cap-fmt"
                  className={selectCls}
                  value={preferredFormat}
                  onChange={(e) => setPreferredFormat(e.target.value)}
                >
                  {PREFERRED_FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cap-guide">Model-specific guidelines</Label>
              <textarea
                id="cap-guide"
                className="min-h-[96px] w-full rounded-[var(--pe-r-md)] border border-border-strong bg-surface px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20"
                placeholder="e.g. This model excels at structured XML output. Use <task>...</task> tags."
                value={promptGuidelines}
                onChange={(e) => setPromptGuidelines(e.target.value)}
              />
            </div>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={supportsVision}
                  onChange={(e) => setSupportsVision(e.target.checked)}
                />
                Supports vision
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={supportsReasoning}
                  onChange={(e) => setSupportsReasoning(e.target.checked)}
                />
                Supports reasoning (thinking-mode)
              </label>
            </div>

            {error && <p className="text-sm text-error">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm">Cancel</Button>
            </Dialog.Close>
            <Button size="sm" disabled={pending} onClick={handleSave}>
              {pending ? "Saving…" : "Save capabilities"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
