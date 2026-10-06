"use client";
import * as React from "react";

/**
 * Reactive media query hook. Uses useSyncExternalStore so state mirrors the
 * media query without setState-in-effect cascades.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (callback: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", callback);
      return () => mql.removeEventListener("change", callback);
    },
    [query],
  );
  const getSnapshot = React.useCallback(
    () => window.matchMedia(query).matches,
    [query],
  );
  const getServerSnapshot = () => false; // SSR-safe default
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
