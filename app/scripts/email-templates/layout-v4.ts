/**
 * Email layout v4 — DARK premium, BRAND-aligned (landing-v3 colors).
 *
 * Renk sistemi landing-v3.css ile birebir:
 *   --orange #ff7a3a, --pink #ff3d8a, --violet #a04bff
 *   --grad: linear-gradient(90deg, #ff7a3a 0%, #ff3d8a 50%, #a04bff 100%)
 *   --bg #0b0510, --bg-2 #110618
 */

const BG_PAGE = "#0b0510";          // landing-v3 --bg
const BG_CARD = "#110618";          // landing-v3 --bg-2
const BG_CARD_INNER = "#1a0f25";
const BORDER_FAINT = "rgba(255,255,255,0.07)";
const BORDER_STRONG = "rgba(255,255,255,0.12)";

const TEXT_BRIGHT = "#f5eef7";      // landing --text
const TEXT_BODY = "#d4c8de";
const TEXT_MUTED = "#b6a8c2";       // landing --muted
const TEXT_FAINT = "#7e7088";       // landing --faint

// Brand gradient (landing-v3 --grad)
const BRAND_CYAN = "#ff3d8a";       // (var name kept for code stability) → pink
const BRAND_BLUE = "#ff7a3a";       // → orange
const BRAND_INDIGO = "#a04bff";     // → violet

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif';
const FONT_MONO =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

const SITE_URL = "https://promtexpress.com";
const SUPPORT_EMAIL = "support@promtexpress.com";

export interface BadgeConfig {
  icon?: string;     // Unicode/emoji glyph (e.g. "🔒")
  text: string;      // uppercase label (e.g. "EMAIL VERIFICATION")
  /** Override accent color (default = pink) */
  color?: string;
}

export interface NoticeConfig {
  icon?: string;     // emoji (e.g. "⏰")
  text: string;
  /** Override accent color (default = pink) */
  color?: string;
}

export interface CtaConfig {
  text: string;
  url: string;
  /** Gradient: from → mid → to. Default brand orange → pink → violet. */
  gradFrom?: string;
  gradMid?: string;
  gradTo?: string;
}

export interface LayoutV4Input {
  preheader: string;
  badge?: BadgeConfig;
  /** Hosted SVG/PNG URL (e.g. "https://promtexpress.com/brand/email/verification.svg") */
  heroImageUrl?: string;
  heroImageAlt?: string;
  /** Big H1 (white). */
  title: string;
  /** Body HTML (already escaped/rendered). Wrap paragraphs in <p> with margin-bottom: 0. */
  bodyHtml: string;
  /** Gradient button. */
  cta?: CtaConfig;
  /** Show fallback URL block under CTA? */
  showFallbackUrl?: boolean;
  altLinkLabel?: string;
  /** Bottom info card (optional). */
  notice?: NoticeConfig;
  /** Footer help line. Default: "Need help?" */
  helpLine?: string;
  /** Legal note (small print at very bottom). */
  legalNote: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderLayoutV4(i: LayoutV4Input): string {
  const badgeColor = i.badge?.color ?? BRAND_CYAN;
  const noticeColor = i.notice?.color ?? BRAND_CYAN;
  const gradFrom = i.cta?.gradFrom ?? BRAND_BLUE;    // orange
  const gradMid = i.cta?.gradMid ?? BRAND_CYAN;       // pink
  const gradTo = i.cta?.gradTo ?? BRAND_INDIGO;       // violet
  // For mso (Outlook) bgcolor — pick midpoint pink for solid fallback
  const ctaSolidFallback = gradMid;

  const badgeBlock = i.badge
    ? `
        <table border="0" cellspacing="0" cellpadding="0" role="presentation" align="center" style="margin: 0 auto 18px;">
          <tr>
            <td align="center" style="background-color: rgba(255,61,138,0.08); border: 1px solid rgba(255,61,138,0.28); border-radius: 100px; padding: 7px 16px;">
              <span style="font-family: ${FONT_STACK}; font-size: 11px; font-weight: 700; letter-spacing: 0.12em; color: ${badgeColor}; text-transform: uppercase;">
                ${i.badge.icon ? `<span style="margin-right: 6px;">${i.badge.icon}</span>` : ""}${escapeHtml(i.badge.text)}
              </span>
            </td>
          </tr>
        </table>`
    : "";

  const heroBlock = i.heroImageUrl
    ? `
        <table border="0" cellspacing="0" cellpadding="0" role="presentation" align="center" style="margin: 0 auto 22px;">
          <tr>
            <td align="center">
              <img src="${i.heroImageUrl}" alt="${escapeHtml(i.heroImageAlt ?? "")}" width="180" height="180" style="display: block; width: 180px; max-width: 180px; height: auto; border: 0;">
            </td>
          </tr>
        </table>`
    : "";

  const ctaBlock = i.cta
    ? `
        <table border="0" cellspacing="0" cellpadding="0" role="presentation" align="center" style="margin: 26px auto 0;">
          <tr>
            <td align="center" bgcolor="${ctaSolidFallback}" style="border-radius: 12px; background-image: linear-gradient(90deg, ${gradFrom} 0%, ${gradMid} 50%, ${gradTo} 100%); box-shadow: 0 8px 24px rgba(255,61,138,0.30); mso-padding-alt: 0;">
              <a href="${i.cta.url}" target="_blank" rel="noopener" style="display: inline-block; padding: 15px 38px; font-family: ${FONT_STACK}; font-size: 15px; font-weight: 700; line-height: 1; color: #ffffff !important; text-decoration: none !important; border-radius: 12px; mso-padding-alt: 15px 38px; letter-spacing: 0.01em;">
                <span style="color: #ffffff !important;">${escapeHtml(i.cta.text)}&nbsp;&nbsp;→</span>
              </a>
            </td>
          </tr>
        </table>`
    : "";

  // Display URL with soft-break opportunities (zero-width spaces after ? & = / )
  // — keeps href clean, lets long tokens wrap inside email clients that strip word-break.
  const displayUrl = i.cta
    ? escapeHtml(i.cta.url)
        .replace(/=/g, "=​")
        .replace(/&amp;/g, "&amp;​")
        .replace(/\?/g, "?​")
    : "";
  const fallbackBlock = (i.cta && i.showFallbackUrl !== false)
    ? `
        <table border="0" cellspacing="0" cellpadding="0" role="presentation" width="100%" style="width: 100%; max-width: 100%; margin-top: 26px; table-layout: fixed;">
          <tr>
            <td align="left" style="font-family: ${FONT_STACK}; font-size: 12.5px; line-height: 1.5; color: ${TEXT_MUTED}; padding-bottom: 10px;">
              ${escapeHtml(i.altLinkLabel ?? "If the button doesn't work, copy and paste this link into your browser:")}
            </td>
          </tr>
          <tr>
            <td align="left" style="background-color: ${BG_CARD_INNER}; border: 1px solid ${BORDER_FAINT}; border-radius: 10px; padding: 12px 14px; width: 100%; max-width: 100%; word-break: break-all; overflow-wrap: anywhere;">
              <a href="${i.cta.url}" style="font-family: ${FONT_MONO}; font-size: 11.5px; line-height: 1.5; color: ${BRAND_CYAN}; text-decoration: none; word-break: break-all; overflow-wrap: anywhere; display: inline-block; width: 100%; max-width: 100%;">${displayUrl}</a>
            </td>
          </tr>
        </table>`
    : "";

  const noticeBlock = i.notice
    ? `
        <table border="0" cellspacing="0" cellpadding="0" role="presentation" width="100%" style="margin-top: 18px; max-width: 528px;">
          <tr>
            <td style="background-color: ${BG_CARD_INNER}; border: 1px solid ${noticeColor}33; border-radius: 10px; padding: 12px 14px;">
              <table border="0" cellspacing="0" cellpadding="0" role="presentation" width="100%">
                <tr>
                  <td valign="middle" width="26" style="padding-right: 10px; font-size: 16px; line-height: 1;">${i.notice.icon ?? "ℹ️"}</td>
                  <td valign="middle" style="font-family: ${FONT_STACK}; font-size: 13px; line-height: 1.5; color: ${TEXT_BODY};">
                    ${escapeHtml(i.notice.text)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>`
    : "";

  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="color-scheme" content="dark only" />
  <meta name="supported-color-schemes" content="dark only" />
  <title>${escapeHtml(i.title)}</title>
  <style>
    :root { color-scheme: dark only; supported-color-schemes: dark only; }
    body, table, td, div, p, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt !important; mso-table-rspace: 0pt !important; border-collapse: collapse !important; }
    body { margin: 0 !important; padding: 0 !important; background-color: ${BG_PAGE} !important; width: 100% !important; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    a { color: ${BRAND_CYAN}; }
    @media only screen and (max-width: 620px) {
      .pe-container { width: 100% !important; max-width: 100% !important; }
      .pe-card { padding: 30px 20px !important; }
      .pe-title { font-size: 24px !important; line-height: 1.3 !important; }
      .pe-hero img { width: 150px !important; height: 150px !important; }
    }
  </style>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${BG_PAGE}; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <!-- preheader (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden; visibility: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: ${BG_PAGE};">
    ${escapeHtml(i.preheader)}
  </div>

  <center style="width: 100%; background-color: ${BG_PAGE};">
  <table border="0" cellspacing="0" cellpadding="0" role="presentation" width="100%" bgcolor="${BG_PAGE}" style="background-color: ${BG_PAGE}; width: 100%; min-width: 100%;">
    <tr>
      <td align="center" valign="top" style="padding: 36px 16px;">

        <!--[if mso]>
        <table border="0" cellspacing="0" cellpadding="0" role="presentation" width="600" align="center" style="width: 600px;">
          <tr><td align="center" valign="top" width="600" style="width: 600px;">
        <![endif]-->
        <div style="max-width: 600px; margin: 0 auto;">
        <table border="0" cellspacing="0" cellpadding="0" role="presentation" class="pe-container" width="600" align="center" style="width: 100% !important; max-width: 600px !important; margin: 0 auto !important; border-collapse: collapse; table-layout: fixed;">

          <!-- Branded header -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <table border="0" cellspacing="0" cellpadding="0" role="presentation" align="center">
                <tr>
                  <td valign="middle" style="padding-right: 10px;">
                    <img src="${SITE_URL}/brand/logo-mark.png" alt="" width="30" height="30" style="display: block; width: 30px; height: 30px; border-radius: 7px; border: 0;">
                  </td>
                  <td valign="middle" style="font-family: ${FONT_STACK}; font-size: 18px; font-weight: 700; letter-spacing: -0.01em; color: ${TEXT_BRIGHT};">
                    PromtExpress
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td bgcolor="${BG_CARD}" class="pe-card" style="background-color: ${BG_CARD}; background-image: linear-gradient(180deg, rgba(28,13,40,0.85), rgba(18,8,28,0.85)); border: 1px solid ${BORDER_STRONG}; border-radius: 18px; padding: 36px 44px; box-shadow: 0 30px 60px -30px rgba(255,61,138,0.18);">

              <!-- Hero illustration (centered) -->
              <table border="0" cellspacing="0" cellpadding="0" role="presentation" align="center" width="100%" class="pe-hero">
                <tr><td align="center">${heroBlock}</td></tr>
              </table>

              <!-- Badge -->
              <table border="0" cellspacing="0" cellpadding="0" role="presentation" align="center" width="100%">
                <tr><td align="center">${badgeBlock}</td></tr>
              </table>

              <!-- Title -->
              <table border="0" cellspacing="0" cellpadding="0" role="presentation" align="center" width="100%">
                <tr>
                  <td align="center" class="pe-title" style="font-family: ${FONT_STACK}; font-size: 28px; font-weight: 700; line-height: 1.25; letter-spacing: -0.02em; color: ${TEXT_BRIGHT}; padding-bottom: 12px;">
                    ${escapeHtml(i.title)}
                  </td>
                </tr>
              </table>

              <!-- Body -->
              <table border="0" cellspacing="0" cellpadding="0" role="presentation" align="center" width="100%">
                <tr>
                  <td align="center" style="font-family: ${FONT_STACK}; font-size: 15px; line-height: 1.6; color: ${TEXT_BODY}; padding-bottom: 4px;">
                    ${i.bodyHtml}
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table border="0" cellspacing="0" cellpadding="0" role="presentation" align="center" width="100%">
                <tr><td align="center">${ctaBlock}</td></tr>
              </table>

              <!-- Fallback URL -->
              <table border="0" cellspacing="0" cellpadding="0" role="presentation" align="center" width="100%">
                <tr><td align="center">${fallbackBlock}</td></tr>
              </table>

              <!-- Notice -->
              <table border="0" cellspacing="0" cellpadding="0" role="presentation" align="center" width="100%">
                <tr><td align="center">${noticeBlock}</td></tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 24px 16px 6px;">
              <table border="0" cellspacing="0" cellpadding="0" role="presentation" align="center">
                <tr>
                  <td valign="middle" style="padding-right: 6px; font-size: 14px; line-height: 1;">💬</td>
                  <td valign="middle" style="font-family: ${FONT_STACK}; font-size: 13px; line-height: 1.5; color: ${TEXT_MUTED};">
                    ${escapeHtml(i.helpLine ?? "Need help?")}&nbsp;<a href="mailto:${SUPPORT_EMAIL}" style="color: ${BRAND_CYAN}; text-decoration: none;">${SUPPORT_EMAIL}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 10px 16px 0;">
              <p style="margin: 0; font-family: ${FONT_STACK}; font-size: 11px; line-height: 1.6; color: ${TEXT_FAINT};">
                ${escapeHtml(i.legalNote)}
              </p>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding: 12px 16px 0;">
              <p style="margin: 0; font-family: ${FONT_STACK}; font-size: 11px; line-height: 1.6; color: ${TEXT_FAINT};">
                © ${new Date().getFullYear()} PromtExpress · <a href="${SITE_URL}" style="color: ${TEXT_MUTED}; text-decoration: none;">promtexpress.com</a>
              </p>
            </td>
          </tr>

        </table>
        </div>
        <!--[if mso]>
          </td></tr>
        </table>
        <![endif]-->

      </td>
    </tr>
  </table>
  </center>
</body>
</html>`;
}
