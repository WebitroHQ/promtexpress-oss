/**
 * Layer 1 — PRE-PROCESS (KOD only, no AI call)
 *
 * Direktif #8: Kod ile yapılabilen %100 kod. Bu katmanda AI çağrısı YOK.
 *
 * Yaptıkları:
 *   - Dil tespiti (lang-detect heuristic)
 *   - PII regex maskele (e-mail, phone, credit-card-like)
 *   - Whitespace + ham metin temizliği
 *   - Modality tutarlılık kontrolü
 */
import { detectLanguage } from "@/lib/library/lang-detect";
import type { Modality, PreprocessOutput } from "./types";

// PII regex'leri — basit ama etkili
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
// E.164 + boşluklu Türk + uluslararası
const PHONE_RE = /(?:\+|00)?[1-9]\d{0,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{0,4}/g;
// Kart numarası — 13-19 hane, boşluk/tire opsiyonel
const CARD_RE = /\b(?:\d[ -]?){13,19}\b/g;

// ── Entity-hint regex'leri (AI çağrısı YOK — Direktif #8) ──────────────────
// Tırnak içi metin: düz "...", curly "..." ‘…’, tek tırnak '...', curly ‘...’ ’...’
const QUOTED_RE = /["“”«»‹›„‚]([^"“”«»‹›„‚]{1,200})["“”«»‹›„‚]|[‘’']([^‘’']{2,200})[‘’']/g;
// Yüzde: "%30", "30%", "%30,5"
const PERCENT_RE = /(?:%\s?\d{1,3}(?:[.,]\d{1,2})?|\d{1,3}(?:[.,]\d{1,2})?\s?%)/g;
// Para: ₺/TL/USD/EUR/£/€/$ + sayı veya tersi
const MONEY_RE = /(?:[₺€£$¥]\s?\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{1,2})?|\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d{1,2})?\s?(?:TL|USD|EUR|GBP|TRY|₺|€|£|\$))/gi;
// Tarih: YYYY-MM-DD, DD/MM/YYYY, "12 Mayıs", "May 12", "Mayıs 2026"
const DATE_RE = /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}[./]\d{1,2}[./]\d{2,4}|\d{1,2}\s+(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık|Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)(?:\s+\d{2,4})?|(?:Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık|January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{2,4})\b/gi;
// Proper noun cluster: ardışık 1+ "Capitalized" kelime (Türkçe/Latin diakritikler dahil)
// Cümle başı tek-kelime gürültüsünü ayıklamak için ≥2 kelime VEYA tüm-büyük (kısaltma) tercih edilir
const PROPER_RE = /\b(?:[A-ZÇĞİÖŞÜÂÊÎÔÛ][a-zçğıöşüâêîôû]+(?:\s+[A-ZÇĞİÖŞÜÂÊÎÔÛ][a-zçğıöşüâêîôû]+)+|[A-ZÇĞİÖŞÜ]{2,})\b/g;

// Deliverable kanal/format anahtar kelimeleri — TR + EN sözlüğü, marka değil
const DELIVERABLE_KEYWORDS = [
  // TR
  "post", "gönderi", "banner", "reklam", "story", "hikaye", "reel", "kapak",
  "logo", "e-posta", "mail", "video", "broşür", "afiş", "kart", "afis",
  "sunum", "kartvizit", "etiket", "ambalaj",
  // EN
  "ad", "cover", "email", "brochure", "flyer", "card", "presentation",
  "business card", "label", "packaging", "thumbnail", "wallpaper", "header",
];

const TR_DIACRITICS = ["ç", "ğ", "ı", "ö", "ş", "ü", "â", "î", "û"];
// Frekanslı diğer Latin diakritikler (DE/FR/ES/PT vb. — dil-bazlı)
const OTHER_DIACRITICS_RE = /[áàâäãåéèêëíìîïñóòôöõúùûüýÿæœßÁÀÂÄÃÅÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝŸÆŒ]/;

export function preprocess(rawText: string, modality: Modality): PreprocessOutput {
  const piiMasked: { type: string; mask: string }[] = [];

  // Whitespace normalize
  let cleanText = rawText.trim().replace(/\s+/g, " ");

  // PII mask
  cleanText = cleanText.replace(EMAIL_RE, (match) => {
    piiMasked.push({ type: "email", mask: "[EMAIL]" });
    return "[EMAIL]";
  });
  cleanText = cleanText.replace(PHONE_RE, (match) => {
    // skip if too short or pure digits without separators (likely numeric data)
    const digits = match.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) return match;
    piiMasked.push({ type: "phone", mask: "[PHONE]" });
    return "[PHONE]";
  });
  cleanText = cleanText.replace(CARD_RE, (match) => {
    const digits = match.replace(/\D/g, "");
    if (digits.length < 13 || digits.length > 19) return match;
    // Luhn check (basit doğrulama — false positive azaltma)
    if (!luhnValid(digits)) return match;
    piiMasked.push({ type: "card", mask: "[CARD]" });
    return "[CARD]";
  });

  const langResult = detectLanguage(cleanText);
  // EntityHints PII maskeleme ÖNCESİ ham metinden çıkarılır — telefon regex'i tarih sayılarını
  // yutmasın diye. (PII zaten cleanText'te maskelenmiş; AI'a maskelenmiş metin gider.)
  const preMaskText = rawText.trim().replace(/\s+/g, " ");
  const entityHints = extractEntityHints(preMaskText, langResult.lang);

  return {
    rawText,
    cleanText,
    language: langResult.lang,
    modality,
    charCount: cleanText.length,
    piiMasked,
    entityHints,
  };
}

/**
 * Regex tabanlı entity-hint çıkarımı. AI çağrısı YOK (Direktif #8).
 * Intent analyzer'a yardımcı sinyal olarak iletilir; AI alanları doldururken
 * bu listeyi cross-check eder, gözden kaçırma riskini düşürür.
 */
function extractEntityHints(text: string, lang: string): {
  properNouns: string[];
  quotedStrings: string[];
  percentages: string[];
  monetary: string[];
  dates: string[];
  deliverableKeywords: string[];
} {
  const dedupe = (arr: string[]): string[] => Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)));

  const quotedStrings: string[] = [];
  let qm: RegExpExecArray | null;
  const qre = new RegExp(QUOTED_RE.source, "g");
  while ((qm = qre.exec(text)) !== null) {
    const match = qm[1] ?? qm[2];
    if (match && match.trim().length >= 2) quotedStrings.push(match.trim());
  }

  const percentages = dedupe(text.match(PERCENT_RE) ?? []);
  const monetary = dedupe(text.match(MONEY_RE) ?? []);
  const dates = dedupe(text.match(DATE_RE) ?? []);
  const properNouns = dedupe(text.match(PROPER_RE) ?? []).slice(0, 20);

  // Deliverable kelimeleri — TR ekleri için prefix toleransı (post → postu, banner → banner'ı)
  const lower = text.toLocaleLowerCase("tr-TR");
  const deliverableKeywords = dedupe(
    DELIVERABLE_KEYWORDS.filter((kw) => {
      // \bkw[suffix?]\b — kelime başlangıcı; sonra opsiyonel TR eki (max 5 harf)
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(`\\b${escaped}(?:[a-zçğıöşü']{0,5})?\\b`, "i");
      return re.test(lower);
    }),
  );

  return { properNouns, quotedStrings, percentages, monetary, dates, deliverableKeywords };
}

// Suppress "intentionally unused" warning if downstream layer wants to read raw lang for diacritic guard.
void TR_DIACRITICS;
void OTHER_DIACRITICS_RE;

function luhnValid(digits: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}
