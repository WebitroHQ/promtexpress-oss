"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Zap, Trash2, Save, ArrowLeft, CheckCircle, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateExemplar, updateExemplarStatus, embedExemplar, deleteExemplar, translateExemplar } from "@/server/actions/admin-library";

type Exemplar = {
  id: string;
  title: string;
  prompt: string;
  expectedOutput: string;
  modality: string;
  subCategory: string;
  intentTags: string[];
  targetEngineId: string;
  status: string;
  qualityScore: number | null;
  notes: string;
  source: string;
  sourceFile: string;
  contentLength: number;
  embeddedAt: string | null;
  embeddingModel: string | null;
  runCount: number;
  successCount: number;
  createdAt: string;
};

type TargetEngine = { id: string; name: string; slug: string; modality: string };

const STATUSES = ["REVIEW", "VERIFIED", "GOLD", "ARCHIVED", "REJECTED"] as const;
const STATUS_COLORS: Record<string, string> = {
  REVIEW:   "border-warning text-warning",
  VERIFIED: "border-primary text-primary",
  GOLD:     "border-yellow-500 text-yellow-600",
  ARCHIVED: "border-border text-text-faint",
  REJECTED: "border-error text-error",
};

export function LibraryDetailClient({
  exemplar: initial,
  targetEngines,
}: {
  exemplar: Exemplar;
  targetEngines: TargetEngine[];
}) {
  const router = useRouter();
  const [ex, setEx] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const [embedding, setEmbedding] = React.useState(false);
  const [translating, setTranslating] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [translateMsg, setTranslateMsg] = React.useState<string | null>(null);
  const [tagsInput, setTagsInput] = React.useState(initial.intentTags.join(", "));

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await updateExemplar(ex.id, {
        title: ex.title,
        prompt: ex.prompt,
        expectedOutput: ex.expectedOutput,
        modality: ex.modality,
        subCategory: ex.subCategory,
        intentTags: tagsInput.split(",").map((t) => t.trim()).filter(Boolean),
        targetEngineId: ex.targetEngineId || null,
        qualityScore: ex.qualityScore,
        notes: ex.notes,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status: typeof STATUSES[number]) {
    await updateExemplarStatus(ex.id, status);
    setEx((e) => ({ ...e, status }));
  }

  async function handleEmbed() {
    setEmbedding(true);
    try {
      const result = await embedExemplar(ex.id);
      if (result.success) {
        setEx((e) => ({ ...e, embeddedAt: new Date().toISOString() }));
      } else {
        alert(result.error ?? "Embedding failed");
      }
    } finally {
      setEmbedding(false);
    }
  }

  async function handleTranslate() {
    setTranslating(true);
    setTranslateMsg(null);
    try {
      const result = await translateExemplar(ex.id);
      if (result.success) {
        if (result.translated) {
          setTranslateMsg("Translated to English");
          // refresh prompt text from server — just reload
          router.refresh();
        } else {
          setTranslateMsg("Already English");
        }
        setTimeout(() => setTranslateMsg(null), 3000);
      } else {
        alert(result.error ?? "Translation failed");
      }
    } finally {
      setTranslating(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this prompt? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteExemplar(ex.id);
      router.push("/pr/yonet/library");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-[860px] flex flex-col gap-5">
      {/* Top bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.push("/pr/yonet/library")}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Library
        </Button>

        <div className="flex gap-1 ml-auto flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => handleStatusChange(s)}
              className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                ex.status === s ? STATUS_COLORS[s] : "border-transparent text-text-muted hover:border-border"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <Button size="sm" variant="ghost" disabled={embedding} onClick={handleEmbed}>
          <Zap className="h-3.5 w-3.5 mr-1" />
          {embedding ? "Embedding…" : ex.embeddedAt ? "Re-embed" : "Embed"}
        </Button>

        <Button size="sm" variant="ghost" disabled={translating} onClick={handleTranslate} title="Detect language and translate to English if needed">
          <Languages className="h-3.5 w-3.5 mr-1" />
          {translating ? "Translating…" : translateMsg ?? "Translate"}
        </Button>

        <Button size="sm" disabled={saving} onClick={handleSave}>
          {saved ? <CheckCircle className="h-3.5 w-3.5 mr-1 text-success" /> : <Save className="h-3.5 w-3.5 mr-1" />}
          {saved ? "Saved!" : saving ? "Saving…" : "Save"}
        </Button>

        <Button size="sm" variant="ghost" disabled={deleting} onClick={handleDelete}>
          <Trash2 className="h-3.5 w-3.5 text-error" />
        </Button>
      </div>

      {/* Meta strip */}
      <div className="flex gap-4 text-xs text-text-muted flex-wrap">
        <span>Source: <strong>{ex.source}</strong></span>
        {ex.sourceFile && <span>File: <strong>{ex.sourceFile}</strong></span>}
        <span>Length: <strong>{ex.contentLength.toLocaleString()}</strong> chars</span>
        <span>Runs: <strong>{ex.runCount}</strong> / success: <strong>{ex.successCount}</strong></span>
        {ex.embeddedAt && <span>Embedded: <strong>{new Date(ex.embeddedAt).toLocaleDateString()}</strong> ({ex.embeddingModel})</span>}
        <span>Created: <strong>{new Date(ex.createdAt).toLocaleDateString()}</strong></span>
      </div>

      {/* Form */}
      <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
        <div>
          <Label className="text-xs mb-1">Title</Label>
          <Input value={ex.title} onChange={(e) => setEx((p) => ({ ...p, title: e.target.value }))} placeholder="Optional" />
        </div>

        <div>
          <Label className="text-xs mb-1">Prompt *</Label>
          <textarea
            className="w-full min-h-[200px] rounded-md border border-border bg-surface px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
            value={ex.prompt}
            onChange={(e) => setEx((p) => ({ ...p, prompt: e.target.value }))}
          />
        </div>

        <div>
          <Label className="text-xs mb-1">Expected output</Label>
          <textarea
            className="w-full min-h-[80px] rounded-md border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
            value={ex.expectedOutput}
            onChange={(e) => setEx((p) => ({ ...p, expectedOutput: e.target.value }))}
            placeholder="Optional example output"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs mb-1">Modality</Label>
            <select
              className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={ex.modality}
              onChange={(e) => setEx((p) => ({ ...p, modality: e.target.value }))}
            >
              {["text","image","video","audio","code"].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs mb-1">Sub-category</Label>
            <Input value={ex.subCategory} onChange={(e) => setEx((p) => ({ ...p, subCategory: e.target.value }))} placeholder="e.g. marketing" />
          </div>
          <div>
            <Label className="text-xs mb-1">Target AI</Label>
            <select
              className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={ex.targetEngineId}
              onChange={(e) => setEx((p) => ({ ...p, targetEngineId: e.target.value }))}
            >
              <option value="">(generic)</option>
              {targetEngines.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <Label className="text-xs mb-1">Quality score (0–100)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={ex.qualityScore ?? ""}
              onChange={(e) => setEx((p) => ({ ...p, qualityScore: e.target.value ? Number(e.target.value) : null }))}
              placeholder="—"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs mb-1">Intent tags (comma-separated)</Label>
          <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="marketing, copywriting, email" />
        </div>

        <div>
          <Label className="text-xs mb-1">Notes</Label>
          <Input value={ex.notes} onChange={(e) => setEx((p) => ({ ...p, notes: e.target.value }))} placeholder="Internal notes" />
        </div>
      </div>
    </div>
  );
}
