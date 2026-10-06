"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { requireAdmin, writeAudit } from "@/lib/audit";
import { sendTemplateEmail } from "@/server/email/template-send";

const SLUG_RE = /^[a-z0-9-]+$/;
const LOCALE_RE = /^[a-z]{2}(-[A-Z]{2})?$/;

const TemplateSchema = z.object({
  slug: z.string().trim().min(1).max(60).regex(SLUG_RE, "Slug yalnızca [a-z0-9-]"),
  locale: z.string().trim().min(2).max(10).regex(LOCALE_RE, "Locale e.g. 'en' or 'tr-TR'"),
  subject: z.string().trim().min(1).max(200),
  bodyHtml: z.string().min(1).max(50000),
  bodyText: z.string().max(50000).optional().nullable().transform((v) => (v && v.length > 0 ? v : null)),
  isActive: z.boolean().default(true),
});

export async function createEmailTemplate(input: z.input<typeof TemplateSchema>) {
  const admin = await requireAdmin();
  const parsed = TemplateSchema.parse(input);

  try {
    const created = await db.emailTemplate.create({
      data: {
        slug: parsed.slug,
        locale: parsed.locale,
        subject: parsed.subject,
        bodyHtml: parsed.bodyHtml,
        bodyText: parsed.bodyText,
        isActive: parsed.isActive,
        updatedBy: admin.email,
      },
    });
    await writeAudit({ actorId: admin.id, action: "email.create", targetType: "emailTemplate", targetId: created.id, meta: { slug: parsed.slug, locale: parsed.locale } });
    revalidatePath("/pr/yonet/emails");
    return { ok: true, id: created.id };
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      throw new Error(`Template "${parsed.slug}" for locale "${parsed.locale}" already exists`);
    }
    throw e;
  }
}

export async function updateEmailTemplate(id: string, input: z.input<typeof TemplateSchema>) {
  const admin = await requireAdmin();
  const parsed = TemplateSchema.parse(input);

  await db.emailTemplate.update({
    where: { id },
    data: {
      slug: parsed.slug,
      locale: parsed.locale,
      subject: parsed.subject,
      bodyHtml: parsed.bodyHtml,
      bodyText: parsed.bodyText,
      isActive: parsed.isActive,
      updatedBy: admin.email,
    },
  });
  await writeAudit({ actorId: admin.id, action: "email.update", targetType: "emailTemplate", targetId: id, meta: { slug: parsed.slug, locale: parsed.locale } });
  revalidatePath("/pr/yonet/emails");
  return { ok: true };
}

export async function deleteEmailTemplate(id: string) {
  const admin = await requireAdmin();
  await db.emailTemplate.delete({ where: { id } });
  await writeAudit({ actorId: admin.id, action: "email.delete", targetType: "emailTemplate", targetId: id });
  revalidatePath("/pr/yonet/emails");
  return { ok: true };
}

const PreviewSchema = z.object({
  bodyHtml: z.string(),
  vars: z.record(z.string(), z.string()).default({}),
});

export async function previewEmailTemplate(input: z.input<typeof PreviewSchema>) {
  await requireAdmin();
  const parsed = PreviewSchema.parse(input);
  let out = parsed.bodyHtml;
  for (const [k, v] of Object.entries(parsed.vars)) {
    out = out.replaceAll(`{{${k}}}`, v);
  }
  return { html: out };
}

const SendTestSchema = z.object({
  slug: z.string().trim().min(1).max(60),
  locale: z.string().trim().min(2).max(10).default("en"),
  to: z.string().email(),
  vars: z.record(z.string(), z.string()).default({}),
});

export async function sendTestEmail(input: z.input<typeof SendTestSchema>) {
  const admin = await requireAdmin();
  const parsed = SendTestSchema.parse(input);

  // Provide sane defaults for common placeholders so test mails look real.
  const vars: Record<string, string> = {
    name: "Test User",
    verifyUrl: "https://promtexpress.com/auth/verify?token=test",
    resetUrl: "https://promtexpress.com/auth/reset?token=test",
    credits: "10",
    planName: "Pro",
    date: new Date().toLocaleDateString(),
    cardLast4: "4242",
    amount: "$39",
    receiptUrl: "https://promtexpress.com/billing/receipt/test",
    ...parsed.vars,
  };

  const result = await sendTemplateEmail({
    slug: parsed.slug,
    locale: parsed.locale,
    to: parsed.to,
    vars,
  });

  await writeAudit({
    actorId: admin.id,
    action: "email.sendTest",
    targetType: "emailTemplate",
    targetId: `${parsed.slug}/${parsed.locale}`,
    meta: { to: parsed.to, ok: result.ok, reason: result.ok ? null : result.reason },
  });

  return result;
}
