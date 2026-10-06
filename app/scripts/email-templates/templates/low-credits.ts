import type { TemplateContentV4 } from "../render";

export function lowCreditsEn(): TemplateContentV4 {
  return {
    subject: "You're running low on credits — PromtExpress",
    preheader: "Top up to keep your prompts flowing.",
    badge: { icon: "⚡", text: "Credits Low" },
    heroImageSlug: "low-credits",
    heroImageAlt: "Low credits warning",
    title: "Almost out of credits",
    bodyHtml: `<p style="margin: 0;">Heads up — your account is running low. You currently have <strong style="color:#f9fafb;">{{remainingCredits}} credits</strong> left. Top up or upgrade to keep generating without interruption.</p>`,
    cta: { text: "Top Up Credits", urlPlaceholder: "topUpUrl" },
    showFallbackUrl: false,
    notice: { icon: "💎", text: "Annual plans save you up to 20% — switch from monthly any time." },
    helpLine: "Questions?",
    legalNote: "You're receiving this because credits dropped below your threshold. Adjust notification settings any time in your account.",
    bodyText: `Almost out of credits — PromtExpress

You have {{remainingCredits}} credits left.

Top up: {{topUpUrl}}

— PromtExpress
https://promtexpress.com
Questions? support@promtexpress.com`,
  };
}

export function lowCreditsTr(): TemplateContentV4 {
  return {
    subject: "Kredilerin azalıyor — PromtExpress",
    preheader: "Promptların kesintisiz akmaya devam etsin diye yükle.",
    badge: { icon: "⚡", text: "Kredi Düşük" },
    heroImageSlug: "low-credits",
    heroImageAlt: "Düşük kredi uyarısı",
    title: "Kredilerin tükeniyor",
    bodyHtml: `<p style="margin: 0;">Dikkat — hesabındaki krediler azalıyor. Şu an <strong style="color:#f9fafb;">{{remainingCredits}} kredin</strong> kaldı. Kesintisiz üretim için yükleme yap ya da planını yükselt.</p>`,
    cta: { text: "Kredi Yükle", urlPlaceholder: "topUpUrl" },
    showFallbackUrl: false,
    notice: { icon: "💎", text: "Yıllık planlar %20'ye varan tasarruf sağlar — istediğin zaman aylıktan geçebilirsin." },
    helpLine: "Soru?",
    legalNote: "Kredilerin eşik değerinin altına düştüğü için bu bildirim gönderildi. Bildirim ayarlarını hesabından değiştirebilirsin.",
    bodyText: `Kredilerin tükeniyor — PromtExpress

{{remainingCredits}} kredin kaldı.

Yükle: {{topUpUrl}}

— PromtExpress
https://promtexpress.com
Soru? support@promtexpress.com`,
  };
}
