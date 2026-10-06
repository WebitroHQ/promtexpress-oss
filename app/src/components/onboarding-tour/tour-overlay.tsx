"use client";

import * as React from "react";
import { motion } from "motion/react";
import type { Bbox } from "./use-spotlight";

interface Props {
  bbox: Bbox | null;
  reducedMotion?: boolean;
}

const PAD = 8;
const RX = 12;

export function TourOverlay({ bbox, reducedMotion }: Props) {
  const transition = reducedMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 280, damping: 30 };

  return (
    <motion.svg
      className="fixed inset-0 z-[40] pointer-events-none"
      width="100%"
      height="100%"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      aria-hidden="true"
    >
      <defs>
        <mask id="tour-spotlight-mask">
          <rect width="100%" height="100%" fill="white" />
          {bbox && (
            <motion.rect
              initial={false}
              animate={{
                x: bbox.x - PAD,
                y: bbox.y - PAD,
                width: bbox.w + PAD * 2,
                height: bbox.h + PAD * 2,
              }}
              transition={transition}
              rx={RX}
              ry={RX}
              fill="black"
            />
          )}
        </mask>
      </defs>
      <rect
        width="100%"
        height="100%"
        fill="rgba(20, 18, 12, 0.55)"
        mask="url(#tour-spotlight-mask)"
      />
      {bbox && (
        <motion.rect
          initial={false}
          animate={{
            x: bbox.x - PAD,
            y: bbox.y - PAD,
            width: bbox.w + PAD * 2,
            height: bbox.h + PAD * 2,
          }}
          transition={transition}
          rx={RX}
          ry={RX}
          fill="none"
          stroke="var(--pe-primary)"
          strokeWidth={2}
          style={{
            filter: reducedMotion
              ? undefined
              : "drop-shadow(0 0 16px color-mix(in srgb, var(--pe-primary) 55%, transparent))",
          }}
        />
      )}
    </motion.svg>
  );
}
