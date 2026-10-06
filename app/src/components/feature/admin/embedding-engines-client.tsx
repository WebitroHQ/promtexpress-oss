"use client";

import * as React from "react";
import {
  Key, Star, Trash2, Plus, CheckCircle, XCircle,
  ChevronDown, ChevronUp, ExternalLink, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  addEmbeddingEngine,
  saveEmbeddingEngineKey,
  toggleEmbeddingEngineActive,
  setDefaultEmbeddingEngine,
  deleteEmbeddingEngine,
} from "@/server/actions/admin-embedding-engines";
import { EMBEDDING_CATALOG, type EmbeddingProvider } from "@/lib/library/embedding/catalog";

// ── Types ─────────────────────────────────────────────────────────────────────

type Engine = {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  dimensions: number;
  costPer1MTokens: number;
  isActive: boolean;
  isDefault: boolean;
  hasKey: boolean;
  notes: string;
};

type Step = "provider" | "model" | "key";

type FormState = {
  provider: EmbeddingProvider | null;
  modelId: string;
  name: string;
  notes: string;
};

const DEFAULT_FORM: FormState = { provider: null, modelId: "", name: "", notes: "" };

// ── Main component ─────────────────────────────────────────────────────────────

export function EmbeddingEnginesClient({ engines: initial }: { engines: Engine[] }) {
  const [engines, setEngines] = React.useState(initial);
  const [adding, setAdding] = React.useState(false);
  const [step, setStep] = React.useState<Step>("provider");
  const [form, setForm] = React.useState<FormState>(DEFAULT_FORM);
  const [keyInput, setKeyInput] = React.useState<Record<string, string>>({});
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const [busy, setBusy] = React.useState<Record<string, boolean>>({});

  function startAdding() {
    setAdding(true);
    setStep("provider");
    setForm(DEFAULT_FORM);
  }

  function cancelAdding() {
    setAdding(false);
    setForm(DEFAULT_FORM);
    setStep("provider");
  }

  function selectProvider(p: EmbeddingProvider) {
    setForm({ provider: p, modelId: "", name: "", notes: "" });
    setStep("model");
  }

  function selectModel(modelId: string) {
    const model = form.provider?.models.find((m) => m.modelId === modelId);
    if (!model) return;
    setForm((f) => ({
      ...f,
      modelId,
      name: f.name || `${f.provider?.label} ${model.label}`,
    }));
    setStep("key");
  }

  async function handleAdd(apiKey: string) {
    const model = form.provider?.models.find((m) => m.modelId === form.modelId);
    if (!form.provider || !model) return;

    setBusy((b) => ({ ...b, add: true }));
    try {
      await addEmbeddingEngine({
        name: form.name || `${form.provider.label} ${model.label}`,
        provider: form.provider.id,
        modelId: form.modelId,
        dimensions: model.dimensions,
        costPer1MTokens: model.costPer1MTokens,
        notes: form.notes,
        apiKey: apiKey.trim(),
      });
      cancelAdding();
      window.location.reload();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy((b) => ({ ...b, add: false }));
    }
  }

  async function handleSaveKey(id: string) {
    const key = keyInput[id]?.trim();
    if (!key) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await saveEmbeddingEngineKey(id, key);
      setKeyInput((k) => ({ ...k, [id]: "" }));
      window.location.reload();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  async function handleToggle(id: string, active: boolean) {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await toggleEmbeddingEngineActive(id, active);
      setEngines((prev) => prev.map((e) => (e.id === id ? { ...e, isActive: active } : e)));
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  async function handleSetDefault(id: string) {
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await setDefaultEmbeddingEngine(id);
      setEngines((prev) =>
        prev.map((e) => ({ ...e, isDefault: e.id === id, isActive: e.id === id ? true : e.isActive })),
      );
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setBusy((b) => ({ ...b, [id]: true }));
    try {
      await deleteEmbeddingEngine(id);
      setEngines((prev) => prev.filter((e) => e.id !== id));
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  }

  return (
    <div className="max-w-[900px] flex flex-col gap-6">
      {/* Existing engines list */}
      <div className="flex flex-col gap-3">
        {engines.length === 0 && !adding && (
          <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center text-text-muted text-sm">
            No embedding engines configured yet. Add one below.
          </div>
        )}

        {engines.map((engine) => (
          <EngineCard
            key={engine.id}
            engine={engine}
            keyInput={keyInput[engine.id] ?? ""}
            onKeyInputChange={(v) => setKeyInput((k) => ({ ...k, [engine.id]: v }))}
            expanded={!!expanded[engine.id]}
            onToggleExpand={() => setExpanded((e) => ({ ...e, [engine.id]: !e[engine.id] }))}
            busy={!!busy[engine.id]}
            onSaveKey={() => handleSaveKey(engine.id)}
            onToggleActive={() => handleToggle(engine.id, !engine.isActive)}
            onSetDefault={() => handleSetDefault(engine.id)}
            onDelete={() => handleDelete(engine.id, engine.name)}
          />
        ))}
      </div>

      {/* Add wizard */}
      {!adding ? (
        <Button className="self-start" onClick={startAdding}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add embedding engine
        </Button>
      ) : (
        <AddWizard
          step={step}
          form={form}
          busy={!!busy.add}
          onSelectProvider={selectProvider}
          onSelectModel={selectModel}
          onBack={() => {
            if (step === "model") setStep("provider");
            else if (step === "key") setStep("model");
          }}
          onNameChange={(v) => setForm((f) => ({ ...f, name: v }))}
          onNotesChange={(v) => setForm((f) => ({ ...f, notes: v }))}
          onAdd={handleAdd}
          onCancel={cancelAdding}
        />
      )}
    </div>
  );
}

// ── EngineCard ─────────────────────────────────────────────────────────────────

function EngineCard({
  engine,
  keyInput,
  onKeyInputChange,
  expanded,
  onToggleExpand,
  busy,
  onSaveKey,
  onToggleActive,
  onSetDefault,
  onDelete,
}: {
  engine: Engine;
  keyInput: string;
  onKeyInputChange: (v: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
  busy: boolean;
  onSaveKey: () => void;
  onToggleActive: () => void;
  onSetDefault: () => void;
  onDelete: () => void;
}) {
  const providerInfo = EMBEDDING_CATALOG.find((p) => p.id === engine.provider);

  return (
    <div
      className={`rounded-xl border bg-surface transition-colors ${
        engine.isDefault ? "border-primary/50 shadow-sm" : "border-border"
      }`}
    >
      <div className="flex items-center gap-3 p-4">
        {/* Status dot */}
        <div
          className={`w-2 h-2 rounded-full shrink-0 ${
            engine.isActive ? "bg-success" : "bg-text-faint"
          }`}
        />

        {/* Provider badge */}
        {providerInfo && (
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded shrink-0 ${providerInfo.color}`}>
            {providerInfo.label}
          </span>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{engine.name}</span>
            {engine.isDefault && <Badge variant="default">Default</Badge>}
            {!engine.hasKey && <Badge variant="warning">No key</Badge>}
          </div>
          <div className="flex gap-3 mt-0.5 text-xs text-text-muted font-mono">
            <span>{engine.modelId}</span>
            <span className="text-text-faint">·</span>
            <span>{engine.dimensions.toLocaleString()} dims</span>
            <span className="text-text-faint">·</span>
            <span>${engine.costPer1MTokens}/1M tok</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {!engine.isDefault && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={onSetDefault}
              title="Set as default"
            >
              <Star className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="sm" variant="ghost" disabled={busy} onClick={onToggleActive}>
            {engine.isActive ? (
              <XCircle className="h-3.5 w-3.5 text-error" />
            ) : (
              <CheckCircle className="h-3.5 w-3.5 text-success" />
            )}
          </Button>
          <Button size="sm" variant="ghost" onClick={onToggleExpand}>
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={engine.isDefault || busy}
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5 text-error" />
          </Button>
        </div>
      </div>

      {/* Key panel */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs mb-1">
              {providerInfo?.apiKeyLabel ?? "API Key"}
            </Label>
            {providerInfo && (
              <p className="text-[11px] text-text-faint mb-1.5">
                Get key →{" "}
                <a
                  href={providerInfo.apiKeyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-0.5"
                >
                  {providerInfo.apiKeyUrl.replace(/^https?:\/\//, "").split("/")[0]}
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </p>
            )}
            <Input
              type="password"
              placeholder={
                engine.hasKey
                  ? `${providerInfo?.apiKeyHint ?? "…"} (enter new key to replace)`
                  : providerInfo?.apiKeyHint ?? "Enter API key"
              }
              value={keyInput}
              onChange={(e) => onKeyInputChange(e.target.value)}
            />
          </div>
          <Button size="sm" disabled={!keyInput.trim() || busy} onClick={onSaveKey}>
            <Key className="h-3.5 w-3.5 mr-1" />
            {engine.hasKey ? "Replace key" : "Save key"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ── AddWizard ─────────────────────────────────────────────────────────────────

function AddWizard({
  step,
  form,
  busy,
  onSelectProvider,
  onSelectModel,
  onBack,
  onNameChange,
  onNotesChange,
  onAdd,
  onCancel,
}: {
  step: Step;
  form: FormState;
  busy: boolean;
  onSelectProvider: (p: EmbeddingProvider) => void;
  onSelectModel: (modelId: string) => void;
  onBack: () => void;
  onNameChange: (v: string) => void;
  onNotesChange: (v: string) => void;
  onAdd: (apiKey: string) => void;
  onCancel: () => void;
}) {
  const [apiKey, setApiKey] = React.useState("");

  const selectedModel = form.provider?.models.find((m) => m.modelId === form.modelId);

  const STEPS: { id: Step; label: string }[] = [
    { id: "provider", label: "Provider" },
    { id: "model", label: "Model" },
    { id: "key", label: "API Key" },
  ];

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Step header */}
      <div className="flex items-center gap-0 border-b border-border px-5 py-3 bg-surface-2">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.id}>
            <div className="flex items-center gap-1.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold ${
                  step === s.id
                    ? "bg-primary text-primary-text"
                    : STEPS.findIndex((x) => x.id === step) > i
                    ? "bg-success text-primary-text"
                    : "bg-border text-text-faint"
                }`}
              >
                {STEPS.findIndex((x) => x.id === step) > i ? "✓" : i + 1}
              </div>
              <span
                className={`text-xs font-medium ${
                  step === s.id ? "text-text" : "text-text-faint"
                }`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 text-text-faint mx-2 shrink-0" />
            )}
          </React.Fragment>
        ))}
        <div className="ml-auto">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>

      <div className="p-5">
        {/* STEP 1 — Provider */}
        {step === "provider" && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-text-muted">Select an embedding provider:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {EMBEDDING_CATALOG.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectProvider(p)}
                  className="text-left rounded-xl border border-border hover:border-primary/50 hover:bg-surface-2 transition-colors p-4 flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${p.color}`}>
                      {p.label}
                    </span>
                    <span className="text-[11px] text-text-faint">{p.models.length} models</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {p.models.map((m) => (
                      <span
                        key={m.modelId}
                        className={`text-[11px] px-1.5 py-0.5 rounded bg-surface-2 text-text-muted ${m.recommended ? "ring-1 ring-primary/30" : ""}`}
                      >
                        {m.recommended && "★ "}
                        {m.label}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — Model */}
        {step === "model" && form.provider && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${form.provider.color}`}>
                {form.provider.label}
              </span>
              <span className="text-sm text-text-muted">Select a model:</span>
            </div>

            <div className="flex flex-col gap-2">
              {form.provider.models.map((m) => (
                <button
                  key={m.modelId}
                  onClick={() => onSelectModel(m.modelId)}
                  className={`text-left rounded-xl border transition-colors p-4 hover:border-primary/50 hover:bg-surface-2 ${
                    form.modelId === m.modelId ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm font-mono">{m.modelId}</span>
                        {m.recommended && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-primary/15 text-primary">
                            Recommended
                          </span>
                        )}
                      </div>
                      {m.notes && (
                        <p className="text-xs text-text-muted mt-1">{m.notes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold">{m.dimensions.toLocaleString()} dims</div>
                      <div className="text-[11px] text-text-faint">${m.costPer1MTokens}/1M tok</div>
                      <div className="text-[11px] text-text-faint">{m.maxTokens.toLocaleString()} ctx</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <Button variant="ghost" size="sm" className="self-start" onClick={onBack}>
              ← Back
            </Button>
          </div>
        )}

        {/* STEP 3 — API Key + Name */}
        {step === "key" && form.provider && selectedModel && (
          <div className="flex flex-col gap-4">
            {/* Summary */}
            <div className="rounded-lg bg-surface-2 border border-border p-3 flex gap-4 text-sm flex-wrap">
              <div>
                <span className="text-text-faint text-xs">Provider</span>
                <div className="font-medium">{form.provider.label}</div>
              </div>
              <div>
                <span className="text-text-faint text-xs">Model</span>
                <div className="font-mono font-medium">{selectedModel.modelId}</div>
              </div>
              <div>
                <span className="text-text-faint text-xs">Dimensions</span>
                <div className="font-medium">{selectedModel.dimensions.toLocaleString()}</div>
              </div>
              <div>
                <span className="text-text-faint text-xs">Cost</span>
                <div className="font-medium">${selectedModel.costPer1MTokens}/1M tok</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs mb-1">
                  {form.provider.apiKeyLabel}{" "}
                  <a
                    href={form.provider.apiKeyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-0.5 ml-1"
                  >
                    Get key <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                </Label>
                <Input
                  type="password"
                  placeholder={form.provider.apiKeyHint}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  autoFocus
                />
                <p className="text-[11px] text-text-faint mt-1">
                  Stored encrypted with AES-256-GCM. Never exposed in plaintext.
                </p>
              </div>

              <div>
                <Label className="text-xs mb-1">Display name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => onNameChange(e.target.value)}
                  placeholder={`${form.provider.label} ${selectedModel.label}`}
                />
              </div>

              <div>
                <Label className="text-xs mb-1">Notes (optional)</Label>
                <Input
                  value={form.notes}
                  onChange={(e) => onNotesChange(e.target.value)}
                  placeholder="Internal note"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-1">
              <Button
                disabled={!apiKey.trim() || busy}
                onClick={() => onAdd(apiKey)}
              >
                {busy ? "Adding…" : "Add engine"}
              </Button>
              <Button variant="ghost" size="sm" onClick={onBack}>
                ← Back
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
