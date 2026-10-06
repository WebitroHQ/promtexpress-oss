"use client";

/**
 * Cloudflare Turnstile widget wrapper.
 *
 * Plan 2026-05-08 step 3 — pairs with verifyTurnstileToken() in
 * src/lib/abuse/turnstile.ts. Loads the official Turnstile script once,
 * mounts the widget, and surfaces the token / error / expiry events to the
 * parent form.
 *
 * Behaviour:
 *   - If NEXT_PUBLIC_TURNSTILE_SITE_KEY is missing, the widget renders nothing
 *     and onToken("") is fired so dev signups still succeed (matched by the
 *     server util's NODE_ENV=production guard — fail-open in dev only).
 *   - The widget self-resets on token expiry (cb-side) so the form can
 *     re-submit after ~5 minutes of idle time.
 */

import * as React from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        target: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

let scriptLoadingPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptLoadingPromise) return scriptLoadingPromise;

  scriptLoadingPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src^="${SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Turnstile script failed")));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Turnstile script failed")));
    document.head.appendChild(script);
  });
  return scriptLoadingPromise;
}

interface Props {
  onToken: (token: string) => void;
  onError?: () => void;
  className?: string;
  theme?: "light" | "dark" | "auto";
}

export function TurnstileWidget({ onToken, onError, className, theme = "auto" }: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const widgetIdRef = React.useRef<string | null>(null);
  const [scriptError, setScriptError] = React.useState(false);

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  React.useEffect(() => {
    // Dev fallback — no site key configured. Surface a synthetic empty token
    // so the form's submit button enables; server-side util has matching
    // NODE_ENV=production guard.
    if (!siteKey) {
      onToken("dev-no-turnstile");
      return;
    }

    let cancelled = false;
    loadTurnstileScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          callback: (token) => onToken(token),
          "error-callback": () => {
            onToken("");
            onError?.();
          },
          "expired-callback": () => {
            onToken("");
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        setScriptError(true);
        onError?.();
      });

    return () => {
      cancelled = true;
      const id = widgetIdRef.current;
      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          /* ignore */
        }
      }
    };
    // siteKey/theme is stable for the page lifetime; intentionally exclude
    // onToken/onError to avoid re-rendering the widget on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, theme]);

  if (!siteKey) {
    // Dev-only notice — never shown in production builds because the env var
    // is required by the deploy checklist (.env.production).
    return null;
  }

  if (scriptError) {
    return (
      <p className="text-xs text-error">
        Captcha could not be loaded. Please refresh the page.
      </p>
    );
  }

  return <div ref={containerRef} className={className} />;
}
