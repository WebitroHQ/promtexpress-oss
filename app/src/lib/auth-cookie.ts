/**
 * Session cookie name — kept in sync with src/server/actions/sessions.ts.
 *
 * The "use server" file there cannot export non-async values, so the constant
 * is duplicated here for safe import from server components.
 *
 * @auth/core uses "__Secure-..." prefix when the URL is HTTPS, plain otherwise.
 */
export const SESSION_COOKIE_NAME =
  process.env.NODE_ENV === "production"
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";
