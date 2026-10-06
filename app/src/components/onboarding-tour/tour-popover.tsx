"use client";

import * as React from "react";
import { motion } from "motion/react";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  arrow,
  type Placement,
} from "@floating-ui/react";
import type { StepPlacement } from "./types";

interface Props {
  anchorEl: HTMLElement | null;
  placement: StepPlacement;
  reducedMotion?: boolean;
  children: React.ReactNode;
}

function toFloatingPlacement(p: StepPlacement): Placement {
  if (p === "center") return "bottom";
  return p;
}

export function TourPopover({ anchorEl, placement, reducedMotion, children }: Props) {
  const arrowRef = React.useRef<SVGSVGElement | null>(null);
  // Fall back to centered modal when placement is "center" OR when the anchor isn't available yet.
  const useAnchored = placement !== "center" && !!anchorEl;

  const transition = reducedMotion
    ? { duration: 0.12 }
    : { type: "spring" as const, stiffness: 320, damping: 30 };
  const initial = reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.94, y: 8 };
  const animate = reducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 };

  if (!useAnchored) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 pointer-events-none">
        <motion.div
          initial={initial}
          animate={animate}
          exit={initial}
          transition={transition}
          role="dialog"
          aria-modal="true"
          className="pointer-events-auto w-full max-w-[440px] rounded-[var(--pe-r-lg)] border border-border-strong bg-surface p-5 sm:p-6 text-text shadow-[var(--pe-shadow-lg)]"
        >
          {children}
        </motion.div>
      </div>
    );
  }

  return (
    <AnchoredPopover
      anchorEl={anchorEl as HTMLElement}
      placement={placement}
      arrowRef={arrowRef}
      transition={transition}
      initial={initial}
      animate={animate}
    >
      {children}
    </AnchoredPopover>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMotionProp = any;

function AnchoredPopover({
  anchorEl,
  placement,
  arrowRef,
  transition,
  initial,
  animate,
  children,
}: {
  anchorEl: HTMLElement;
  placement: StepPlacement;
  arrowRef: React.MutableRefObject<SVGSVGElement | null>;
  transition: AnyMotionProp;
  initial: AnyMotionProp;
  animate: AnyMotionProp;
  children: React.ReactNode;
}) {
  const {
    refs,
    floatingStyles,
    middlewareData,
    placement: actualPlacement,
    isPositioned,
  } = useFloating({
    placement: toFloatingPlacement(placement),
    middleware: [offset(16), flip({ padding: 16 }), shift({ padding: 16 }), arrow({ element: arrowRef })],
    whileElementsMounted: autoUpdate,
    elements: { reference: anchorEl },
  });

  const arrowX = middlewareData.arrow?.x;
  const arrowY = middlewareData.arrow?.y;
  const arrowSide = (actualPlacement.split("-")[0] ?? "bottom") as "top" | "bottom" | "left" | "right";
  const arrowOpposite = { top: "bottom", bottom: "top", left: "right", right: "left" }[arrowSide];

  return (
    <motion.div
      ref={refs.setFloating}
      style={{
        ...floatingStyles,
        zIndex: 60,
        // Hide until Floating UI has computed a real position (avoids 1-frame flash at top-left).
        visibility: isPositioned ? "visible" : "hidden",
      }}
      initial={initial}
      animate={animate}
      exit={initial}
      transition={transition as never}
      role="dialog"
      aria-modal="true"
      className="w-[min(340px,calc(100vw-24px))] rounded-[var(--pe-r-lg)] border border-border-strong bg-surface p-4 sm:p-5 text-text shadow-[var(--pe-shadow-lg)] pointer-events-auto"
    >
      <svg
        ref={arrowRef}
        className="absolute"
        width={14}
        height={14}
        style={{
          left: arrowX != null ? arrowX : undefined,
          top: arrowY != null ? arrowY : undefined,
          [arrowOpposite as string]: -7,
        }}
      >
        <polygon
          points={
            arrowSide === "top"
              ? "0,0 14,0 7,7"
              : arrowSide === "bottom"
              ? "0,7 14,7 7,0"
              : arrowSide === "left"
              ? "0,0 0,14 7,7"
              : "7,0 7,14 0,7"
          }
          fill="var(--pe-surface)"
          stroke="var(--pe-border-strong)"
          strokeWidth={1}
        />
      </svg>
      {children}
    </motion.div>
  );
}
