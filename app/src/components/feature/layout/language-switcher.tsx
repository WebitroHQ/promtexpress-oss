"use client";

import * as React from "react";
import { Check, Languages } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setLocale } from "@/server/actions/profile";
import { cn } from "@/lib/utils";

const LOCALES = [
  { code: "en", label: "English", short: "EN" },
] as const;

type LocaleCode = (typeof LOCALES)[number]["code"];

interface Props {
  currentLocale: string;
}

export function LanguageSwitcher({ currentLocale }: Props) {
  const [pending, setPending] = React.useState(false);
  const active =
    LOCALES.find((l) => l.code === currentLocale) ??
    LOCALES.find((l) => l.code === "en") ??
    LOCALES[0];

  const handleSelect = async (code: LocaleCode) => {
    if (code === currentLocale || pending) return;
    setPending(true);
    try {
      // Persist NEXT_LOCALE cookie + User.locale (server action). Cookie-only
      // i18n flow (localePrefix:"never") — no URL change. Hard reload
      // guarantees the new cookie is read by the next RSC payload; the root
      // layout's force-dynamic + Vary:Cookie ensure the new locale is
      // honored without stale cache.
      await setLocale(code);
      window.location.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to change language");
      setPending(false);
    }
  };

  // Nothing to switch between while the app ships a single language.
  if (LOCALES.length < 2) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Change language"
          className={cn(
            "inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-semibold tracking-wide",
            "text-text-muted hover:text-text hover:bg-surface-2 transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            "disabled:opacity-50",
          )}
          disabled={pending}
        >
          <Languages className="h-3.5 w-3.5" />
          <span>{active.short}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onSelect={() => handleSelect(l.code)}
            className="cursor-pointer flex items-center justify-between"
          >
            <span>{l.label}</span>
            {l.code === currentLocale && (
              <Check className="h-3.5 w-3.5 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
