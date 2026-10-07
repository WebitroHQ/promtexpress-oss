"use client";

/**
 * The app is English only since 2026-10, so the locale is a single value and
 * the hook no longer carries a dead Turkish branch.
 */
export type SupportedLocale = "en";

export function useBrowserLocale(): SupportedLocale {
  return "en";
}
