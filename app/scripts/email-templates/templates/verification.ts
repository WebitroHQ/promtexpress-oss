import type { TemplateContentV4 } from "../render";

export function verificationEn(): TemplateContentV4 {
  return {
    subject: "Verify your email — PromtExpress",
    preheader: "One click to activate your PromtExpress account and unlock the prompt studio.",
    badge: { icon: "🔒", text: "Email Verification" },
    heroImageSlug: "verification",
    heroImageAlt: "Verify your email",
    title: "Verify your email",
    bodyHtml: `<p style="margin: 0;">Thanks for signing up! Please verify your email address to activate your account and start using PromtExpress.</p>`,
    cta: { text: "Verify My Email", urlPlaceholder: "verifyUrl" },
    showFallbackUrl: true,
    altLinkLabel: "If the button doesn't work, copy and paste this link into your browser:",
    notice: { icon: "⏰", text: "This link expires in 24 hours for your security." },
    helpLine: "Need help?",
    legalNote: "If you didn't sign up for PromtExpress, you can safely ignore this email.",
    bodyText: `Verify your email — PromtExpress

Thanks for signing up! Please verify your email to activate your account:

{{verifyUrl}}

This link expires in 24 hours.

If you didn't sign up, you can safely ignore this email.

— PromtExpress
https://promtexpress.com
Need help? support@promtexpress.com`,
  };
}

export function verificationTr(): TemplateContentV4 {
  return {
    subject: "E-postanı doğrula — PromtExpress",
    preheader: "Tek tıkla PromtExpress hesabını aktive et ve prompt stüdyosuna eriş.",
    badge: { icon: "🔒", text: "E-posta Doğrulama" },
    heroImageSlug: "verification",
    heroImageAlt: "E-postanı doğrula",
    title: "E-postanı doğrula",
    bodyHtml: `<p style="margin: 0;">Kayıt olduğun için teşekkürler! Hesabını aktive etmek ve PromtExpress'i kullanmaya başlamak için lütfen e-posta adresini doğrula.</p>`,
    cta: { text: "E-postayı Doğrula", urlPlaceholder: "verifyUrl" },
    showFallbackUrl: true,
    altLinkLabel: "Buton çalışmıyorsa bu bağlantıyı kopyalayıp tarayıcına yapıştır:",
    notice: { icon: "⏰", text: "Bu bağlantı güvenliğin için 24 saat içinde sona erer." },
    helpLine: "Yardım?",
    legalNote: "PromtExpress'e kayıt olmadıysan bu e-postayı güvenle yok sayabilirsin.",
    bodyText: `E-postanı doğrula — PromtExpress

Kayıt olduğun için teşekkürler! Hesabını aktive etmek için e-postanı doğrula:

{{verifyUrl}}

Bu bağlantı 24 saat geçerli.

Sen kayıt olmadıysan bu e-postayı yok say.

— PromtExpress
https://promtexpress.com
Yardım? support@promtexpress.com`,
  };
}
