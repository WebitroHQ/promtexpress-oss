"use client";

import { useState } from "react";

interface Props {
  title: string;
  subtitle?: string;
  data: unknown;
  defaultOpen?: boolean;
}

export function TraceLayerPanel({ title, subtitle, data, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const json = data == null ? "(empty)" : JSON.stringify(data, null, 2);
  const lineCount = json.split("\n").length;

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-2/40 transition-colors"
      >
        <div className="flex flex-col items-start text-left">
          <span className="font-medium">{title}</span>
          {subtitle ? <span className="text-xs text-text-muted">{subtitle}</span> : null}
        </div>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>{lineCount} lines</span>
          <span className="font-mono">{open ? "▾" : "▸"}</span>
        </div>
      </button>
      {open ? (
        <pre className="px-4 py-3 text-xs leading-relaxed bg-surface-2/40 border-t border-border overflow-x-auto max-h-[480px]">
          {json}
        </pre>
      ) : null}
    </div>
  );
}
