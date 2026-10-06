/**
 * Email layout v3 — görsel rafine.
 *
 * Değişiklikler (v2 → v3):
 *   - Brand adı "PromtExpress" (gerçek brand spelling, büyük P+E)
 *   - Logo badge 32 → 30px, hairline shadow, font-weight 800
 *   - Logo altına tagline "Prompt engineering, automated" (küçük, hafif gri)
 *   - Başlık 26 → 24px, line-height 1.3 (mobile dengeli, desktop ağır olmasın)
 *   - CTA padding 14×36 → 13×32, gradient daha kontrolü tek-tonlu
 *   - URL fallback sola hizalı (kendi tablosu, parent center inherit'i kırılmış)
 *   - Card padding 44 → 40 (denge)
 *   - Tüm tipografi -webkit-font-smoothing: antialiased (Apple Mail için)
 */

const BRAND_PRIMARY = "#3b3a6e";
const BRAND_PRIMARY_LIGHT = "#5d4eac";
const BRAND_ACCENT = "#c98a3a";
const TEXT_DARK = "#0f1419";
const TEXT_BODY = "#374151";
const TEXT_MUTED = "#6b7280";
const TEXT_FAINT = "#9ca3af";
const BORDER = "#e5e7eb";
const BG_WHITE = "#ffffff";
const BG_PAGE = "#f3f4f6";

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif';
const FONT_MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

export interface LayoutInput {
  preheader: string;
  title: string;
  bodyHtml: string;
  cta?: { text: string; url: string };
  altLinkLabel?: string;
  footerLine?: string;
  legalNote: string;
}

export function renderLayout(i: LayoutInput): string {
  const ctaBlock = i.cta
    ? `
        <table border="0" cellspacing="0" cellpadding="0" role="presentation" align="left" style="margin: 0;">
          <tr>
            <td align="center" bgcolor="${BRAND_PRIMARY}" style="border-radius: 8px; background-image: linear-gradient(135deg, ${BRAND_PRIMARY} 0%, ${BRAND_PRIMARY_LIGHT} 100%); mso-padding-alt: 0;">
              <a href="${i.cta.url}" target="_blank" rel="noopener" style="display: inline-block; padding: 13px 32px; font-family: ${FONT_STACK}; font-size: 14px; font-weight: 600; line-height: 1; color: #ffffff !important; text-decoration: none !important; border-radius: 8px; mso-padding-alt: 13px 32px;">
                <span style="color: #ffffff !important;">${escapeHtml(i.cta.text)} →</span>
              </a>
            </td>
          </tr>
        </table>
        <table border="0" cellspacing="0" cellpadding="0" role="presentation" align="left" width="100%" style="margin-top: 24px;">
          <tr>
            <td align="left" style="font-family: ${FONT_STACK}; font-size: 12px; line-height: 1.5; color: ${TEXT_FAINT};">
              ${escapeHtml(i.altLinkLabel ?? "Buton çalışmazsa bu bağlantıyı tarayıcına yapıştır:")}
            </td>
          </tr>
          <tr>
            <td align="left" style="font-family: ${FONT_MONO}; font-size: 11px; line-height: 1.5; color: ${TEXT_MUTED}; word-break: break-all; padding-top: 4px;">
              <a href="${i.cta.url}" style="color: ${TEXT_MUTED}; text-decoration: underline;">${i.cta.url}</a>
            </td>
          </tr>
        </table>`
    : "";

  return `<!doctype html>
<html lang="tr" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>${escapeHtml(i.title)}</title>
  <style>
    :root { color-scheme: light only; supported-color-schemes: light only; }
    a { color: ${BRAND_PRIMARY}; }
    @media only screen and (max-width: 620px) {
      .pe-container { width: 100% !important; max-width: 100% !important; }
      .pe-pad { padding-left: 24px !important; padding-right: 24px !important; }
      .pe-h1 { font-size: 22px !important; line-height: 1.3 !important; }
    }
  </style>
</head>
<body class="body" style="margin: 0; padding: 0; background: ${BG_PAGE}; font-family: ${FONT_STACK}; color: ${TEXT_DARK}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; -webkit-text-size-adjust: 100%;">
  <span style="display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; overflow: hidden; mso-hide: all;">${escapeHtml(i.preheader)}</span>
  <table border="0" cellspacing="0" cellpadding="0" width="100%" role="presentation" style="background: ${BG_PAGE};">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table border="0" cellspacing="0" cellpadding="0" width="600" class="pe-container" role="presentation" style="width: 600px; max-width: 600px;">

          <!-- Brand row (real logo from /public/brand/logo-mark.png) -->
          <tr>
            <td class="pe-pad" style="padding: 0 0 28px 0;" align="left">
              <table border="0" cellspacing="0" cellpadding="0" role="presentation">
                <tr>
                  <td style="vertical-align: middle; padding-right: 10px;">
                    <img src="https://promtexpress.com/brand/logo-mark.png" alt="PromtExpress" width="32" height="32" style="display: block; width: 32px; height: 32px; border: 0; outline: none; text-decoration: none;" />
                  </td>
                  <td style="vertical-align: middle; font-family: ${FONT_STACK}; font-size: 17px; font-weight: 600; color: ${TEXT_DARK}; letter-spacing: -0.015em; line-height: 1; padding-bottom: 1px;">
                    PromtExpress
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background: ${BG_WHITE}; border: 1px solid ${BORDER}; border-radius: 12px; box-shadow: 0 1px 2px rgba(15, 20, 25, 0.04);">
              <!-- Accent stripe -->
              <table border="0" cellspacing="0" cellpadding="0" width="100%" role="presentation">
                <tr>
                  <td style="height: 3px; background: ${BRAND_ACCENT}; border-radius: 12px 12px 0 0; line-height: 3px; font-size: 3px;">&nbsp;</td>
                </tr>
              </table>

              <table border="0" cellspacing="0" cellpadding="0" width="100%" role="presentation">
                <tr>
                  <td class="pe-pad" style="padding: 36px 40px 4px 40px;">
                    <h1 class="pe-h1" style="margin: 0 0 16px 0; font-family: ${FONT_STACK}; font-size: 24px; line-height: 1.3; font-weight: 700; color: ${TEXT_DARK}; letter-spacing: -0.018em;">
                      ${escapeHtml(i.title)}
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td class="pe-pad" style="padding: 0 40px 28px 40px;">
                    <div style="font-family: ${FONT_STACK}; font-size: 15px; line-height: 1.65; color: ${TEXT_BODY};">
                      ${i.bodyHtml}
                    </div>
                  </td>
                </tr>
                ${
                  ctaBlock
                    ? `<tr><td class="pe-pad" align="left" style="padding: 0 40px 32px 40px;">${ctaBlock}</td></tr>`
                    : ""
                }
                <tr>
                  <td class="pe-pad" style="padding: 0 40px 28px 40px;">
                    <table border="0" cellspacing="0" cellpadding="0" width="100%" role="presentation">
                      <tr>
                        <td style="border-top: 1px solid ${BORDER}; padding-top: 20px;">
                          <p style="margin: 0; font-family: ${FONT_STACK}; font-size: 12px; line-height: 1.6; color: ${TEXT_MUTED};">
                            ${i.footerLine ?? "Yardım gerekirse <a href=\"https://promtexpress.com/contact\" style=\"color: " + BRAND_PRIMARY + "; text-decoration: underline;\">bize yaz</a> — 24 saat içinde döneriz."}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="pe-pad" style="padding: 24px 4px 0 4px;">
              <p style="margin: 0 0 6px 0; font-family: ${FONT_STACK}; font-size: 11px; line-height: 1.5; color: ${TEXT_FAINT};">
                ${escapeHtml(i.legalNote)}
              </p>
              <p style="margin: 0; font-family: ${FONT_STACK}; font-size: 11px; line-height: 1.5; color: ${TEXT_FAINT};">
                © 2026 PromtExpress ·
                <a href="https://promtexpress.com/legal" style="color: ${TEXT_MUTED}; text-decoration: underline;">Şartlar</a> ·
                <a href="https://promtexpress.com/legal?tab=privacy" style="color: ${TEXT_MUTED}; text-decoration: underline;">Gizlilik</a> ·
                <a href="https://promtexpress.com" style="color: ${TEXT_MUTED}; text-decoration: underline;">promtexpress.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
