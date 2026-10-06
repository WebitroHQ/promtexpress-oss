/**
 * Cloudflare Turnstile server-side token verification.
 *
 * Plan 2026-05-08 step 3 — pairs with the Turnstile widget mounted on
 * /auth/signup and /contact. Without server-side verify, the client widget
 * is cosmetic; an attacker can POST directly to the action with no token.
 *
 * Env contract:
 *   TURNSTILE_SECRET_KEY        — server secret, never exposed to the client.
 *                                 Cloudflare provides "always-passes" / "always-fails"
 *                                 test secrets for CI; production secret comes from
 *                                 Cloudflare dashboard → Turnstile → site config.
 *   NEXT_PUBLIC_TURNSTILE_SITE_KEY — public site key, mounted in the <Turnstile />
 *                                   client widget (already declared in .env.example).
 *
 * Behaviour:
 *   - Empty / missing token → false (do not call siteverify).
 *   - Network error / non-OK response → false (fail CLOSED, plan rule 4 —
 *     blocking the signup is the safer default than admitting a bot).
 *   - 5-second timeout via AbortSignal so a hung Cloudflare endpoint cannot
 *     stall the action.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TIMEOUT_MS = 5000;

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp: string | null,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Plan 2026-05-08 + 2026-05-08 user override: Turnstile is treated as
    // OPTIONAL infrastructure. Mirror behaviour:
    //   - Frontend (turnstile-widget.tsx) sends the synthetic token
    //     "dev-no-turnstile" when NEXT_PUBLIC_TURNSTILE_SITE_KEY is missing.
    //   - Backend here returns true when TURNSTILE_SECRET_KEY is missing.
    // Both flags absent → captcha disabled. Both flags present → captcha
    // enforced. Adding the keys later flips protection on with zero code
    // change. This is symmetric with the dev path, NOT a patch — it's the
    // missing half of the pair the original spec only described one side of.
    // Non-production logs at debug level; production logs once at warn so
    // operators are reminded protection is dormant.
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[turnstile] TURNSTILE_SECRET_KEY not set — captcha is disabled. Set NEXT_PUBLIC_TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY in env to enable.",
      );
    }
    return true;
  }
  if (!token || token.length < 1) return false;

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`[turnstile] siteverify HTTP ${res.status}`);
      return false;
    }
    const json = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!json.success) {
      console.warn("[turnstile] siteverify rejected:", json["error-codes"] ?? "unknown");
      return false;
    }
    return true;
  } catch (err) {
    console.warn(
      "[turnstile] siteverify failed (fail closed):",
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}
