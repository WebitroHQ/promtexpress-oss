"use client";

import * as React from "react";
import { AlertOctagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { reportAbuse } from "@/server/actions/abuse-public";

interface Props {
  targetType: "prompt" | "user" | "template" | "blog" | "comment";
  targetId: string;
  className?: string;
  variant?: "icon" | "link" | "button";
}

const TYPES = [
  { value: "SPAM", label: "Spam / advertising" },
  { value: "POLICY_VIOLATION", label: "Policy violation" },
  { value: "BUG", label: "Bug / not working" },
  { value: "OTHER", label: "Other" },
] as const;

export function ReportButton({ targetType, targetId, className, variant = "icon" }: Props) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      targetType,
      targetId,
      type: fd.get("type") as "SPAM" | "POLICY_VIOLATION" | "BUG" | "OTHER",
      description: String(fd.get("description") ?? "").trim() || null,
    };
    setBusy(true);
    try {
      const result = await reportAbuse(payload);
      if (result.ok) {
        window.alert("Raporunuz alındı. Teşekkürler.");
        setOpen(false);
      } else if (result.error === "rate_limited") {
        window.alert("Çok fazla rapor gönderdiniz. 24 saat sonra tekrar deneyin.");
      } else {
        window.alert("Rapor gönderilemedi. Lütfen tekrar deneyin.");
      }
    } finally {
      setBusy(false);
    }
  }

  const trigger =
    variant === "icon" ? (
      <button
        onClick={() => setOpen(true)}
        title="Report"
        aria-label="Report this content"
        className={`p-1.5 rounded text-text-faint hover:text-error hover:bg-surface-2 transition-colors ${className ?? ""}`}
      >
        <AlertOctagon className="h-3.5 w-3.5" />
      </button>
    ) : variant === "link" ? (
      <button
        onClick={() => setOpen(true)}
        className={`text-xs text-text-muted hover:text-error hover:underline ${className ?? ""}`}
      >
        Report
      </button>
    ) : (
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)} className={className}>
        <AlertOctagon className="h-3.5 w-3.5" /> Report
      </Button>
    );

  return (
    <>
      {trigger}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            className="bg-surface border border-border rounded-xl p-5 w-full max-w-md"
          >
            <h3 className="font-semibold mb-1 flex items-center gap-2">
              <AlertOctagon className="h-4 w-4 text-error" /> Report content
            </h3>
            <p className="text-xs text-text-muted mb-4">
              {targetType}:{targetId.slice(0, 16)}
              {targetId.length > 16 ? "…" : ""}
            </p>

            <label className="block text-xs text-text-muted mb-1">Reason</label>
            <select
              name="type"
              required
              defaultValue="POLICY_VIOLATION"
              className="w-full h-9 rounded-md border border-border bg-surface px-3 text-sm mb-3"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>

            <label className="block text-xs text-text-muted mb-1">Details (optional)</label>
            <textarea
              name="description"
              rows={4}
              maxLength={2000}
              placeholder="What's wrong with this content?"
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm mb-4"
            />

            <p className="text-[10px] text-text-faint mb-3">
              Reports are reviewed by moderators. Anonymous reports allowed (we record IP for spam prevention only).
            </p>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? "Sending…" : "Submit report"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
