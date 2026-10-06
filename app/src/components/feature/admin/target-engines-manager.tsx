"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  createTargetEngine,
  updateTargetEngine,
  deleteTargetEngine,
} from "@/server/actions/admin-target-engines";

interface Item {
  id: string;
  slug: string;
  name: string;
  provider: string | null;
  modality: string;
  promptStyleHint: string;
  iconUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  tier: string | null;
  capabilities: string[];
  releasedAt: Date | string | null;
  brandColor: string | null;
  preferredLanguage: string | null;
  charLimit: number | null;
  preferredFormat: string | null;
  requiresEnglish: boolean;
  negativePromptSupport: boolean;
  structuredFieldSpec: unknown;
  parameterHints: unknown;
  authoringTipsMd: string | null;
}

const MODALITIES = ["text", "code", "image", "video", "audio", "music", "math", "slides", "diagram", "3d", "document"];
const FORMATS = ["", "plain", "json", "markdown", "structured", "parameterized"] as const;

function jsonString(v: unknown): string {
  if (v === null || v === undefined) return "";
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return "";
  }
}
const TIERS = ["", "flagship", "standard", "legacy"] as const;
const CAPABILITIES = [
  "multimodal",
  "reasoning",
  "long-context",
  "cheap",
  "open-weights",
  "fast",
] as const;

// ISO 639-1 (yaygın) + "multilingual" özel değeri
const PREFERRED_LANGUAGES = [
  { value: "", label: "(none — user's language)" },
  { value: "multilingual", label: "Multilingual (preserve user)" },
  { value: "en", label: "English" },
  { value: "tr", label: "Turkish" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "pt", label: "Portuguese" },
  { value: "ru", label: "Russian" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "ar", label: "Arabic" },
  { value: "hi", label: "Hindi" },
];

function toDateInput(d: Date | string | null): string {
  if (!d) return "";
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function TargetEnginesManager({ items }: { items: Item[] }) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<Item | null>(null);
  const [draft, setDraft] = React.useState({
    slug: "",
    name: "",
    provider: "",
    modality: "text",
    promptStyleHint: "",
    iconUrl: "",
    tier: "",
    capabilities: [] as string[],
    releasedAt: "",
    brandColor: "",
    preferredLanguage: "",
  });

  const handleCreate = () => {
    setError(null);
    startTransition(async () => {
      try {
        await createTargetEngine({
          slug: draft.slug,
          name: draft.name,
          provider: draft.provider || null,
          modality: draft.modality,
          promptStyleHint: draft.promptStyleHint,
          iconUrl: draft.iconUrl || null,
          tier: draft.tier || null,
          capabilities: draft.capabilities,
          releasedAt: draft.releasedAt || null,
          brandColor: draft.brandColor || null,
          preferredLanguage: draft.preferredLanguage || null,
        });
        setDraft({
          slug: "",
          name: "",
          provider: "",
          modality: "text",
          promptStyleHint: "",
          iconUrl: "",
          tier: "",
          capabilities: [],
          releasedAt: "",
          brandColor: "",
          preferredLanguage: "",
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Create failed");
      }
    });
  };

  const handleToggle = (id: string, isActive: boolean) =>
    startTransition(async () => {
      try {
        await updateTargetEngine(id, { isActive });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      }
    });

  const handleDelete = (id: string) => {
    if (!confirm("Delete this target engine?")) return;
    startTransition(async () => {
      try {
        await deleteTargetEngine(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed");
      }
    });
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    setError(null);
    startTransition(async () => {
      try {
        await updateTargetEngine(editing.id, {
          name: editing.name,
          provider: editing.provider,
          modality: editing.modality,
          promptStyleHint: editing.promptStyleHint,
          iconUrl: editing.iconUrl,
          tier: editing.tier,
          capabilities: editing.capabilities,
          releasedAt: editing.releasedAt,
          brandColor: editing.brandColor,
          preferredLanguage: editing.preferredLanguage,
          charLimit: editing.charLimit,
          preferredFormat: editing.preferredFormat,
          requiresEnglish: editing.requiresEnglish,
          negativePromptSupport: editing.negativePromptSupport,
          structuredFieldSpec: editing.structuredFieldSpec,
          parameterHints: editing.parameterHints,
          authoringTipsMd: editing.authoringTipsMd,
        });
        setEditing(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      }
    });
  };

  const grouped = MODALITIES.map((m) => ({
    modality: m,
    rows: items.filter((i) => i.modality === m),
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Create form */}
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-medium mb-3">Add target AI</p>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
          <input
            className="h-9 rounded-md border border-border bg-bg px-2 text-sm"
            placeholder="slug"
            value={draft.slug}
            onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
          />
          <input
            className="h-9 rounded-md border border-border bg-bg px-2 text-sm"
            placeholder="Name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
          <input
            className="h-9 rounded-md border border-border bg-bg px-2 text-sm"
            placeholder="Provider"
            value={draft.provider}
            onChange={(e) => setDraft({ ...draft, provider: e.target.value })}
          />
          <select
            className="h-9 rounded-md border border-border bg-bg px-2 text-sm"
            value={draft.modality}
            onChange={(e) => setDraft({ ...draft, modality: e.target.value })}
          >
            {MODALITIES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-border bg-bg px-2 text-sm"
            value={draft.tier}
            onChange={(e) => setDraft({ ...draft, tier: e.target.value })}
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>{t || "(no tier)"}</option>
            ))}
          </select>
          <Button size="sm" disabled={pending} onClick={handleCreate}>
            {pending ? "…" : "Add"}
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
          <input
            className="h-9 rounded-md border border-border bg-bg px-2 text-sm"
            placeholder="Icon URL (optional)"
            value={draft.iconUrl}
            onChange={(e) => setDraft({ ...draft, iconUrl: e.target.value })}
          />
          <input
            type="date"
            className="h-9 rounded-md border border-border bg-bg px-2 text-sm"
            placeholder="Released at"
            value={draft.releasedAt}
            onChange={(e) => setDraft({ ...draft, releasedAt: e.target.value })}
          />
          <input
            type="color"
            className="h-9 w-full rounded-md border border-border bg-bg px-2 text-sm"
            value={draft.brandColor || "#000000"}
            onChange={(e) => setDraft({ ...draft, brandColor: e.target.value })}
            title="Brand color"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
          <select
            className="h-9 rounded-md border border-border bg-bg px-2 text-sm"
            value={draft.preferredLanguage}
            onChange={(e) => setDraft({ ...draft, preferredLanguage: e.target.value })}
            title="Output language preference"
          >
            {PREFERRED_LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>{l.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {CAPABILITIES.map((c) => (
            <label key={c} className="text-xs flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.capabilities.includes(c)}
                onChange={(e) => {
                  setDraft({
                    ...draft,
                    capabilities: e.target.checked
                      ? [...draft.capabilities, c]
                      : draft.capabilities.filter((x) => x !== c),
                  });
                }}
              />
              {c}
            </label>
          ))}
        </div>
        <textarea
          className="mt-2 w-full min-h-[60px] rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
          placeholder="Prompt style hint — how a prompt should be shaped for this AI"
          value={draft.promptStyleHint}
          onChange={(e) => setDraft({ ...draft, promptStyleHint: e.target.value })}
        />
        {error && <p className="text-xs text-error mt-2">{error}</p>}
      </div>

      {/* Lists */}
      {grouped.map((g) => (
        <div key={g.modality} className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-surface-2 border-b border-border">
            <span className="text-sm font-medium capitalize">{g.modality}</span>
            <span className="text-xs text-text-faint">{g.rows.length}</span>
          </div>
          {g.rows.length === 0 ? (
            <p className="px-4 py-4 text-sm text-text-faint">No target engines yet.</p>
          ) : (
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-text-muted">
                  <th className="px-4 py-2 text-left font-medium">Slug</th>
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Tier</th>
                  <th className="px-4 py-2 text-left font-medium">Caps</th>
                  <th className="px-4 py-2 text-left font-medium">Active</th>
                  <th className="px-4 py-2 text-left font-medium" />
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-2 font-mono text-xs">{r.slug}</td>
                    <td className="px-4 py-2">
                      <span className="flex items-center gap-2">
                        {r.brandColor && (
                          <span
                            className="inline-block h-3 w-3 rounded-sm border border-border"
                            style={{ backgroundColor: r.brandColor }}
                            title={r.brandColor}
                          />
                        )}
                        {r.name}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {r.tier ?? <span className="text-text-faint">—</span>}
                    </td>
                    <td className="px-4 py-2 text-xs text-text-muted">
                      {r.capabilities.length === 0 ? (
                        <span className="text-text-faint">—</span>
                      ) : (
                        r.capabilities.join(", ")
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        className="accent-primary h-4 w-4"
                        checked={r.isActive}
                        onChange={(e) => handleToggle(r.id, e.target.checked)}
                        disabled={pending}
                      />
                    </td>
                    <td className="px-4 py-2 text-right whitespace-nowrap">
                      <button
                        className="text-xs text-primary hover:underline mr-3"
                        onClick={() => setEditing(r)}
                        disabled={pending}
                      >
                        Edit
                      </button>
                      <button
                        className="text-xs text-error hover:underline disabled:opacity-40"
                        onClick={() => handleDelete(r.id)}
                        disabled={pending}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      {/* Edit dialog */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              Edit {editing?.name} <span className="font-mono text-xs text-text-faint">({editing?.slug})</span>
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-text-muted">
                  Name
                  <input
                    className="mt-1 h-9 w-full rounded-md border border-border bg-bg px-2 text-sm"
                    value={editing.name}
                    onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  />
                </label>
                <label className="text-xs text-text-muted">
                  Provider
                  <input
                    className="mt-1 h-9 w-full rounded-md border border-border bg-bg px-2 text-sm"
                    value={editing.provider ?? ""}
                    onChange={(e) => setEditing({ ...editing, provider: e.target.value || null })}
                  />
                </label>
                <label className="text-xs text-text-muted">
                  Modality
                  <select
                    className="mt-1 h-9 w-full rounded-md border border-border bg-bg px-2 text-sm"
                    value={editing.modality}
                    onChange={(e) => setEditing({ ...editing, modality: e.target.value })}
                  >
                    {MODALITIES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-text-muted">
                  Tier
                  <select
                    className="mt-1 h-9 w-full rounded-md border border-border bg-bg px-2 text-sm"
                    value={editing.tier ?? ""}
                    onChange={(e) => setEditing({ ...editing, tier: e.target.value || null })}
                  >
                    {TIERS.map((t) => (
                      <option key={t} value={t}>{t || "(no tier)"}</option>
                    ))}
                  </select>
                </label>
                <label className="text-xs text-text-muted">
                  Released at
                  <input
                    type="date"
                    className="mt-1 h-9 w-full rounded-md border border-border bg-bg px-2 text-sm"
                    value={toDateInput(editing.releasedAt)}
                    onChange={(e) => setEditing({ ...editing, releasedAt: e.target.value || null })}
                  />
                </label>
                <label className="text-xs text-text-muted">
                  Brand color
                  <input
                    type="color"
                    className="mt-1 h-9 w-full rounded-md border border-border bg-bg px-2 text-sm"
                    value={editing.brandColor ?? "#000000"}
                    onChange={(e) => setEditing({ ...editing, brandColor: e.target.value })}
                  />
                </label>
                <label className="text-xs text-text-muted col-span-2">
                  Output language preference
                  <select
                    className="mt-1 h-9 w-full rounded-md border border-border bg-bg px-2 text-sm"
                    value={editing.preferredLanguage ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, preferredLanguage: e.target.value || null })
                    }
                  >
                    {PREFERRED_LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="text-xs text-text-muted">
                Icon URL
                <input
                  className="mt-1 h-9 w-full rounded-md border border-border bg-bg px-2 text-sm"
                  value={editing.iconUrl ?? ""}
                  onChange={(e) => setEditing({ ...editing, iconUrl: e.target.value || null })}
                />
              </label>
              <div>
                <p className="text-xs text-text-muted mb-1">Capabilities</p>
                <div className="flex flex-wrap gap-2">
                  {CAPABILITIES.map((c) => (
                    <label key={c} className="text-xs flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editing.capabilities.includes(c)}
                        onChange={(e) => {
                          setEditing({
                            ...editing,
                            capabilities: e.target.checked
                              ? [...editing.capabilities, c]
                              : editing.capabilities.filter((x) => x !== c),
                          });
                        }}
                      />
                      {c}
                    </label>
                  ))}
                </div>
              </div>
              <label className="text-xs text-text-muted">
                Prompt style hint
                <textarea
                  className="mt-1 w-full min-h-[80px] rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
                  value={editing.promptStyleHint}
                  onChange={(e) => setEditing({ ...editing, promptStyleHint: e.target.value })}
                />
              </label>

              {/* Authoring criteria — synthesizer reads these to shape output */}
              <div className="rounded-md border border-border bg-bg/50 p-3">
                <p className="text-xs font-medium mb-2">Authoring criteria (synthesizer reads these)</p>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-xs text-text-muted">
                    Char limit
                    <input
                      type="number"
                      min={1}
                      className="mt-1 h-9 w-full rounded-md border border-border bg-bg px-2 text-sm"
                      value={editing.charLimit ?? ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          charLimit: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      placeholder="e.g. 6000"
                    />
                  </label>
                  <label className="text-xs text-text-muted">
                    Preferred format
                    <select
                      className="mt-1 h-9 w-full rounded-md border border-border bg-bg px-2 text-sm"
                      value={editing.preferredFormat ?? ""}
                      onChange={(e) =>
                        setEditing({ ...editing, preferredFormat: e.target.value || null })
                      }
                    >
                      {FORMATS.map((f) => (
                        <option key={f} value={f}>{f || "(no preference — plain)"}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-2 flex flex-wrap gap-3">
                  <label className="text-xs flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editing.requiresEnglish}
                      onChange={(e) => setEditing({ ...editing, requiresEnglish: e.target.checked })}
                    />
                    Requires English output
                  </label>
                  <label className="text-xs flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editing.negativePromptSupport}
                      onChange={(e) =>
                        setEditing({ ...editing, negativePromptSupport: e.target.checked })
                      }
                    />
                    Supports negative prompts
                  </label>
                </div>
                <label className="text-xs text-text-muted block mt-2">
                  Structured field spec (JSON, when format=structured)
                  <textarea
                    className="mt-1 w-full min-h-[60px] rounded-md border border-border bg-bg px-2 py-1.5 text-sm font-mono"
                    value={jsonString(editing.structuredFieldSpec)}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      setEditing({ ...editing, structuredFieldSpec: v ? v : null });
                    }}
                    placeholder='{"genre":"string","bpm":"int","mood":"string"}'
                  />
                </label>
                <label className="text-xs text-text-muted block mt-2">
                  Parameter hints (JSON, e.g. CLI flags)
                  <textarea
                    className="mt-1 w-full min-h-[60px] rounded-md border border-border bg-bg px-2 py-1.5 text-sm font-mono"
                    value={jsonString(editing.parameterHints)}
                    onChange={(e) => {
                      const v = e.target.value.trim();
                      setEditing({ ...editing, parameterHints: v ? v : null });
                    }}
                    placeholder='{"--ar":"16:9","--v":"6"}'
                  />
                </label>
                <label className="text-xs text-text-muted block mt-2">
                  Authoring tips (Markdown, freeform)
                  <textarea
                    className="mt-1 w-full min-h-[60px] rounded-md border border-border bg-bg px-2 py-1.5 text-sm"
                    value={editing.authoringTipsMd ?? ""}
                    onChange={(e) =>
                      setEditing({ ...editing, authoringTipsMd: e.target.value || null })
                    }
                    placeholder="Best practices when authoring prompts for this target tool…"
                  />
                </label>
              </div>

              {error && <p className="text-xs text-error">{error}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEditing(null)} disabled={pending}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={pending}>
              {pending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
