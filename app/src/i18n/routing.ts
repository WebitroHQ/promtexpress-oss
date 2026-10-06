import { defineRouting } from "next-intl/routing";

// EN is the canonical/indexable default (CLAUDE.md §0). TR is a UX-only
// alternate locale rendered at the SAME URL with the language switched
// via the NEXT_LOCALE cookie.
//
// localePrefix "never": no /tr/* URL prefix. Both EN and TR render at the
// same path (e.g. /dashboard). The cookie + Accept-Language detection decides
// which messages bundle to load. NOTE: next-intl's middleware is NOT installed
// (see src/proxy.ts) — first-visit Accept-Language detection is hand-rolled in
// src/proxy.ts, and src/i18n/request.ts loads the bundle from NEXT_LOCALE.
//
// Why "never" and not "as-needed"? next-intl's "as-needed" prefix mode
// requires `app/[locale]/page.tsx` file structure (it rewrites / → /en
// internally). The current app router does NOT use a [locale] segment;
// migrating every page into [locale] is a separate, much larger PR. The
// 2026-05-11 deploy attempted "as-needed" without that migration and
// served 404 on every public route — rolled back immediately.
//
// Trade-off: TR pages share URLs with EN (no separate /tr/* surface for
// SEO indexing). Per D1 (2026-05-11) EN is the canonical/indexable locale
// anyway; TR is UX-only. So this matches the SEO model.
//
// localeDetection: true so Accept-Language on first visit sets the cookie
// to the visitor's preferred locale (still respecting D1: canonical EN).
// English only since 2026-10: the library and the generated prompts are English.
export const locales = ["en"] as const;

export type Locale = (typeof locales)[number];

export const routing = defineRouting({
  locales,
  defaultLocale: "en",
  localePrefix: "never",
  localeDetection: true,
});
