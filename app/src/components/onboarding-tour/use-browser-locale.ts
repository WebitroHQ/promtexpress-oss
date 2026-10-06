"use client";

import * as React from "react";

export type SupportedLocale = "tr" | "en";

export function useBrowserLocale(): SupportedLocale {
  const [locale, setLocale] = React.useState<SupportedLocale>("en");

  React.useEffect(() => {
    if (typeof navigator === "undefined") return;
    const lang = (navigator.language || "en").toLowerCase();
    // English only since 2026-10.
    void lang;
    setLocale("en");
  }, []);

  return locale;
}
