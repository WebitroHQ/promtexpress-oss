import type { TemplateContentV4 } from "../render";

export function welcomeEn(): TemplateContentV4 {
  return {
    subject: "Welcome to PromtExpress 🎉",
    preheader: "Your account is ready. Let's craft your first prompt.",
    badge: { icon: "🎉", text: "Welcome aboard" },
    heroImageSlug: "welcome",
    heroImageAlt: "Welcome to PromtExpress",
    title: "You're in, {{name}}!",
    bodyHtml: `<p style="margin: 0;">Your PromtExpress account is ready. We've added <strong style="color:#f5eef7;">free credits</strong> so you can start crafting world-class prompts right away — for ChatGPT, Claude, Gemini, Midjourney and 50+ other engines.</p>`,
    cta: { text: "Open the studio", urlPlaceholder: "appUrl" },
    showFallbackUrl: false,
    notice: { icon: "💡", text: "Pro tip: try the Generator with a clear intent — the engine produces a tuned prompt within seconds." },
    helpLine: "Questions?",
    legalNote: "You're receiving this because you signed up to PromtExpress.",
    bodyText: `Welcome to PromtExpress, {{name}}!

Your account is ready and your free credits are added.

Open the studio: {{appUrl}}

Questions? support@promtexpress.com
— PromtExpress
https://promtexpress.com`,
  };
}

export function welcomeTr(): TemplateContentV4 {
  return {
    subject: "PromtExpress'e hoş geldin 🎉",
    preheader: "Hesabın hazır. İlk prompt'ını üretelim.",
    badge: { icon: "🎉", text: "Hoş geldin" },
    heroImageSlug: "welcome",
    heroImageAlt: "PromtExpress'e hoş geldin",
    title: "Aramıza hoş geldin, {{name}}!",
    bodyHtml: `<p style="margin: 0;">PromtExpress hesabın hazır. Hemen başlamak için <strong style="color:#f5eef7;">ücretsiz kredilerini</strong> ekledik — ChatGPT, Claude, Gemini, Midjourney ve 50+ diğer motora hazır promptlar üret.</p>`,
    cta: { text: "Stüdyoyu aç", urlPlaceholder: "appUrl" },
    showFallbackUrl: false,
    notice: { icon: "💡", text: "Öneri: Generator'a net bir niyet yaz — motor saniyeler içinde rafine prompt üretir." },
    helpLine: "Soru?",
    legalNote: "PromtExpress'e kayıt olduğun için bu e-postayı aldın.",
    bodyText: `PromtExpress'e hoş geldin, {{name}}!

Hesabın hazır ve ücretsiz kredilerin eklendi.

Stüdyoyu aç: {{appUrl}}

Soru? support@promtexpress.com
— PromtExpress
https://promtexpress.com`,
  };
}
