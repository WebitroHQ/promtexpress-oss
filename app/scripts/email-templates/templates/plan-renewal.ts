import type { TemplateContentV4 } from "../render";

export function planRenewalEn(): TemplateContentV4 {
  return {
    subject: "Your plan renews tomorrow — PromtExpress",
    preheader: "A heads up before your subscription auto-renews.",
    badge: { icon: "🔄", text: "Plan Renewal" },
    heroImageSlug: "plan-renewal",
    heroImageAlt: "Plan renewal notice",
    title: "Your plan renews soon",
    bodyHtml: `<p style="margin: 0;">A friendly heads up — your <strong style="color:#f9fafb;">{{planName}}</strong> plan will auto-renew on <strong style="color:#f9fafb;">{{renewDate}}</strong>. No action needed if you'd like to continue.</p>`,
    cta: { text: "Manage Subscription", urlPlaceholder: "managementUrl" },
    showFallbackUrl: false,
    notice: { icon: "ℹ️", text: "Want to switch plans, downgrade, or cancel? Manage everything in one click." },
    helpLine: "Questions?",
    legalNote: "You can cancel any time before the renewal date. Already-used credits and prompts stay yours.",
    bodyText: `Your plan renews soon — PromtExpress

Your {{planName}} plan auto-renews on {{renewDate}}.

Manage: {{managementUrl}}

— PromtExpress
https://promtexpress.com
Questions? support@promtexpress.com`,
  };
}

export function planRenewalTr(): TemplateContentV4 {
  return {
    subject: "Planın yarın yenilenecek — PromtExpress",
    preheader: "Otomatik yenileme öncesi küçük bir hatırlatma.",
    badge: { icon: "🔄", text: "Plan Yenilemesi" },
    heroImageSlug: "plan-renewal",
    heroImageAlt: "Plan yenileme bildirimi",
    title: "Planın yakında yenileniyor",
    bodyHtml: `<p style="margin: 0;">Küçük bir hatırlatma — <strong style="color:#f9fafb;">{{planName}}</strong> planın <strong style="color:#f9fafb;">{{renewDate}}</strong> tarihinde otomatik yenilenecek. Devam etmek istiyorsan yapman gereken bir şey yok.</p>`,
    cta: { text: "Aboneliği Yönet", urlPlaceholder: "managementUrl" },
    showFallbackUrl: false,
    notice: { icon: "ℹ️", text: "Plan değiştirmek, düşürmek ya da iptal etmek mi istiyorsun? Her şey tek tıkla yönetilebilir." },
    helpLine: "Soru?",
    legalNote: "Yenileme tarihinden önce istediğin zaman iptal edebilirsin. Halihazırda kullandığın krediler ve promptlar senindir.",
    bodyText: `Planın yakında yenileniyor — PromtExpress

{{planName}} planın {{renewDate}} tarihinde otomatik yenilenir.

Yönet: {{managementUrl}}

— PromtExpress
https://promtexpress.com
Soru? support@promtexpress.com`,
  };
}
