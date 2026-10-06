"use client";

import * as React from "react";
import { CheckCircle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { setTranslationEngine } from "@/server/actions/admin-app-settings";

type AiEngine = { id: string; name: string; provider: string; modelId: string };

export function LibrarySettingsClient({
  aiEngines,
  currentTranslationEngineId,
}: {
  aiEngines: AiEngine[];
  currentTranslationEngineId: string;
}) {
  const [translationEngineId, setTranslationEngineId] = React.useState(currentTranslationEngineId);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await setTranslationEngine(translationEngineId);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  const selected = aiEngines.find((e) => e.id === translationEngineId);

  return (
    <div className="max-w-[640px] flex flex-col gap-5">

      {/* Translation Engine */}
      <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-4">
        <div>
          <h3 className="font-semibold text-[15px]">Translation Engine</h3>
          <p className="text-sm text-text-muted mt-1">
            Used to auto-translate non-English prompts to English during library import.
            Select any active AI engine — any chat model works.
          </p>
        </div>

        {aiEngines.length === 0 ? (
          <div className="rounded-lg bg-warning/10 border border-warning/30 p-4 text-sm text-warning">
            No active AI engines found. Go to{" "}
            <a href="/pr/yonet/engines" className="underline font-medium">
              Engines
            </a>{" "}
            and add an API key first.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <Label className="text-xs mb-2">Select engine</Label>
              <div className="flex flex-col gap-2">
                {aiEngines.map((engine) => (
                  <button
                    key={engine.id}
                    onClick={() => setTranslationEngineId(engine.id)}
                    className={`text-left rounded-xl border p-3.5 transition-colors flex items-center gap-3 ${
                      translationEngineId === engine.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40 hover:bg-surface-2"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        translationEngineId === engine.id
                          ? "border-primary bg-primary"
                          : "border-border"
                      }`}
                    >
                      {translationEngineId === engine.id && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{engine.name}</div>
                      <div className="text-xs text-text-faint font-mono mt-0.5">
                        {engine.provider} / {engine.modelId}
                      </div>
                    </div>
                    {translationEngineId === engine.id && (
                      <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}

                <button
                  onClick={() => setTranslationEngineId("")}
                  className={`text-left rounded-xl border p-3.5 transition-colors flex items-center gap-3 ${
                    !translationEngineId
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-surface-2"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      !translationEngineId ? "border-primary bg-primary" : "border-border"
                    }`}
                  >
                    {!translationEngineId && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm text-text-muted">(not set)</div>
                    <div className="text-xs text-text-faint mt-0.5">
                      Non-English prompts will be imported as-is without translation
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {selected && (
              <div className="rounded-lg bg-surface-2 border border-border px-4 py-3 text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-success shrink-0" />
                <span>
                  <strong>{selected.name}</strong> will translate incoming library uploads to English.
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <Button disabled={saving} onClick={handleSave}>
            {saved ? (
              <>
                <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-primary-text" />
                Saved!
              </>
            ) : saving ? (
              "Saving…"
            ) : (
              "Save"
            )}
          </Button>
          <a
            href="/pr/yonet/engines"
            className="text-xs text-text-muted hover:text-primary transition-colors inline-flex items-center gap-1"
          >
            Manage engines <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-3">
        <h3 className="font-semibold text-sm">How it works</h3>
        <ul className="text-sm text-text-muted flex flex-col gap-2">
          <li className="flex gap-2">
            <span className="text-primary font-bold shrink-0">1.</span>
            Admin uploads a file via <a href="/pr/yonet/library/import" className="text-primary hover:underline">Library → Import</a>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold shrink-0">2.</span>
            Each prompt is language-detected automatically
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold shrink-0">3.</span>
            Non-English prompts are sent to the Translation Engine above → converted to English
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold shrink-0">4.</span>
            Prompt is SHA-256 deduped, saved to library with status <strong>REVIEW</strong>
          </li>
          <li className="flex gap-2">
            <span className="text-primary font-bold shrink-0">5.</span>
            If "Auto-embed" is checked during import, the default Embedding Engine vectorizes it
          </li>
        </ul>
      </div>

    </div>
  );
}
