"use client";

import * as React from "react";
import { useRouter } from "@/i18n/navigation";
import { Compass } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Sidebar button that resets onboarding state and navigates to /dashboard
 * to re-trigger the introduction tour. Uses the existing
 * /api/onboarding/reset endpoint and the same i18n keys
 * (settings.restartTour.cta etc.) as the older RestartTourCard.
 */
export function RestartTourSidebarButton() {
  const t = useTranslations("settings.restartTour");
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/onboarding/reset", { method: "POST" });
      router.push("/dashboard");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label={t("cta")}
      className={cn(
        "flex items-center gap-2.5 px-3 py-2 rounded-[var(--pe-r-md)] text-sm w-full text-left transition-all duration-150",
        "text-text-muted hover:bg-surface-2 hover:text-text disabled:opacity-50 disabled:cursor-not-allowed",
      )}
    >
      <Compass className="h-4 w-4 shrink-0" />
      {busy ? t("saving") : t("cta")}
    </button>
  );
}
