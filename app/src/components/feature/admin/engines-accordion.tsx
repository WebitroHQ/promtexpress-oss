"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, KeyRound } from "lucide-react";
import { EngineSwitch } from "./engine-switch";
import { EngineConfigureDialog } from "./engine-configure-dialog";
import { EngineCapabilitiesDialog, type EngineCapabilitiesValues } from "./engine-capabilities-dialog";

type Engine = {
  id: string;
  name: string;
  modelId: string;
  provider: string;
  cost: number;
  unitType: string;
  enabled: boolean;
  hasKey: boolean;
  capabilities: EngineCapabilitiesValues;
};

type ProviderGroup = {
  provider: string;
  label: string;
  engines: Engine[];
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

function formatCost(cost: number, unitType: string) {
  const unit =
    unitType === "image"         ? "/ img"  :
    unitType === "audio_minute"  ? "/ min"  :
    unitType === "video_second"  ? "/ sec"  : "/ 1k tok";
  return `$${cost.toFixed(4)} ${unit}`;
}

function ProviderSection({ group, defaultOpen }: { group: ProviderGroup; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const keyCount   = group.engines.filter((e) => e.hasKey).length;
  const activeCount = group.engines.filter((e) => e.enabled).length;
  const total      = group.engines.length;

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Provider header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-surface-2 hover:bg-surface-3 transition-colors text-left"
      >
        <span className="text-text-muted">
          {open
            ? <ChevronDown className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />}
        </span>
        <span className="font-semibold text-sm flex-1">{group.label}</span>
        <span className="text-xs text-text-faint">{total} model</span>
        <span className="flex items-center gap-1 text-xs text-text-faint">
          <KeyRound className="h-3 w-3" />
          {keyCount}/{total}
        </span>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
          activeCount > 0
            ? "bg-success/15 text-success"
            : "bg-surface-3 text-text-faint"
        }`}>
          {activeCount} aktif
        </span>
      </button>

      {/* Engine rows */}
      {open && (
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-t border-border bg-surface">
              {["Model", "Model ID", "Maliyet", "Aktif", ""].map((h, i) => (
                <th key={i} className="px-4 py-2 text-left text-[11px] font-medium text-text-faint uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.engines.map((e) => (
              <tr key={e.id} className="border-t border-border hover:bg-surface-2/50 transition-colors">
                <td className="px-4 py-2.5 font-medium">{e.name}</td>
                <td className="px-4 py-2.5">
                  <code className="text-xs text-text-faint bg-surface-3 px-1.5 py-0.5 rounded">
                    {e.modelId}
                  </code>
                </td>
                <td className="px-4 py-2.5 tabular-nums text-text-muted text-xs">
                  {formatCost(e.cost, e.unitType)}
                </td>
                <td className="px-4 py-2.5">
                  <EngineSwitch engineId={e.id} enabled={e.enabled} />
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <EngineConfigureDialog
                      engineId={e.id}
                      engineName={e.name}
                      hasKey={e.hasKey}
                    />
                    <EngineCapabilitiesDialog
                      engineId={e.id}
                      engineName={e.name}
                      initial={e.capabilities}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export function EnginesAccordion({ engines }: { engines: Engine[] }) {
  // Group by provider
  const grouped: Record<string, Engine[]> = {};
  for (const e of engines) {
    if (!grouped[e.provider]) grouped[e.provider] = [];
    grouped[e.provider].push(e);
  }

  const groups: ProviderGroup[] = PROVIDER_ORDER
    .filter((p) => grouped[p])
    .map((p) => ({
      provider: p,
      label: PROVIDER_LABELS[p] ?? p.charAt(0).toUpperCase() + p.slice(1),
      engines: grouped[p],
    }));

  // Also handle unknown providers
  for (const p of Object.keys(grouped)) {
    if (!PROVIDER_ORDER.includes(p)) {
      groups.push({
        provider: p,
        label: p.charAt(0).toUpperCase() + p.slice(1),
        engines: grouped[p],
      });
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {groups.map((g, i) => (
        <ProviderSection key={g.provider} group={g} defaultOpen={i === 0} />
      ))}
    </div>
  );
}
