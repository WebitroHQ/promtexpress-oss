import type { TemplateContentV4 } from "../render";

export function receiptEn(): TemplateContentV4 {
  return {
    subject: "Your PromtExpress receipt",
    preheader: "Payment received — your receipt is inside.",
    badge: { icon: "💳", text: "Payment Receipt" },
    heroImageSlug: "receipt",
    heroImageAlt: "Payment receipt",
    title: "Payment received",
    bodyHtml: `<p style="margin: 0;">Thanks! We received your payment of <strong style="color:#f5eef7;">{{amount}}</strong> for the <strong style="color:#f5eef7;">{{plan}}</strong> plan. Your subscription is active.</p>`,
    cta: { text: "View Invoice", urlPlaceholder: "invoiceUrl" },
    showFallbackUrl: false,
    notice: { icon: "📄", text: "A copy of this receipt is also available in your account billing history." },
    helpLine: "Questions about billing?",
    legalNote: "PromtExpress · Keep this email for your records.",
    bodyText: `Payment received — PromtExpress

Thanks! We received your payment of {{amount}} for the {{plan}} plan.

Invoice: {{invoiceUrl}}

— PromtExpress
https://promtexpress.com
Billing questions? support@promtexpress.com`,
  };
}

export function receiptTr(): TemplateContentV4 {
  return {
    subject: "PromtExpress makbuzun",
    preheader: "Ödemen alındı — makbuz içeride.",
    badge: { icon: "💳", text: "Ödeme Makbuzu" },
    heroImageSlug: "receipt",
    heroImageAlt: "Ödeme makbuzu",
    title: "Ödemen alındı",
    bodyHtml: `<p style="margin: 0;">Teşekkürler! <strong style="color:#f5eef7;">{{plan}}</strong> planı için <strong style="color:#f5eef7;">{{amount}}</strong> tutarındaki ödemeni aldık. Aboneliğin aktif.</p>`,
    cta: { text: "Faturayı Gör", urlPlaceholder: "invoiceUrl" },
    showFallbackUrl: false,
    notice: { icon: "📄", text: "Bu makbuzun bir kopyası hesabındaki fatura geçmişinde de mevcut." },
    helpLine: "Faturayla ilgili soru?",
    legalNote: "PromtExpress · Bu e-postayı kayıtların için sakla.",
    bodyText: `Ödemen alındı — PromtExpress

Teşekkürler! {{plan}} planı için {{amount}} tutarındaki ödemen alındı.

Fatura: {{invoiceUrl}}

— PromtExpress
https://promtexpress.com
Soru? support@promtexpress.com`,
  };
}
