"use client";

import * as React from "react";
import { Upload, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { importLibraryFile, type ImportProgress } from "@/server/actions/admin-library-import";

const ACCEPTED = ".md,.json,.jsonl,.csv,.yaml,.yml,.txt";
const MODALITIES = ["text", "image", "video", "audio", "code"];

type Engine = { id: string; name: string; isDefault: boolean };

export function LibraryImportClient({
  embeddingEngines,
  hasTranslationEngine,
}: {
  embeddingEngines: Engine[];
  hasTranslationEngine: boolean;
}) {
  const [file, setFile] = React.useState<File | null>(null);
  const [sourceLabel, setSourceLabel] = React.useState("admin_upload");
  const [defaultModality, setDefaultModality] = React.useState("text");
  const [autoEmbed, setAutoEmbed] = React.useState(embeddingEngines.length > 0);
  const [dryRun, setDryRun] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<ImportProgress | null>(null);
  const [error, setError] = React.useState("");

  const fileRef = React.useRef<HTMLInputElement>(null);

  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const content = await file.text();
      const progress = await importLibraryFile(file.name, content, {
        sourceLabel,
        defaultModality,
        autoEmbed,
        dryRun,
      });
      setResult(progress);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-[720px] flex flex-col gap-5">
      {/* File picker */}
      <div
        className="rounded-xl border-2 border-dashed border-border bg-surface p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); }}
        onDrop={(e) => {
          e.preventDefault();
          const dropped = e.dataTransfer.files[0];
          if (dropped) setFile(dropped);
        }}
      >
        <Upload className="h-8 w-8 text-text-faint" />
        {file ? (
          <div className="text-center">
            <p className="font-medium">{file.name}</p>
            <p className="text-xs text-text-muted">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : (
          <div className="text-center">
            <p className="font-medium text-sm">Drop file here or click to browse</p>
            <p className="text-xs text-text-muted mt-0.5">Supported: {ACCEPTED}</p>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED}
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>

      {/* Options */}
      <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
        <h3 className="font-semibold text-sm">Import options</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1">Source label</Label>
            <input
              className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={sourceLabel}
              onChange={(e) => setSourceLabel(e.target.value)}
              placeholder="admin_upload"
            />
          </div>
          <div>
            <Label className="text-xs mb-1">Default modality</Label>
            <select
              className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={defaultModality}
              onChange={(e) => setDefaultModality(e.target.value)}
            >
              {MODALITIES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="accent-primary"
              checked={autoEmbed}
              disabled={embeddingEngines.length === 0}
              onChange={(e) => setAutoEmbed(e.target.checked)}
            />
            <span>Auto-embed after import</span>
            {embeddingEngines.length === 0 && (
              <span className="text-xs text-text-faint">(add an embedding engine first)</span>
            )}
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="accent-primary"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
            />
            <span>Dry run (parse only, don&apos;t save)</span>
          </label>
        </div>

        {!hasTranslationEngine && (
          <div className="flex items-start gap-2 text-xs text-warning bg-warning/10 rounded-md p-3">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>No translation engine configured. Non-English prompts will be imported as-is. Set one in <strong>Settings → Library AI</strong>.</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          disabled={!file || loading}
          onClick={handleImport}
        >
          {loading ? (dryRun ? "Parsing…" : "Importing…") : (dryRun ? "Dry run" : "Import")}
        </Button>
        {file && (
          <Button variant="ghost" onClick={() => { setFile(null); setResult(null); }}>
            Clear
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-error bg-error/10 rounded-md p-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <h3 className="font-semibold text-sm">{dryRun ? "Dry run complete" : "Import complete"}</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Parsed", value: result.parsed, sub: `of ${result.total} total` },
              { label: "Translated", value: result.translated, sub: "non-English" },
              { label: "Saved", value: result.saved, color: "text-success" },
              { label: "Embedded", value: result.embedded, sub: "vectors" },
              { label: "Duplicates", value: result.duplicates, sub: "skipped" },
              { label: "Errors", value: result.errors.length, color: result.errors.length > 0 ? "text-error" : "" },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="bg-surface-2 rounded-lg p-3">
                <div className={`text-2xl font-semibold ${color ?? ""}`}>{value}</div>
                <div className="text-xs font-medium mt-0.5">{label}</div>
                {sub && <div className="text-[11px] text-text-faint">{sub}</div>}
              </div>
            ))}
          </div>

          {result.errors.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold text-error">Errors ({result.errors.length})</p>
              <div className="rounded-md bg-error/5 p-3 text-xs text-error font-mono max-h-40 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
