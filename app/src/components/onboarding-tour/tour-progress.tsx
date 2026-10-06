"use client";

import * as React from "react";
import { motion } from "motion/react";

export function TourProgress({ index, total }: { index: number; total: number }) {
  const pct = total <= 1 ? 100 : Math.round((index / (total - 1)) * 100);
  return (
    <div className="space-y-2.5">
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-surface-2">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, var(--pe-primary), var(--pe-accent))",
          }}
          initial={false}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 200, damping: 30 }}
        />
      </div>
      <div className="flex items-center justify-center gap-1.5">
        {Array.from({ length: total }).map((_, i) => {
          const active = i === index;
          const done = i < index;
          return (
            <motion.span
              key={i}
              className="rounded-full"
              initial={false}
              animate={{
                width: active ? 18 : 6,
                height: 6,
                backgroundColor: done
                  ? "var(--pe-primary)"
                  : active
                  ? "var(--pe-accent)"
                  : "var(--pe-border-strong)",
              }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
            />
          );
        })}
      </div>
      <p className="text-center text-[11px] text-text-faint">
        {index + 1} / {total}
      </p>
    </div>
  );
}
