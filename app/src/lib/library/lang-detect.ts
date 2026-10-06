/**
 * Two-stage language detector.
 *
 * Stage 1 (cheap, script-based):
 *   Distinctive Unicode blocks pin down languages whose script is unique —
 *   Arabic, CJK, Hangul, Cyrillic, Devanagari, Thai, Hebrew, Greek,
 *   Burmese — plus Turkish via its accent characters.
 *
 * Stage 2 (franc-min, statistical):
 *   For Latin-script content, franc-min runs trigram statistics over
 *   ~80 common languages and returns an ISO 639-3 code. This catches
 *   Italian, Portuguese, Polish, Indonesian, Vietnamese, Catalan, Dutch,
 *   Swedish, Czech, Romanian, etc. — everything our hand-rolled
 *   word-frequency heuristic misses.
 *
 * Output is normalised to ISO 639-1 codes ("en", "es", "ru", …).
 */
import { franc } from "franc-min";

type LangResult = { lang: string; confidence: "high" | "medium" | "low" };

const ARABIC_CHARS = /[؀-ۿ]/g;
const CHINESE_CHARS = /[一-鿿]/g;
const JAPANESE_CHARS = /[぀-ヿ]/g;
const KOREAN_CHARS = /[가-힯]/g;
const CYRILLIC_CHARS = /[Ѐ-ӿ]/g;
const DEVANAGARI_CHARS = /[ऀ-ॿ]/g;
const THAI_CHARS = /[฀-๿]/g;
const HEBREW_CHARS = /[֐-׿]/g;
const GREEK_CHARS = /[Ͱ-Ͽ]/g;
const TURKISH_CHARS = /[ğüşıöçĞÜŞİÖÇ]/g;

// Common loanword latin-extended characters that LOOK non-English but
// often appear in English text (café, naïve, façade, El Niño…). We
// require franc to disagree with English before flagging on these alone.

// franc returns ISO 639-3; map to 639-1 for the rest of the codebase.
const ISO_3_TO_1: Record<string, string> = {
  eng: "en",
  spa: "es",
  por: "pt",
  ind: "id",
  ita: "it",
  fra: "fr",
  deu: "de",
  nld: "nl",
  pol: "pl",
  ron: "ro",
  ces: "cs",
  slk: "sk",
  hun: "hu",
  fin: "fi",
  swe: "sv",
  dan: "da",
  nor: "no",
  cat: "ca",
  vie: "vi",
  tur: "tr",
  rus: "ru",
  ukr: "uk",
  ell: "el",
  arb: "ar",
  ara: "ar",
  zho: "zh",
  cmn: "zh",
  jpn: "ja",
  kor: "ko",
  hin: "hi",
  ben: "bn",
  tha: "th",
  heb: "he",
  fas: "fa",
  pes: "fa",
  urd: "ur",
  swa: "sw",
  tgl: "tl",
  ceb: "ceb",
  jav: "jv",
  msa: "ms",
  zsm: "ms",
  lit: "lt",
  lav: "lv",
  est: "et",
  bul: "bg",
  srp: "sr",
  hrv: "hr",
  slv: "sl",
};

function countMatches(text: string, regex: RegExp): number {
  return (text.match(regex) ?? []).length;
}

export function detectLanguage(text: string): LangResult {
  if (!text || text.trim().length === 0) {
    return { lang: "en", confidence: "low" };
  }

  const sample = text.slice(0, 1000);

  // ── Stage 1 — scripts that uniquely identify a language ────────────────
  if (countMatches(sample, ARABIC_CHARS) > 10) return { lang: "ar", confidence: "high" };
  if (countMatches(sample, CHINESE_CHARS) > 5) return { lang: "zh", confidence: "high" };
  if (countMatches(sample, JAPANESE_CHARS) > 5) return { lang: "ja", confidence: "high" };
  if (countMatches(sample, KOREAN_CHARS) > 5) return { lang: "ko", confidence: "high" };
  if (countMatches(sample, CYRILLIC_CHARS) > 10) return { lang: "ru", confidence: "high" };
  if (countMatches(sample, DEVANAGARI_CHARS) > 5) return { lang: "hi", confidence: "high" };
  if (countMatches(sample, THAI_CHARS) > 5) return { lang: "th", confidence: "high" };
  if (countMatches(sample, HEBREW_CHARS) > 5) return { lang: "he", confidence: "high" };
  if (countMatches(sample, GREEK_CHARS) > 5) return { lang: "el", confidence: "high" };

  // Turkish accent letters are very distinctive — flag early before franc
  // (which sometimes confuses short Turkish text with Azeri / Tatar).
  const trChars = countMatches(sample, TURKISH_CHARS);
  if (trChars >= 3) {
    return { lang: "tr", confidence: trChars >= 6 ? "high" : "medium" };
  }

  // ── Stage 2 — franc-min trigram statistics for Latin script ────────────
  // franc needs ≥10 chars; below that it returns "und".
  if (sample.trim().length >= 10) {
    const code = franc(sample, { minLength: 10 });
    if (code !== "und") {
      const iso1 = ISO_3_TO_1[code] ?? code;
      // franc has a small confidence margin we don't expose, so treat
      // any non-undetermined result as "medium" unless it agrees with a
      // hard-script signal above.
      return { lang: iso1, confidence: "medium" };
    }
  }

  return { lang: "en", confidence: "low" };
}

export function isEnglish(text: string): boolean {
  return detectLanguage(text).lang === "en";
}
