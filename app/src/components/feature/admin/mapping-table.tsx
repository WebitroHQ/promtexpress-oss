"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateModalityMappings } from "@/server/actions/admin-engines";

type TestState = { status: "idle" } | { status: "testing" } | { status: "ok"; latencyMs: number; preview: string } | { status: "error"; message: string };

type Engine = { id: string; name: string; provider: string };

type Row = {
  modality: string;
  label: string;
  primaryId: string | null;
  fallbackId: string | null;
  questionerId: string | null;
  validatorId: string | null;
  isEnabled: boolean;
};

const MODALITY_LABELS: Record<string, string> = {
  text:  "Text",
  code:  "Code",
  image: "Image",
  audio: "Audio",
  video: "Video",
  music: "Music",
};

const MODALITY_ICONS: Record<string, string> = {
  text:  "T",
  code:  "</>",
  image: "🖼",
  audio: "🎙",
  video: "🎬",
  music: "🎵",
};

const PROVIDER_LABELS: Record<string, string> = {
  anthropic:  "Anthropic",
  openai:     "OpenAI",
  google:     "Google",
  deepseek:   "DeepSeek",
  openrouter: "OpenRouter",
  elevenlabs: "ElevenLabs",
  runway:     "Runway",
  midjourney: "Midjourney",
};

const PROVIDER_ORDER = [
  "anthropic", "openai", "google", "deepseek",
  "openrouter", "elevenlabs", "runway", "midjourney",
];

function groupByProvider(engines: Engine[]): Array<{ provider: string; label: string; engines: Engine[] }> {
  const map: Record<string, Engine[]> = {};
  for (const e of engines) {
    if (!map[e.provider]) map[e.provider] = [];
    map[e.provider].push(e);
  }
  const ordered = PROVIDER_ORDER.filter((p) => map[p]).map((p) => ({
    provider: p,
    label: PROVIDER_LABELS[p] ?? p,
    engines: map[p],
  }));
  // unknown providers
  for (const p of Object.keys(map)) {
    if (!PROVIDER_ORDER.includes(p)) {
      ordered.push({ provider: p, label: p, engines: map[p] });
    }
  }
  return ordered;
}

function EngineSelect({
  value,
  onChange,
  groups,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  groups: Array<{ provider: string; label: string; engines: Engine[] }>;
  placeholder: string;
}) {
  return (
    <select
      className="h-8 min-w-[200px] rounded-md border border-border bg-surface px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {groups.map((g) => (
        <optgroup key={g.provider} label={g.label}>
          {g.engines.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

export function MappingTable({
  engines,
  initial,
}: {
  engines: Engine[];
  initial: Row[];
}) {
  const [rows, setRows] = useState<Row[]>(initial);
  const [dirty, setDirty] = useState(false);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testStates, setTestStates] = useState<Record<string, TestState>>({});

  const runTest = async (modality: string, engineId: string) => {
    setTestStates((prev) => ({ ...prev, [modality]: { status: "testing" } }));
    try {
      const res = await fetch("/api/admin/test-engine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ engineId }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestStates((prev) => ({ ...prev, [modality]: { status: "ok", latencyMs: data.latencyMs, preview: data.preview } }));
      } else {
        setTestStates((prev) => ({ ...prev, [modality]: { status: "error", message: data.error ?? "Test failed" } }));
      }
    } catch (e) {
      setTestStates((prev) => ({ ...prev, [modality]: { status: "error", message: e instanceof Error ? e.message : "Network error" } }));
    }
  };

  const groups = groupByProvider(engines);

  const update = (modality: string, patch: Partial<Row>) => {
    setRows((prev) =>
      prev.map((r) => (r.modality === modality ? { ...r, ...patch } : r)),
    );
    setDirty(true);
    setSaved(false);
  };

  const handleSave = () => {
    setError(null);
    startTransition(async () => {
      try {
        await updateModalityMappings(rows);
        setDirty(false);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  };

  return (
    <div className="rounded-xl border border-border bg-surface overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="bg-surface-2 border-b border-border">
            {["Modality", "Primary (generator)", "Fallback", "Questioner", "Validator", "Aktif", ""].map((h, i) => (
              <th key={i} className="px-4 py-3 text-left font-medium text-text-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.modality} className="border-t border-border hover:bg-surface-2/40 transition-colors">
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">{MODALITY_ICONS[r.modality]}</span>
                  <span className="font-medium">{MODALITY_LABELS[r.modality] ?? r.modality}</span>
                  {r.isEnabled && r.primaryId ? (
                    <span
                      className="inline-flex items-center rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-semibold text-success"
                      title="Pipeline reads this mapping at runtime"
                    >
                      ACTIVE
                    </span>
                  ) : null}
                </div>
              </td>
              <td className="px-4 py-3">
                <EngineSelect
                  value={r.primaryId ?? ""}
                  onChange={(v) => update(r.modality, { primaryId: v || null })}
                  groups={groups}
                  placeholder="— not selected —"
                />
              </td>
              <td className="px-4 py-3">
                <EngineSelect
                  value={r.fallbackId ?? ""}
                  onChange={(v) => update(r.modality, { fallbackId: v || null })}
                  groups={groups}
                  placeholder="— no fallback —"
                />
              </td>
              <td className="px-4 py-3">
                <EngineSelect
                  value={r.questionerId ?? ""}
                  onChange={(v) => update(r.modality, { questionerId: v || null })}
                  groups={groups}
                  placeholder="— primary is used —"
                />
              </td>
              <td className="px-4 py-3">
                <EngineSelect
                  value={r.validatorId ?? ""}
                  onChange={(v) => update(r.modality, { validatorId: v || null })}
                  groups={groups}
                  placeholder="— none —"
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  className="accent-primary h-4 w-4"
                  checked={r.isEnabled}
                  onChange={(e) => update(r.modality, { isEnabled: e.target.checked })}
                />
              </td>
              <td className="px-4 py-3">
                {(() => {
                  const ts = testStates[r.modality] ?? { status: "idle" };
                  const testId = r.primaryId;
                  return (
                    <div className="flex flex-col gap-0.5">
                      <button
                        disabled={!testId || ts.status === "testing"}
                        onClick={() => testId && runTest(r.modality, testId)}
                        className="text-sm text-primary hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {ts.status === "testing" ? "Testing…" : "Test"}
                      </button>
                      {ts.status === "ok" && (
                        <span className="text-[11px] text-success">{ts.latencyMs}ms — {ts.preview}</span>
                      )}
                      {ts.status === "error" && (
                        <span className="text-[11px] text-error">{ts.message}</span>
                      )}
                    </div>
                  );
                })()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-surface-2">
        <div className="text-sm">
          {saved && !dirty && <span className="text-success">Saved ✓</span>}
          {error && <span className="text-error">{error}</span>}
          {dirty && !saved && <span className="text-text-faint text-xs">Unsaved changes</span>}
        </div>
        <Button size="sm" disabled={!dirty || pending} onClick={handleSave}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}
