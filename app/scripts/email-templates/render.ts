import { renderLayout } from "./layout";
import { renderLayoutV4, type BadgeConfig, type NoticeConfig } from "./layout-v4";
import { verificationEn, verificationTr } from "./templates/verification";
import { welcomeEn, welcomeTr } from "./templates/welcome";
import { passwordResetEn, passwordResetTr } from "./templates/password-reset";
import { lowCreditsEn, lowCreditsTr } from "./templates/low-credits";
import { planRenewalEn, planRenewalTr } from "./templates/plan-renewal";
import { receiptEn, receiptTr } from "./templates/receipt";

const SITE_URL = "https://promtexpress.com";

/** Legacy v3 (light theme) — for templates not yet migrated. */
export interface TemplateContent {
  subject: string;
  preheader: string;
  title: string;
  bodyHtml: string;
  cta?: { text: string; urlPlaceholder: string };
  altLinkLabel?: string;
  footerLine?: string;
  legalNote: string;
  bodyText: string;
}

/** v4 (dark premium) — matches user reference design. */
export interface TemplateContentV4 {
  subject: string;
  preheader: string;
  badge?: BadgeConfig;
  /** Public asset slug at /brand/email/<slug>.svg */
  heroImageSlug?: string;
  heroImageAlt?: string;
  title: string;
  bodyHtml: string;
  cta?: { text: string; urlPlaceholder: string };
  showFallbackUrl?: boolean;
  altLinkLabel?: string;
  notice?: NoticeConfig;
  helpLine?: string;
  legalNote: string;
  bodyText: string;
}

export interface RenderedTemplate {
  slug: string;
  locale: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

/** v3 templates (legacy) — empty after full v4 migration */
const REGISTRY_V3: Record<string, Record<string, () => TemplateContent>> = {};

/** v4 templates (dark premium, brand-aligned) */
const REGISTRY_V4: Record<string, Record<string, () => TemplateContentV4>> = {
  verification: { en: verificationEn, tr: verificationTr },
  welcome: { en: welcomeEn, tr: welcomeTr },
  "password-reset": { en: passwordResetEn, tr: passwordResetTr },
  "low-credits": { en: lowCreditsEn, tr: lowCreditsTr },
  "plan-renewal": { en: planRenewalEn, tr: planRenewalTr },
  receipt: { en: receiptEn, tr: receiptTr },
};

export function renderAll(): RenderedTemplate[] {
  const out: RenderedTemplate[] = [];

  // v4 templates
  for (const [slug, locales] of Object.entries(REGISTRY_V4)) {
    for (const [locale, fn] of Object.entries(locales)) {
      const c = fn();
      const html = renderLayoutV4({
        preheader: c.preheader,
        badge: c.badge,
        heroImageUrl: c.heroImageSlug
          ? `${SITE_URL}/brand/email/${c.heroImageSlug}.png`
          : undefined,
        heroImageAlt: c.heroImageAlt,
        title: c.title,
        bodyHtml: c.bodyHtml,
        cta: c.cta
          ? { text: c.cta.text, url: `{{${c.cta.urlPlaceholder}}}` }
          : undefined,
        showFallbackUrl: c.showFallbackUrl,
        altLinkLabel: c.altLinkLabel,
        notice: c.notice,
        helpLine: c.helpLine,
        legalNote: c.legalNote,
      });
      out.push({
        slug,
        locale,
        subject: c.subject,
        bodyHtml: html,
        bodyText: c.bodyText,
      });
    }
  }

  // v3 templates (legacy)
  for (const [slug, locales] of Object.entries(REGISTRY_V3)) {
    for (const [locale, fn] of Object.entries(locales)) {
      const c = fn();
      const html = renderLayout({
        preheader: c.preheader,
        title: c.title,
        bodyHtml: c.bodyHtml,
        cta: c.cta ? { text: c.cta.text, url: `{{${c.cta.urlPlaceholder}}}` } : undefined,
        altLinkLabel: c.altLinkLabel,
        footerLine: c.footerLine,
        legalNote: c.legalNote,
      });
      out.push({
        slug,
        locale,
        subject: c.subject,
        bodyHtml: html,
        bodyText: c.bodyText,
      });
    }
  }

  return out;
}
