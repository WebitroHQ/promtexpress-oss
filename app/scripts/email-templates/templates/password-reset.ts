import type { TemplateContentV4 } from "../render";

export function passwordResetEn(): TemplateContentV4 {
  return {
    subject: "Reset your password — PromtExpress",
    preheader: "Click the secure link to set a new password.",
    badge: { icon: "🔑", text: "Password Reset" },
    heroImageSlug: "password-reset",
    heroImageAlt: "Reset your password",
    title: "Reset your password",
    bodyHtml: `<p style="margin: 0;">We received a request to reset the password for your PromtExpress account. Click the button below to set a new one.</p>`,
    cta: { text: "Reset Password", urlPlaceholder: "resetUrl" },
    showFallbackUrl: true,
    altLinkLabel: "If the button doesn't work, copy and paste this link into your browser:",
    notice: { icon: "⏰", text: "This link expires in 1 hour for your security." },
    helpLine: "Need help?",
    legalNote: "If you didn't request a password reset, you can safely ignore this email — your account stays secure.",
    bodyText: `Reset your password — PromtExpress

We received a request to reset your password.

{{resetUrl}}

This link expires in 1 hour. If you didn't request this, ignore the message.

— PromtExpress
https://promtexpress.com
Need help? support@promtexpress.com`,
  };
}

export function passwordResetTr(): TemplateContentV4 {
  return {
    subject: "Parolanı sıfırla — PromtExpress",
    preheader: "Yeni parola belirlemek için güvenli bağlantıya tıkla.",
    badge: { icon: "🔑", text: "Parola Sıfırlama" },
    heroImageSlug: "password-reset",
    heroImageAlt: "Parolanı sıfırla",
    title: "Parolanı sıfırla",
    bodyHtml: `<p style="margin: 0;">PromtExpress hesabın için parola sıfırlama talebi aldık. Yeni parolanı belirlemek için aşağıdaki butona tıkla.</p>`,
    cta: { text: "Parolayı Sıfırla", urlPlaceholder: "resetUrl" },
    showFallbackUrl: true,
    altLinkLabel: "Buton çalışmıyorsa bu bağlantıyı kopyalayıp tarayıcına yapıştır:",
    notice: { icon: "⏰", text: "Bu bağlantı güvenliğin için 1 saat içinde sona erer." },
    helpLine: "Yardım?",
    legalNote: "Parola sıfırlama talebinde bulunmadıysan bu e-postayı yok sayabilirsin — hesabın güvende.",
    bodyText: `Parolanı sıfırla — PromtExpress

Parola sıfırlama talebi aldık.

{{resetUrl}}

Bağlantı 1 saat geçerli. Sen istemediysen mesajı yok say.

— PromtExpress
https://promtexpress.com
Yardım? support@promtexpress.com`,
  };
}
