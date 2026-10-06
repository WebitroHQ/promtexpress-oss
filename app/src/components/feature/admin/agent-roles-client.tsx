"use client";

import * as React from "react";
import { toast } from "sonner";
import { Bot, Save, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { setAgentRoleEngine, toggleAgentRoleActive, updateRoleBriefSystemPrompt } from "@/server/actions/agent-roles";

interface RoleData {
  roleSlug: "INTENT_ANALYZER" | "SYNTHESIZER" | "SAFETY_CHECKER" | "EMBEDDER" | "DISTILLER";
  briefVersion: string | null;
  briefSystemPrompt: string;
  briefNotes: string | null;
  briefSystemPromptPreview: string;
  exemplarCount: number;
  assignedEngineId: string | null;
  assignedEngineName: string | null;
  isActive: boolean;
  notes: string | null;
}

interface EngineOption {
  id: string;
  name: string;
  provider: string;
  modelId: string;
  hasKey: boolean;
  isActive: boolean;
  usable: boolean;
}

interface Props {
  roles: RoleData[];
  engines: EngineOption[];
}

const ROLE_DESCRIPTIONS: Record<RoleData["roleSlug"], { title: string; desc: string; recommended: string }> = {
  INTENT_ANALYZER: {
    title: "Intent Analyzer",
    desc: "Reads the user's request, decides scenario A/B/C, and detects missing parameters.",
    recommended: "Fast and inexpensive model (Haiku, GPT-4o-mini, Gemini Flash) — structured JSON output is enough.",
  },
  SYNTHESIZER: {
    title: "Synthesizer",
    desc: "Constitution + persona + RAG + intent → produces the single final prompt. The heart of the pipeline.",
    recommended: "High-quality model (Sonnet, GPT-4o, Gemini 2.5 Pro). Targets >50% prompt cache.",
  },
  SAFETY_CHECKER: {
    title: "Safety Checker",
    desc: "Checks the synthesized prompt for PII/jailbreak/ethics. Called only when risk is high.",
    recommended: "Mid-tier (Sonnet, GPT-4o-mini). Fast + careful.",
  },
  EMBEDDER: {
    title: "Embedder",
    desc: "Not used: library search runs on Postgres full-text search and needs no embedding model.",
    recommended: "Nothing to assign.",
  },
  DISTILLER: {
    title: "Distiller",
    desc: "Admin-side distillation from TrainingResource (proposed Constitution/Persona updates).",
    recommended: "Large model (Opus, GPT-4) — citation + suggestion quality is critical.",
  },
};

export function AgentRolesClient({ roles, engines }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-md bg-warning/5 border border-warning/30 p-4 text-sm text-text-muted">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-text mb-1">Directive #1 — AI engine hardcoding FORBIDDEN</p>
            <p>
              For the pipeline to run, at minimum the <strong>INTENT_ANALYZER</strong> and <strong>SYNTHESIZER</strong> roles must have an engine assigned.
              The assigned engine — small or large — runs at 100% performance thanks to RoleBrief few-shot exemplars.
            </p>
          </div>
        </div>
      </div>

      {roles.map((r) => (
        <RoleCard key={r.roleSlug} role={r} engines={engines} />
      ))}
    </div>
  );
}

function RoleCard({ role, engines }: { role: RoleData; engines: EngineOption[] }) {
  const meta = ROLE_DESCRIPTIONS[role.roleSlug];
  const [engineId, setEngineId] = React.useState<string | null>(role.assignedEngineId);
  const [saving, setSaving] = React.useState(false);
  const [showPromptEditor, setShowPromptEditor] = React.useState(false);
  const [savingPrompt, setSavingPrompt] = React.useState(false);
  const dirty = engineId !== role.assignedEngineId;

  async function handlePromptSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const systemPrompt = String(fd.get("systemPrompt") ?? "");
    const version = String(fd.get("version") ?? "").trim() || undefined;
    const notes = String(fd.get("notes") ?? "").trim() || null;
    setSavingPrompt(true);
    try {
      await updateRoleBriefSystemPrompt({ roleSlug: role.roleSlug, systemPrompt, version, notes });
      toast.success("System prompt updated");
      setShowPromptEditor(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingPrompt(false);
    }
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      await setAgentRoleEngine({ roleSlug: role.roleSlug, engineId });
      toast.success(`${meta.title} → ${engines.find((e) => e.id === engineId)?.name ?? "none"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    try {
      await toggleAgentRoleActive(role.roleSlug, !role.isActive);
      toast.success(role.isActive ? "Deactivated" : "Activated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Operation failed");
    }
  };

  // Tüm motorları göster — kullanılabilir olanlar üstte, diğerleri disabled + işaretli (Direktif #1).
  // Provider'a göre grupla, her grup içinde önce usable, sonra key bekleyen, sonra deaktif.
  const enginesByProvider = React.useMemo(() => {
    const map: Record<string, EngineOption[]> = {};
    for (const e of engines) {
      const p = e.provider;
      if (!map[p]) map[p] = [];
      map[p].push(e);
    }
    for (const p of Object.keys(map)) {
      map[p].sort((a, b) => {
        if (a.usable !== b.usable) return a.usable ? -1 : 1;
        if (a.hasKey !== b.hasKey) return a.hasKey ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }
    return map;
  }, [engines]);

  const usableCount = engines.filter((e) => e.usable).length;
  const isCritical = role.roleSlug === "INTENT_ANALYZER" || role.roleSlug === "SYNTHESIZER";
  const isEmbedder = role.roleSlug === "EMBEDDER";

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold flex items-center gap-2">
                {meta.title}
                {isCritical && <Badge>critical</Badge>}
                {role.briefVersion && <Badge variant="default">RoleBrief {role.briefVersion}</Badge>}
                {role.exemplarCount > 0 && (
                  <Badge variant="default">{role.exemplarCount} few-shot</Badge>
                )}
                {!role.isActive && <Badge variant="outline">inactive</Badge>}
              </h3>
              <p className="text-sm text-text-muted mt-1">{meta.desc}</p>
              <p className="text-xs text-text-faint mt-1">
                <span className="font-medium">Recommended:</span> {meta.recommended}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleToggle}>
            {role.isActive ? "Deactivate" : "Activate"}
          </Button>
        </div>

        {isEmbedder ? (
          <div className="mt-4 rounded-md border border-dashed border-primary/40 bg-primary/5 p-3 text-sm text-text-muted">
            This role is not used. Library search runs on Postgres full-text search, so no embedding model is needed.
          </div>
        ) : (
        <div className="grid grid-cols-[1fr_auto] gap-3 items-end mt-4">
          <div>
            <label className="text-xs text-text-muted block mb-1.5">Assigned engine</label>
            <select
              value={engineId ?? ""}
              onChange={(e) => setEngineId(e.target.value || null)}
              className="w-full rounded-[var(--pe-r-md)] border border-border-strong bg-surface px-3 py-2 text-sm text-text focus:outline-none focus:border-primary"
            >
              <option value="">— Unassigned —</option>
              {usableCount === 0 && (
                <option disabled>
                  ⚠ No active engines with keys yet. Configure them on /pr/yonet/engines first.
                </option>
              )}
              {Object.keys(enginesByProvider).sort().map((provider) => (
                <optgroup key={provider} label={provider.toUpperCase()}>
                  {enginesByProvider[provider].map((e) => {
                    const status = e.usable
                      ? ""
                      : !e.hasKey && !e.isActive
                      ? " — ⚠ key + inactive"
                      : !e.hasKey
                      ? " — ⚠ key required"
                      : " — ⚠ inactive";
                    return (
                      <option key={e.id} value={e.id} disabled={!e.usable}>
                        {e.name} ({e.modelId}){status}
                      </option>
                    );
                  })}
                </optgroup>
              ))}
            </select>
            <p className="text-[11px] text-text-faint mt-1">
              {usableCount} / {engines.length} engines ready.
              {usableCount < engines.length && (
                <> Add keys / activate the rest from the <a href="/pr/yonet/engines" className="text-primary hover:underline">Engines</a> page.</>
              )}
            </p>
          </div>
          <Button onClick={handleSave} disabled={!dirty || saving}>
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <details className="flex-1">
            <summary className="text-xs text-text-muted cursor-pointer hover:text-text">
              RoleBrief preview (system prompt)
            </summary>
            <pre className="mt-2 rounded-md border border-border bg-surface-2 p-3 text-[11px] text-text-muted whitespace-pre-wrap max-h-[200px] overflow-auto">
              {role.briefSystemPromptPreview || "(no brief — seed missing)"}
            </pre>
          </details>
          {role.briefSystemPrompt && (
            <Button variant="ghost" size="sm" onClick={() => setShowPromptEditor(true)}>
              Edit prompt…
            </Button>
          )}
        </div>

        {showPromptEditor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-overlay p-4" onClick={() => !savingPrompt && setShowPromptEditor(false)}>
            <form onClick={(e) => e.stopPropagation()} onSubmit={handlePromptSubmit} className="bg-surface border border-border rounded-xl p-5 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <h3 className="font-semibold mb-4">{meta.title} — System Prompt</h3>
              <p className="text-xs text-text-muted mb-3">
                This prompt is stored in the RoleBrief table. The v4 pipeline uses it at runtime. Min 50, max 20000 characters.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-text-muted mb-1">Version</label>
                  <input
                    name="version"
                    defaultValue={role.briefVersion ?? ""}
                    placeholder="v1"
                    className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm font-mono"
                  />
                </div>
              </div>

              <label className="block text-xs text-text-muted mb-1">System prompt</label>
              <textarea
                name="systemPrompt"
                required
                defaultValue={role.briefSystemPrompt}
                rows={20}
                minLength={50}
                maxLength={20000}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm mb-3 font-mono"
              />

              <label className="block text-xs text-text-muted mb-1">Notes (opsiyonel)</label>
              <textarea
                name="notes"
                defaultValue={role.briefNotes ?? ""}
                rows={2}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm mb-4"
              />

              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowPromptEditor(false)} disabled={savingPrompt}>Cancel</Button>
                <Button type="submit" size="sm" disabled={savingPrompt}>{savingPrompt ? "Saving…" : "Save"}</Button>
              </div>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
