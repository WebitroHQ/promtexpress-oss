import "server-only";

/**
 * Generic template-based email send.
 * - Looks up EmailTemplate by (slug, locale) with "en" fallback.
 * - Substitutes {{key}} → vars[key]; missing keys → empty string.
 * - Sends via Brevo SMTP (or no-ops with console.warn if env missing).
 * - Increments sentCount on success.
 *
 * Errors never throw upward (auth flows must not block on mail).
 */
import nodemailer from "nodemailer";
import { db } from "@/db/client";

interface SendInput {
  slug: string;
  locale?: string;
  to: string;
  vars?: Record<string, string>;
  override?: { from?: string; replyTo?: string };
}

type SendResult = { ok: true } | { ok: false; reason: string };

export function substituteVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    return vars[key] !== undefined ? String(vars[key]) : "";
  });
}

function transporter() {
  return nodemailer.createTransport({
    host: "smtp-relay.brevo.com",
    port: 587,
    auth: {
      user: process.env.BREVO_SMTP_USER!,
      pass: process.env.BREVO_SMTP_PASS!,
    },
  });
}

// Plan 2026-05-08 step 4 — block transactional sends to recipients we know
// will hard-bounce or have complained. Brevo throttles senders that hit
// their bounce ceiling, which would silently kill verification + reset mails.
const BLOCKING_DELIVERY_STATUSES = new Set([
  "hard_bounce",
  "complained",
  "invalid_email",
]);

async function isAddressBlocked(email: string): Promise<boolean> {
  try {
    const u = await db.user.findUnique({
      where: { email },
      select: { emailDeliveryStatus: true },
    });
    if (!u) return false;
    return BLOCKING_DELIVERY_STATUSES.has(u.emailDeliveryStatus);
  } catch {
    // If the lookup fails, do not block — keep the existing fail-open posture.
    return false;
  }
}

export async function sendTemplateEmail(input: SendInput): Promise<SendResult> {
  const locale = (input.locale ?? "en").trim();
  const vars = input.vars ?? {};

  // 0) Brevo bounce/complaint guard.
  if (await isAddressBlocked(input.to)) {
    console.warn(
      `[email] suppressed send to ${input.to} (slug=${input.slug}) — emailDeliveryStatus is blocking`,
    );
    return { ok: false, reason: "delivery_blocked" };
  }

  // 1) Lookup with locale fallback to "en"
  let tpl = await db.emailTemplate.findUnique({ where: { slug_locale: { slug: input.slug, locale } } });
  if (!tpl && locale !== "en") {
    tpl = await db.emailTemplate.findUnique({ where: { slug_locale: { slug: input.slug, locale: "en" } } });
  }
  if (!tpl) {
    console.error(`[email] template not found: ${input.slug} (${locale})`);
    return { ok: false, reason: "template_not_found" };
  }
  if (!tpl.isActive) {
    return { ok: false, reason: "template_inactive" };
  }

  const subject = substituteVars(tpl.subject, vars);
  const html = substituteVars(tpl.bodyHtml, vars);
  const text = tpl.bodyText ? substituteVars(tpl.bodyText, vars) : undefined;

  // 2) Send (or no-op fallback)
  if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASS) {
    console.warn(`[email] Brevo not configured; would send "${input.slug}" to ${input.to}: ${subject}`);
    // Still increment so admins see "sent" in dev — keep simple
    return { ok: false, reason: "smtp_not_configured" };
  }

  try {
    await transporter().sendMail({
      from: input.override?.from ?? process.env.EMAIL_FROM ?? "promtexpress <noreply@promtexpress.com>",
      to: input.to,
      subject,
      html,
      ...(text ? { text } : {}),
      ...(input.override?.replyTo ? { replyTo: input.override.replyTo } : {}),
    });
  } catch (err) {
    console.error(`[email] sendMail failed (${input.slug} → ${input.to}):`, err);
    return { ok: false, reason: "smtp_error" };
  }

  // 3) sentCount++ (fire-and-forget)
  db.emailTemplate
    .update({ where: { id: tpl.id }, data: { sentCount: { increment: 1 } } })
    .catch((e) => console.error("[email] sentCount increment failed:", e));

  return { ok: true };
}
