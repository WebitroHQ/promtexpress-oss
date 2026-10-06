import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

// I18n note (2026-05-11): next-intl is used in "without routing" mode —
// the cookie (NEXT_LOCALE) decides which messages bundle is loaded by
// src/i18n/request.ts, but locale does NOT appear in the URL. We do NOT
// install next-intl's middleware here because in next-intl v4 even
// localePrefix:"never" expects an `app/[locale]/*` file structure, which
// this project doesn't have. Cookie-only flow works without the
// middleware. First-visit Accept-Language detection is handled manually
// below — if no cookie is present, read Accept-Language and set the
// cookie so subsequent requests render the visitor's preferred locale.

const protectedRoutes = [
  "/dashboard",
  "/generator",
  "/settings",
  "/api-keys",
  "/history",
  "/favorites",
  "/feedback",
  "/billing",
  "/pr/yonet",
];
const authRoutes = [
  "/auth/login",
  "/auth/signup",
  "/auth/forgot",
  "/auth/reset",
  "/auth/verify",
  "/auth/error",
];

// /pr/yonet/login bypasses the protected gate — that's the admin sign-in page itself.
const ADMIN_LOGIN_PATH = "/pr/yonet/login";

const ANALYTICS_COOKIE = "pe_sid";
const ANALYTICS_COOKIE_TTL_DAYS = 30;
const LOCALE_COOKIE = "NEXT_LOCALE";
const LOCALE_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 365;

function generateSessionId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function setAnalyticsCookieIfMissing(req: NextRequest, res: NextResponse) {
  if (!req.cookies.get(ANALYTICS_COOKIE)?.value) {
    res.cookies.set(ANALYTICS_COOKIE, generateSessionId(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ANALYTICS_COOKIE_TTL_DAYS * 86400,
      path: "/",
    });
  }
}

// Parse Accept-Language and pick the first supported locale.
// Returns null if no preference matches the supported set.
function pickAcceptLanguage(header: string | null): string | null {
  if (!header) return null;
  const supported = new Set<string>(routing.locales as readonly string[]);
  const entries = header
    .split(",")
    .map((part) => {
      const [tag, qStr] = part.trim().split(";q=");
      const q = qStr ? parseFloat(qStr) : 1;
      return { tag: tag.trim().toLowerCase(), q: Number.isNaN(q) ? 1 : q };
    })
    .sort((a, b) => b.q - a.q);
  for (const { tag } of entries) {
    const base = tag.split("-")[0];
    if (supported.has(base)) return base;
  }
  return null;
}

function setLocaleCookieIfMissing(req: NextRequest, res: NextResponse) {
  if (req.cookies.get(LOCALE_COOKIE)?.value) return;
  const detected = pickAcceptLanguage(req.headers.get("accept-language"));
  if (!detected || detected === routing.defaultLocale) return;
  res.cookies.set(LOCALE_COOKIE, detected, {
    sameSite: "lax",
    path: "/",
    maxAge: LOCALE_COOKIE_TTL_SECONDS,
    secure: process.env.NODE_ENV === "production",
  });
}

export default auth(function middleware(req: NextRequest & { auth?: unknown }) {
  const { pathname } = req.nextUrl;
  const session = (req as { auth?: { user?: unknown } }).auth;

  const isAdminLoginPage = pathname === ADMIN_LOGIN_PATH;
  const isProtected =
    !isAdminLoginPage && protectedRoutes.some((r) => pathname.startsWith(r));
  const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r));

  // Inject pathname header so server components / layouts can read it
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);

  let res: NextResponse;
  if (isProtected && !session) {
    const isAdminArea = pathname.startsWith("/pr/yonet");
    const loginUrl = new URL(isAdminArea ? ADMIN_LOGIN_PATH : "/auth/login", req.url);
    if (!isAdminArea) loginUrl.searchParams.set("callbackUrl", pathname);
    res = NextResponse.redirect(loginUrl);
  } else if (isAuthRoute && session) {
    res = NextResponse.redirect(new URL("/generator", req.url));
  } else {
    res = NextResponse.next({ request: { headers: requestHeaders } });
  }

  // Cache invariant: with `force-dynamic` in the root layout (src/app/layout.tsx)
  // every translated route emits `Cache-Control: private, no-cache, ...`,
  // which already prevents shared caches from leaking one locale's HTML to
  // another visitor. Vary: Cookie middleware-side is overridden by Next's
  // RSC vary headers in the response pipeline anyway, so we rely on
  // Cache-Control: private as the primary safeguard.
  setLocaleCookieIfMissing(req, res);
  setAnalyticsCookieIfMissing(req, res);

  return res;
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|public).*)"],
};
