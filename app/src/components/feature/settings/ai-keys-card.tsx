"use client";

import * as React from "react";
import { CheckCircle2, KeyRound, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Badge } from "@/components/ui/badge";
import { addAiKey, removeAiKey, setActiveAiKey, testAiKey } from "@/server/actions/ai-keys";
import type { AiKeyRow } from "@/server/queries/ai-keys";

export interface AiKeyProviderOption {
  value: string;
  label: string;
  defaultModel: string;
}

interface Props {
  keys: AiKeyRow[];
  providers: AiKeyProviderOption[];
}

export function AiKeysCard({ keys, providers }: Props) {
  const router = useRouter();
  const [provider, setProvider] = React.useState(providers[0]?.value ?? "");
  const [apiKey, setApiKey] = React.useState("");
  const [modelId, setModelId] = React.useState("");
  const [label, setLabel] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);

  const selected = providers.find((p) => p.value === provider);

  const run = async (id: string, action: () => Promise<{ ok: boolean; error?: string }>, success: string) => {
    setBusy(id);
    try {
      const res = await action();
      if (res.ok) {
        toast.success(success);
        router.refresh();
      } else {
        toast.error(res.error ?? "Something went wrong");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await run("add", () => addAiKey({ provider, apiKey, modelId, label }), "Key saved");
    setApiKey("");
    setLabel("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-surface p-6">
        <h3 className="font-semibold text-[15px] mb-1">Your AI provider keys</h3>
        <p className="text-sm text-text-muted mb-5">
          PromtExpress is free. Prompts are generated with your own key, billed by your provider. Keys are stored
          encrypted and are never shown again after you save them.
        </p>

        {keys.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-5 text-sm text-text-muted flex items-center gap-3">
            <KeyRound className="h-4 w-4 shrink-0" />
            Add a key below to start generating prompts.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {keys.map((k) => (
              <li key={k.id} className="rounded-lg border border-border p-4 flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{k.label || k.providerLabel}</span>
                    {k.isActive && <Badge>Active</Badge>}
                  </div>
                  <p className="text-xs text-text-muted mt-1 break-all">
                    {k.providerLabel} · {k.modelId} · ends in {k.keyHint}
                  </p>
                  {k.lastError && <p className="text-xs text-error mt-1 break-words">Last error: {k.lastError}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {!k.isActive && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy !== null}
                      onClick={() => run(k.id, () => setActiveAiKey(k.id), "Active key changed")}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Use this key
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy !== null}
                    onClick={() => run(k.id, () => testAiKey(k.id), "Key works")}
                  >
                    <Zap className="h-3.5 w-3.5" /> {busy === k.id ? "Working…" : "Test"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy !== null}
                    onClick={() => run(k.id, () => removeAiKey(k.id), "Key removed")}
                    aria-label={`Remove ${k.label || k.providerLabel} key`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={onAdd} className="rounded-xl border border-border bg-surface p-6">
        <h3 className="font-semibold text-[15px] mb-4">Add a key</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-key-provider">Provider</Label>
            <select
              id="ai-key-provider"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="h-10 rounded-md border border-border bg-bg px-3 text-sm"
            >
              {providers.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-key-model">Model (optional)</Label>
            <Input
              id="ai-key-model"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              placeholder={selected?.defaultModel}
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-key-value">API key</Label>
            <PasswordInput
              id="ai-key-value"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ai-key-label">Name (optional)</Label>
            <Input id="ai-key-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Work key" maxLength={60} />
          </div>
        </div>
        <Button type="submit" className="mt-5" disabled={busy !== null || apiKey.trim().length === 0}>
          {busy === "add" ? "Saving…" : "Save key"}
        </Button>
      </form>
    </div>
  );
}
