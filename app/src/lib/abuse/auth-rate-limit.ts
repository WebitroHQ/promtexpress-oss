/**
 * Auth-domain rate limiter — symmetric extension of the generation rate-limit
 * pattern in src/lib/pipeline/v2/rate-limit.ts.
 *
 * Why this file exists:
 *   - Plan 2026-05-08 step A1–A3 evidence (file:line) shows that signin,
 *     password-reset, and admin-login server actions had no rate-limit at all,
 *     while /api/generate already had Redis-backed sliding-window + token-bucket
 *     limits. This file completes the symmetry.
 *
 * Design principles (plan rule 2 — no patching, no shortcuts):
 *   - Re-uses the same RateLimitError and getRedis() singleton.
 *   - Fail-open on Redis outage (matches generation pattern); plan rule 4 — must
 *     not bring down login when Redis is unreachable. The bcrypt cost=12 in
 *     src/lib/passwords.ts already raises brute-force cost considerably.
 *   - Email is never stored verbatim in Redis keys; SHA-256 truncated hash is
 *     used so log scraping cannot leak addresses (plan rule 1 — privacy).
 *   - All user-visible strings remain English (plan rule 1).
 *
 * Buckets:
 *   1. Signin     — 5 fails / 15 min, key = `rl:auth:signin:<emailHash>:<ip>`,
 *                   sliding window; recordSuccess() clears the bucket.
 *   2. Signup     — 3 accounts / 60 min per IP, key = `rl:auth:signup:<ip>`,
 *                   token bucket; recorded after a successful db.user.create.
 *   3. Forgot     — 3 mails / 60 min per email AND 10 mails / 60 min per IP.
 *                   Whichever limit hits first throws. Token buckets.
 *   4. AdminLogin — 5 fails / 5 min per (ip, username), sliding window; on
 *                   limit reach, sets a separate lockout flag for 5 min.
 *
 * Caller responsibilities:
 *   - Pass the request IP read from x-forwarded-for / cf-connecting-ip.
 *   - Wrap calls in try/catch only if a non-RateLimitError needs special handling.
 *   - Generic error responses (no enumeration leak) remain the action's job.
 */
import { createHash } from "node:crypto";
import { getRedis } from "@/lib/redis";
import { RateLimitError } from "@/lib/pipeline/v2/rate-limit";

export { RateLimitError };

const SIGNIN_WINDOW_SEC = 15 * 60;
const SIGNIN_MAX_FAILS = 5;

const SIGNUP_WINDOW_SEC = 60 * 60;
const SIGNUP_MAX_PER_IP = 3;

const FORGOT_WINDOW_SEC = 60 * 60;
const FORGOT_MAX_PER_EMAIL = 3;
const FORGOT_MAX_PER_IP = 10;

const ADMIN_WINDOW_SEC = 5 * 60;
const ADMIN_MAX_FAILS = 5;
const ADMIN_LOCKOUT_SEC = 5 * 60;

function hasRedis(): boolean {
  return !!(process.env.REDIS_URL || process.env.REDIS_HOST);
}

/**
 * Hash an email for use in Redis keys. SHA-256 truncated to 16 hex chars
 * (64 bits) — collision space large enough for rate-limit purposes, while
 * avoiding storing the verbatim address in keys/logs.
 */
export function hashEmailForRateLimit(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16);
}

// ── Signin (sliding window, fail counter, clear on success) ─────────────────

function signinKey(emailHash: string, ip: string | null): string {
  return `rl:auth:signin:${emailHash}:${ip ?? "noip"}`;
}

/**
 * Throws RateLimitError if the (email, ip) pair has hit the failed-attempt
 * ceiling within the rolling window. Call BEFORE verifying the password so
 * an attacker cannot trickle requests through.
 */
export async function assertSigninRateLimit(email: string, ip: string | null): Promise<void> {
  if (!hasRedis()) return;
  try {
    const r = getRedis();
    const key = signinKey(hashEmailForRateLimit(email), ip);
    const now = Date.now();
    const cutoff = now - SIGNIN_WINDOW_SEC * 1000;

    // Just count; do NOT add a new entry yet — recordSigninFailure() will.
    await r.zremrangebyscore(key, 0, cutoff);
    const count = await r.zcard(key);
    if (count >= SIGNIN_MAX_FAILS) {
      throw new RateLimitError(SIGNIN_WINDOW_SEC);
    }
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    console.warn(
      "[auth-rate-limit] signin check failed (fail open):",
      err instanceof Error ? err.message : err,
    );
  }
}

/** Record a failed signin attempt. Call AFTER verifyPassword returns false. */
export async function recordSigninFailure(email: string, ip: string | null): Promise<void> {
  if (!hasRedis()) return;
  try {
    const r = getRedis();
    const key = signinKey(hashEmailForRateLimit(email), ip);
    const now = Date.now();
    const member = `${now}:${Math.random().toString(36).slice(2, 8)}`;
    const pipeline = r.multi();
    pipeline.zadd(key, now, member);
    pipeline.expire(key, SIGNIN_WINDOW_SEC * 2);
    await pipeline.exec();
  } catch (err) {
    console.warn(
      "[auth-rate-limit] recordSigninFailure failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

/** Clear the signin fail counter on successful login. */
export async function recordSigninSuccess(email: string, ip: string | null): Promise<void> {
  if (!hasRedis()) return;
  try {
    const r = getRedis();
    await r.del(signinKey(hashEmailForRateLimit(email), ip));
  } catch {
    /* best-effort */
  }
}

// ── Signup (token bucket per IP) ────────────────────────────────────────────

function signupKey(ip: string | null): string {
  return `rl:auth:signup:${ip ?? "noip"}`;
}

/**
 * Throws if more than SIGNUP_MAX_PER_IP accounts were created from this IP
 * within the window. Call BEFORE creating the user row.
 */
export async function assertSignupRateLimit(ip: string | null): Promise<void> {
  if (!hasRedis() || !ip) return;
  try {
    const r = getRedis();
    const key = signupKey(ip);
    // Just read; recordSignupSuccess() will INCR after the row is created.
    const raw = await r.get(key);
    const count = raw ? Number(raw) : 0;
    if (count >= SIGNUP_MAX_PER_IP) {
      throw new RateLimitError(SIGNUP_WINDOW_SEC);
    }
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    console.warn(
      "[auth-rate-limit] signup check failed (fail open):",
      err instanceof Error ? err.message : err,
    );
  }
}

/** Record one successful signup. Call AFTER db.user.create succeeds. */
export async function recordSignupSuccess(ip: string | null): Promise<void> {
  if (!hasRedis() || !ip) return;
  try {
    const r = getRedis();
    const key = signupKey(ip);
    const n = await r.incr(key);
    if (n === 1) await r.expire(key, SIGNUP_WINDOW_SEC);
  } catch (err) {
    console.warn(
      "[auth-rate-limit] recordSignupSuccess failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

// ── Forgot password (token buckets — per email + per IP) ────────────────────

function forgotEmailKey(emailHash: string): string {
  return `rl:auth:forgot:email:${emailHash}`;
}
function forgotIpKey(ip: string | null): string {
  return `rl:auth:forgot:ip:${ip ?? "noip"}`;
}

/**
 * Throws if either the per-email limit (3/h) or per-IP limit (10/h) has been
 * reached. The action's enumeration-safe `return { ok: true }` should still be
 * preserved by the caller — they catch RateLimitError and return ok=true
 * silently (no email is sent in that case).
 */
export async function assertForgotRateLimit(email: string, ip: string | null): Promise<void> {
  if (!hasRedis()) return;
  try {
    const r = getRedis();
    const emailHash = hashEmailForRateLimit(email);
    const [emailRaw, ipRaw] = await Promise.all([
      r.get(forgotEmailKey(emailHash)),
      ip ? r.get(forgotIpKey(ip)) : Promise.resolve(null),
    ]);
    const emailCount = emailRaw ? Number(emailRaw) : 0;
    const ipCount = ipRaw ? Number(ipRaw) : 0;
    if (emailCount >= FORGOT_MAX_PER_EMAIL || ipCount >= FORGOT_MAX_PER_IP) {
      throw new RateLimitError(FORGOT_WINDOW_SEC);
    }
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    console.warn(
      "[auth-rate-limit] forgot check failed (fail open):",
      err instanceof Error ? err.message : err,
    );
  }
}

/** Record one outbound reset mail. Call AFTER the mail send call returns. */
export async function recordForgotSent(email: string, ip: string | null): Promise<void> {
  if (!hasRedis()) return;
  try {
    const r = getRedis();
    const emailHash = hashEmailForRateLimit(email);
    const pipeline = r.multi();
    pipeline.incr(forgotEmailKey(emailHash));
    pipeline.expire(forgotEmailKey(emailHash), FORGOT_WINDOW_SEC);
    if (ip) {
      pipeline.incr(forgotIpKey(ip));
      pipeline.expire(forgotIpKey(ip), FORGOT_WINDOW_SEC);
    }
    await pipeline.exec();
  } catch (err) {
    console.warn(
      "[auth-rate-limit] recordForgotSent failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

// ── Contact form (token bucket per IP) ──────────────────────────────────────

const CONTACT_WINDOW_SEC = 60 * 60;
const CONTACT_MAX_PER_IP = 3;

function contactKey(ip: string | null): string {
  return `rl:contact:${ip ?? "noip"}`;
}

/**
 * Throws if more than CONTACT_MAX_PER_IP messages were sent from this IP
 * within the window. Plan 2026-05-08 step 10 — keeps the public form from
 * being weaponised as a spam relay.
 */
export async function assertContactRateLimit(ip: string | null): Promise<void> {
  if (!hasRedis() || !ip) return;
  try {
    const r = getRedis();
    const raw = await r.get(contactKey(ip));
    const count = raw ? Number(raw) : 0;
    if (count >= CONTACT_MAX_PER_IP) {
      throw new RateLimitError(CONTACT_WINDOW_SEC);
    }
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    console.warn(
      "[auth-rate-limit] contact check failed (fail open):",
      err instanceof Error ? err.message : err,
    );
  }
}

export async function recordContactSent(ip: string | null): Promise<void> {
  if (!hasRedis() || !ip) return;
  try {
    const r = getRedis();
    const key = contactKey(ip);
    const n = await r.incr(key);
    if (n === 1) await r.expire(key, CONTACT_WINDOW_SEC);
  } catch (err) {
    console.warn(
      "[auth-rate-limit] recordContactSent failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

// ── Admin login (sliding window + lockout flag) ─────────────────────────────

function adminKey(ip: string | null, username: string): string {
  return `rl:auth:admin:${ip ?? "noip"}:${username}`;
}
function adminLockoutKey(ip: string | null): string {
  return `rl:auth:admin:lockout:${ip ?? "noip"}`;
}

/**
 * Throws RateLimitError if either (a) the (ip, username) pair has hit the fail
 * ceiling, or (b) the IP-wide lockout flag is set. Both conditions clear after
 * ADMIN_LOCKOUT_SEC.
 */
export async function assertAdminLoginRateLimit(
  ip: string | null,
  username: string,
): Promise<void> {
  if (!hasRedis()) return;
  try {
    const r = getRedis();

    const lockout = await r.get(adminLockoutKey(ip));
    if (lockout) {
      throw new RateLimitError(ADMIN_LOCKOUT_SEC);
    }

    const key = adminKey(ip, username);
    const now = Date.now();
    const cutoff = now - ADMIN_WINDOW_SEC * 1000;
    await r.zremrangebyscore(key, 0, cutoff);
    const count = await r.zcard(key);
    if (count >= ADMIN_MAX_FAILS) {
      // Promote to IP-wide lockout so attacker cannot rotate usernames.
      await r.set(adminLockoutKey(ip), "1", "EX", ADMIN_LOCKOUT_SEC);
      throw new RateLimitError(ADMIN_LOCKOUT_SEC);
    }
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    console.warn(
      "[auth-rate-limit] admin check failed (fail open):",
      err instanceof Error ? err.message : err,
    );
  }
}

export async function recordAdminLoginFailure(
  ip: string | null,
  username: string,
): Promise<void> {
  if (!hasRedis()) return;
  try {
    const r = getRedis();
    const key = adminKey(ip, username);
    const now = Date.now();
    const member = `${now}:${Math.random().toString(36).slice(2, 8)}`;
    const pipeline = r.multi();
    pipeline.zadd(key, now, member);
    pipeline.expire(key, ADMIN_WINDOW_SEC * 2);
    await pipeline.exec();
  } catch (err) {
    console.warn(
      "[auth-rate-limit] recordAdminLoginFailure failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

export async function recordAdminLoginSuccess(
  ip: string | null,
  username: string,
): Promise<void> {
  if (!hasRedis()) return;
  try {
    const r = getRedis();
    await Promise.all([
      r.del(adminKey(ip, username)),
      r.del(adminLockoutKey(ip)),
    ]);
  } catch {
    /* best-effort */
  }
}
