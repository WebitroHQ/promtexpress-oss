import { cookies } from "next/headers";
import { routing, type Locale } from "@/i18n/routing";

// Single source of truth for locale resolution.
// Read order: explicit NEXT_LOCALE cookie → routing.defaultLocale ("en").
// Accept-Language detection happens in src/proxy.ts (next-intl middleware is
// NOT installed, and there are no /tr/* URLs — localePrefix is "never"). By
// the time this resolver runs, the NEXT_LOCALE cookie has already been written
// by the language switcher or by proxy.ts's first-visit detection. We never
// read User.locale directly here — User.locale is a write-target (cross-device
// hydration on login) and never a read-source.
export const LOCALE_COOKIE = "NEXT_LOCALE";

export async function resolveLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (value && (routing.locales as readonly string[]).includes(value)) {
    return value as Locale;
  }
  return routing.defaultLocale;
}
