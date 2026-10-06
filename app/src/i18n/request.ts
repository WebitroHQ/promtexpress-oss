import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";
import { resolveLocale } from "@/lib/i18n/resolve";

// NOTE: next-intl's middleware is NOT installed in this project (see
// src/proxy.ts). `requestLocale` is therefore usually empty here, so in
// practice resolveLocale() — a cookie-only (NEXT_LOCALE) resolver — is the
// real source. We still honor `requestLocale` if next-intl ever populates it,
// then fall back to resolveLocale(); both agree on the cookie name and the
// supported locale set.
export default getRequestConfig(async ({ requestLocale }) => {
  const fromMiddleware = await requestLocale;
  const locale =
    fromMiddleware && (routing.locales as readonly string[]).includes(fromMiddleware)
      ? fromMiddleware
      : await resolveLocale();

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
