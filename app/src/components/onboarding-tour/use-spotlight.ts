"use client";

import * as React from "react";

export interface Bbox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function useSpotlight(selector: string | null): {
  bbox: Bbox | null;
  el: HTMLElement | null;
} {
  const [bbox, setBbox] = React.useState<Bbox | null>(null);
  const [el, setEl] = React.useState<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!selector) {
      setBbox(null);
      setEl(null);
      return;
    }

    let cancelled = false;
    let rafId: number | null = null;
    let ro: ResizeObserver | null = null;
    let mo: MutationObserver | null = null;

    function measure(target: HTMLElement) {
      const r = target.getBoundingClientRect();
      setBbox({ x: r.x, y: r.y, w: r.width, h: r.height });
    }

    function isVisible(t: HTMLElement): boolean {
      const r = t.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) return false;
      const cs = window.getComputedStyle(t);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
      return true;
    }

    function attach(target: HTMLElement) {
      // If element exists but is hidden (e.g. mobile sidebar w/ `hidden md:flex`),
      // treat as not-found → centered popover fallback.
      if (!isVisible(target)) {
        setBbox(null);
        setEl(null);
        return;
      }
      setEl(target);
      // scroll into view if off-screen
      const r = target.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const offscreen = r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw;
      if (offscreen) {
        target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        // re-measure after scroll settles
        setTimeout(() => !cancelled && measure(target), 350);
      } else {
        measure(target);
      }

      ro = new ResizeObserver(() => measure(target));
      ro.observe(target);

      const onScroll = () => measure(target);
      window.addEventListener("scroll", onScroll, true);
      window.addEventListener("resize", onScroll);
      cleanupListeners = () => {
        window.removeEventListener("scroll", onScroll, true);
        window.removeEventListener("resize", onScroll);
      };
    }

    let cleanupListeners: (() => void) | null = null;

    function tryFind() {
      if (cancelled) return;
      const target = document.querySelector(selector!) as HTMLElement | null;
      if (target) {
        attach(target);
        return;
      }
      // Element not yet mounted — observe DOM until it appears, with timeout.
      mo = new MutationObserver(() => {
        const t = document.querySelector(selector!) as HTMLElement | null;
        if (t) {
          mo?.disconnect();
          mo = null;
          attach(t);
        }
      });
      mo.observe(document.body, { childList: true, subtree: true });
      // Fallback timeout: stop observing after 1.2s.
      // If target never appears (e.g. mobile sidebar hidden), popover falls back to centered modal.
      setTimeout(() => {
        if (mo) {
          mo.disconnect();
          mo = null;
        }
      }, 1200);
    }

    rafId = requestAnimationFrame(tryFind);

    return () => {
      cancelled = true;
      if (rafId != null) cancelAnimationFrame(rafId);
      ro?.disconnect();
      mo?.disconnect();
      cleanupListeners?.();
    };
  }, [selector]);

  return { bbox, el };
}
