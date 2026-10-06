"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  createQuestionTemplate,
  updateQuestionTemplate,
  deleteQuestionTemplate,
} from "@/server/actions/admin-questions";

interface Item {
  id: string;
  modality: string;
  category: string | null;
  question: string;
  options: string[];
  weight: number;
  isActive: boolean;
}

const MODALITIES = ["text", "code", "image", "video", "audio", "music"];

export function QuestionsManager({ items }: { items: Item[] }) {
  const [pending, startTransition] = React.useTransition();
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState({
    modality: "text",
    category: "",
    question: "",
    optionsCsv: "",
    weight: "0",
  });

  const handleCreate = () => {
    setError(null);
    startTransition(async () => {
      try {
        await createQuestionTemplate({
          modality: draft.modality,
          category: draft.category || null,
          question: draft.question,
          options: draft.optionsCsv
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean),
          weight: Number(draft.weight) || 0,
        });
        setDraft({ modality: "text", category: "", question: "", optionsCsv: "", weight: "0" });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Create failed");
      }
    });
  };

  const handleToggle = (id: string, isActive: boolean) =>
    startTransition(async () => {
      try {
        await updateQuestionTemplate(id, { isActive });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Update failed");
      }
    });

  const handleDelete = (id: string) => {
    if (!confirm("Delete this question?")) return;
    startTransition(async () => {
      try {
        await deleteQuestionTemplate(id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Delete failed");
      }
    });
  };

  const grouped = MODALITIES.map((m) => ({
    modality: m,
    rows: items.filter((i) => i.modality === m),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="text-sm font-medium mb-3">Add question</p>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <select
            className="h-9 rounded-md border border-border bg-bg px-2 text-sm"
            value={draft.modality}
            onChange={(e) => setDraft({ ...draft, modality: e.target.value })}
          >
            {MODALITIES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <input
            className="h-9 rounded-md border border-border bg-bg px-2 text-sm"
            placeholder="category (optional)"
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
          />
          <input
            className="h-9 rounded-md border border-border bg-bg px-2 text-sm md:col-span-2"
            placeholder="Question"
            value={draft.question}
            onChange={(e) => setDraft({ ...draft, question: e.target.value })}
          />
          <input
            className="h-9 rounded-md border border-border bg-bg px-2 text-sm"
            placeholder="weight (0)"
            type="number"
            value={draft.weight}
            onChange={(e) => setDraft({ ...draft, weight: e.target.value })}
          />
        </div>
        <input
          className="mt-2 w-full h-9 rounded-md border border-border bg-bg px-2 text-sm"
          placeholder="Options (comma-separated, leave empty for free text)"
          value={draft.optionsCsv}
          onChange={(e) => setDraft({ ...draft, optionsCsv: e.target.value })}
        />
        <div className="flex items-center justify-between mt-2">
          {error ? <p className="text-xs text-error">{error}</p> : <span />}
          <Button size="sm" disabled={pending} onClick={handleCreate}>
            {pending ? "…" : "Add"}
          </Button>
        </div>
      </div>

      {grouped.map((g) => (
        <div key={g.modality} className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-surface-2 border-b border-border">
            <span className="text-sm font-medium capitalize">{g.modality}</span>
            <span className="text-xs text-text-faint">{g.rows.length}</span>
          </div>
          {g.rows.length === 0 ? (
            <p className="px-4 py-4 text-sm text-text-faint">No questions yet.</p>
          ) : (
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-text-muted">
                  <th className="px-4 py-2 text-left font-medium">Question</th>
                  <th className="px-4 py-2 text-left font-medium">Options</th>
                  <th className="px-4 py-2 text-left font-medium">Weight</th>
                  <th className="px-4 py-2 text-left font-medium">Active</th>
                  <th className="px-4 py-2 text-left font-medium" />
                </tr>
              </thead>
              <tbody>
                {g.rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-2 max-w-[360px]">{r.question}</td>
                    <td className="px-4 py-2 text-xs text-text-muted">
                      {r.options.length > 0 ? r.options.join(" · ") : "(free text)"}
                    </td>
                    <td className="px-4 py-2">{r.weight}</td>
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        className="accent-primary h-4 w-4"
                        checked={r.isActive}
                        onChange={(e) => handleToggle(r.id, e.target.checked)}
                        disabled={pending}
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
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
    </div>
  );
}
