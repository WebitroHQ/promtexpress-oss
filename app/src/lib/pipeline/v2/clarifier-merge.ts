/**
 * FAZ 3 (2026-05-03) — Clarifier merge.
 *
 * Intent Analyzer'ın LLM'den dönen chip_questions'ına IntentClarifierRule
 * (DB'deki isRequired=true kuralları) backstop olarak merge eder.
 *
 * Mantık:
 *   - LLM kullanıcının intent'inde X dimension'ı (vocals/instrumental, doc_type, …)
 *     belirtilmiş gibi mi davrandı? Bunu doğrulamak için label/option fuzzy match.
 *   - Required olup user intent'inde geçmeyen kurallar chip_questions'a eklenir.
 *   - Toplam max 3 question (UI sınırı) — required kurallar öncelikli.
 *
 * Kontrat: LLM'in dönen chip_questions'larıyla çakışma olursa, LLM'in versiyonu kazanır
 * (label aynı ya da option seti %50+ overlap).
 */

import { db } from "@/db/client";
import type { Modality } from "./types";

interface ChipQuestion {
  label: string;
  options: string[];
}

/**
 * Eğer LLM zaten benzer soruyu sormuşsa true. Basit heuristic: label'ın anlamlı
 * keyword'ü (vocals, instrumental, document, length, audience, aspect, duration,
 * tone, voice, stack) chip label'ında veya options'larında geçiyor mu?
 */
function isAlreadyAsked(rule: { label: string; questionKey: string; options: unknown }, asked: ChipQuestion[]): boolean {
  const ruleKey = rule.questionKey.toLowerCase();
  const ruleLabel = rule.label.toLowerCase();
  const ruleOptions = Array.isArray(rule.options)
    ? (rule.options as Array<{ value?: unknown; label?: unknown }>)
        .map((o) => (typeof o?.label === "string" ? o.label.toLowerCase() : typeof o?.value === "string" ? o.value.toLowerCase() : ""))
        .filter(Boolean)
    : [];

  for (const q of asked) {
    const qLabel = q.label.toLowerCase();
    if (qLabel === ruleLabel) return true;

    // Question-key keyword match — "vocals_or_instrumental" → "vocal" or "instrumental"
    const keyTokens = ruleKey.split(/[_\s-]/).filter((t) => t.length > 3);
    if (keyTokens.some((t) => qLabel.includes(t))) return true;

    // Option overlap > 50%
    if (ruleOptions.length > 0 && q.options.length > 0) {
      const qOpts = q.options.map((o) => o.toLowerCase());
      const overlap = ruleOptions.filter((ro) => qOpts.some((qo) => qo.includes(ro) || ro.includes(qo))).length;
      if (overlap / ruleOptions.length >= 0.5) return true;
    }
  }
  return false;
}

/**
 * Intent metni already-mentions bu dimension'ı (heuristic substring scan).
 * Örn. user "instrumental jazz" yazdıysa vocals_or_instrumental sorulmaz.
 */
function isMentionedInIntent(rule: { questionKey: string; options: unknown }, intentText: string): boolean {
  const lower = intentText.toLowerCase();
  const opts = Array.isArray(rule.options)
    ? (rule.options as Array<{ value?: unknown }>).map((o) => (typeof o?.value === "string" ? o.value.toLowerCase().replace(/_/g, " ") : ""))
    : [];
  for (const opt of opts) {
    if (opt.length < 3) continue;
    // Compound option like "9:16" → check raw match too
    if (lower.includes(opt) || lower.includes(opt.replace(/\s+/g, ""))) return true;
  }
  // Question-key tokens
  const keyTokens = rule.questionKey.split(/[_\s-]/).filter((t) => t.length > 4);
  return keyTokens.some((t) => lower.includes(t));
}

export async function mergeRequiredClarifiers(
  modality: Modality,
  intentText: string,
  llmChipQuestions: ChipQuestion[],
): Promise<ChipQuestion[]> {
  const rules = await db.intentClarifierRule.findMany({
    where: { modality, isActive: true, isRequired: true },
    orderBy: { priority: "desc" },
    take: 10,
    select: { label: true, questionKey: true, options: true, priority: true },
  });

  const merged: ChipQuestion[] = [...llmChipQuestions];

  for (const rule of rules) {
    if (merged.length >= 3) break;
    if (isAlreadyAsked(rule, merged)) continue;
    if (isMentionedInIntent(rule, intentText)) continue;

    const opts = Array.isArray(rule.options)
      ? (rule.options as Array<{ value?: unknown; label?: unknown }>)
          .map((o) => (typeof o?.label === "string" ? o.label : typeof o?.value === "string" ? o.value : ""))
          .filter((s) => typeof s === "string" && s.length > 0)
      : [];

    if (opts.length < 2) continue;

    merged.push({ label: rule.label, options: opts });
  }

  return merged.slice(0, 3);
}
