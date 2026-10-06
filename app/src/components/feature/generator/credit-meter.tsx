"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface CreditMeterProps {
  used: number;
  total: number;
  renewDate?: Date;
  className?: string;
}

export function CreditMeter({ used, total, renewDate, className }: CreditMeterProps) {
  const remaining = Math.max(0, total - used);
  const pct = total > 0 ? (remaining / total) * 100 : 0;

  // SVG donut params
  const r = 18;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);

  const color = pct > 50 ? "var(--pe-success)" : pct > 20 ? "var(--pe-accent)" : "var(--pe-error)";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg width="44" height="44" viewBox="0 0 44 44" className="rotate-[-90deg] shrink-0">
        <circle cx="22" cy="22" r={r} fill="none" stroke="var(--pe-border-strong)" strokeWidth="4" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)" }}
        />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="text-xl font-semibold leading-none tracking-tight text-text truncate">
          {remaining.toLocaleString()}
        </p>
        <p className="text-xs text-text-muted mt-0.5 truncate">of {total.toLocaleString()} credits</p>
        {renewDate && (
          <p className="text-xs text-text-faint mt-0.5 truncate">
            Renews {renewDate.toLocaleDateString("en", { month: "short", day: "numeric" })}
          </p>
        )}
      </div>
    </div>
  );
}
