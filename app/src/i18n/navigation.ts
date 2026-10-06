import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

// Locale-aware drop-in replacements for next/link, next/navigation.
// All internal navigation MUST import from here instead of "next/link" or
// "next/navigation" so that links automatically pick up the active locale
// prefix (e.g. /dashboard for EN, /tr/dashboard for TR).
//
// Usage:
//   import { Link, redirect, useRouter, usePathname, getPathname } from "@/i18n/navigation";
//
// External links (mailto:, https://...) and admin routes that intentionally
// stay outside the locale prefix can still use plain next/link.
export const { Link, redirect, useRouter, usePathname, getPathname } =
  createNavigation(routing);
