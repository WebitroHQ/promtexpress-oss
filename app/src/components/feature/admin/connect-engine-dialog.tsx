"use client";

import { useState, useTransition } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addEngine } from "@/server/actions/admin-engines";

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic" },
  { value: "openai", label: "OpenAI" },
  { value: "google", label: "Google" },
  { value: "deepseek", label: "DeepSeek" },
  { value: "elevenlabs", label: "ElevenLabs" },
  { value: "midjourney", label: "Midjourney" },
  { value: "runway", label: "Runway" },
  { value: "openrouter", label: "OpenRouter" },
  { value: "other", label: "Other" },
];

const UNIT_TYPES = [
  { value: "1k_tokens", label: "Per 1k tokens" },
  { value: "image", label: "Per image" },
  { value: "audio_minute", label: "Per minute (audio)" },
  { value: "video_second", label: "Per second (video)" },
];

const PREFERRED_FORMATS = [
  { value: "", label: "(none)" },
  { value: "xml", label: "XML (Anthropic-style tags)" },
  { value: "json", label: "JSON" },
  { value: "markdown", label: "Markdown" },
  { value: "plain", label: "Plain text" },
];

export function ConnectEngineDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("anthropic");
  const [modelId, setModelId] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("0.001");
  const [unitType, setUnitType] = useState("1k_tokens");
  // Capability alanları
  const [contextWindow, setContextWindow] = useState("");
  const [maxOutputTokens, setMaxOutputTokens] = useState("");
  const [preferredFormat, setPreferredFormat] = useState("");
  const [promptGuidelines, setPromptGuidelines] = useState("");
  const [supportsVision, setSupportsVision] = useState(false);
  const [supportsReasoning, setSupportsReasoning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const reset = () => {
    setName("");
    setProvider("anthropic");
    setModelId("");
    setCostPerUnit("0.001");
    setUnitType("1k_tokens");
    setContextWindow("");
    setMaxOutputTokens("");
    setPreferredFormat("");
    setPromptGuidelines("");
    setSupportsVision(false);
    setSupportsReasoning(false);
    setError(null);
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      try {
        await addEngine({
          name,
          provider,
          modelId,
          costPerUnit: parseFloat(costPerUnit) || 0,
          unitType,
          contextWindow: contextWindow ? parseInt(contextWindow, 10) : null,
          maxOutputTokens: maxOutputTokens ? parseInt(maxOutputTokens, 10) : null,
          preferredFormat: preferredFormat || null,
          promptGuidelines: promptGuidelines || null,
          supportsVision,
          supportsReasoning,
        });
        reset();
        setOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add engine");
      }
    });
  };

  const selectCls =
    "h-9 w-full rounded-[var(--pe-r-md)] border border-border-strong bg-surface px-3 text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20";

  const canSave = name.trim() && provider && modelId.trim() && !pending;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <Dialog.Trigger asChild>
        <Button size="sm">
          <Plus className="h-3.5 w-3.5" /> Connect engine
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-overlay z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[560px] max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-lg focus:outline-none">
          <Dialog.Title className="text-base font-semibold mb-1">Connect engine</Dialog.Title>
          <Dialog.Description className="text-sm text-text-muted mb-5">
            Add a new LLM or media engine. API key can be added after creation.
          </Dialog.Description>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="eng-name">Display name</Label>
              <Input
                id="eng-name"
                placeholder="Claude Opus 4.7"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="eng-provider">Provider</Label>
                <select
                  id="eng-provider"
                  className={selectCls}
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="eng-model">Model ID</Label>
                <Input
                  id="eng-model"
                  placeholder="claude-opus-4-7"
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="eng-cost">Cost per unit ($)</Label>
                <Input
                  id="eng-cost"
                  type="number"
                  step="0.000001"
                  min="0"
                  placeholder="0.001"
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="eng-unit">Unit type</Label>
                <select
                  id="eng-unit"
                  className={selectCls}
                  value={unitType}
                  onChange={(e) => setUnitType(e.target.value)}
                >
                  {UNIT_TYPES.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-border pt-4 mt-2">
              <p className="text-xs text-text-muted mb-3">
                Model capabilities (optional — pipeline reads these to shape prompts per model)
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="eng-ctx">Context window (tokens)</Label>
                  <Input
                    id="eng-ctx"
                    type="number"
                    min="0"
                    placeholder="200000"
                    value={contextWindow}
                    onChange={(e) => setContextWindow(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="eng-mout">Max output tokens</Label>
                  <Input
                    id="eng-mout"
                    type="number"
                    min="0"
                    placeholder="8192"
                    value={maxOutputTokens}
                    onChange={(e) => setMaxOutputTokens(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="eng-fmt">Preferred format</Label>
                  <select
                    id="eng-fmt"
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
              <div className="flex flex-col gap-1.5 mt-3">
                <Label htmlFor="eng-guide">Model-specific guidelines (optional)</Label>
                <textarea
                  id="eng-guide"
                  className="min-h-[72px] w-full rounded-[var(--pe-r-md)] border border-border-strong bg-surface px-3 py-2 text-sm focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/20"
                  placeholder="e.g. This model excels at structured XML output. Use <task>...</task> tags."
                  value={promptGuidelines}
                  onChange={(e) => setPromptGuidelines(e.target.value)}
                />
              </div>
              <div className="flex gap-4 mt-3">
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
            </div>

            {error && <p className="text-sm text-error">{error}</p>}
          </div>

          <div className="flex justify-end gap-2 mt-5">
            <Dialog.Close asChild>
              <Button variant="ghost" size="sm">Cancel</Button>
            </Dialog.Close>
            <Button size="sm" disabled={!canSave} onClick={handleSave}>
              {pending ? "Adding…" : "Add engine"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
