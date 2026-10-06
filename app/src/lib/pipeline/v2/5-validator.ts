/**
 * Layer 5 — VALIDATOR (KOD + opt. AI for safety)
 *
 * Direktif #8: Mekanik kontroller %100 KOD. AI sadece risk skoru ≥ eşik ise.
 *
 * KOD kontrolleri:
 *   - Length cap (10-20000 char)
 *   - Banned words (env BANNED_WORDS)
 *   - Modality + target syntax (Midjourney --ar, JSON valid, etc.)
 *   - Anti-pattern regex (DB AntiPatternRule)
 *   - Jailbreak signature regex
 *
 * AI safety (rol SAFETY_CHECKER):
 *   - PII deeper scan (verinin ham metin gibi görünebileceği bağlamlar)
 *   - Brand-safety borderline cases
 */
import { db } from "@/db/client";
import { resolveEngine } from "@/lib/engines/registry";
import {
  resolveLayerEngineSet,
  runWithEngineFallback,
  type ResolvedLayerEngine,
  type EngineSource,
} from "./modality-engine";
import { loadRoleBrief, composeSystemPromptWithExemplars } from "./role-brief";
import { extractJson } from "./json-extract";
import { repairJson } from "./json-repair";
import type { ValidationResult, Modality, TargetEngineInfo, IntentAnalysis, SynthesisOutput } from "./types";

const BANNED_WORDS = (process.env.BANNED_WORDS ?? "")
  .split(",")
  .map((w) => w.trim().toLowerCase())
  .filter(Boolean);

export interface ValidatorInput {
  prompt: string;
  modality: Modality;
  target: TargetEngineInfo | null;
  domainSlug: string | null;
  /** Entity-aware kontroller için. Yoksa entity/glyph kontrolleri atlanır (geri uyumluluk). */
  intentAnalysis?: Pick<IntentAnalysis, "entities" | "deliverables" | "language_constraints">;
  /** Multi-deliverable count kontrolü için synthesizer çıktısı. */
  synthesis?: Pick<SynthesisOutput, "prompts">;
  /**
   * 2026-05-12 confabulation fix — Plan §6.a hallucination dedektörü.
   * Synthesizer'ın output'unu kullanıcının gerçek niyetiyle karşılaştırmak için
   * intent metni + kullanıcı cevapları geçilir. Yoksa hallucination check atlanır.
   */
  intentText?: string;
  userAnswers?: Array<{ question: string; answer: string }>;
  /** Plan §6.a — bazı deliverable tipleri (story/lyrics/poem/essay) muafiyet. */
  deliverableKind?: string;
}

/**
 * 2026-05-12 confabulation fix — Plan §6.a.
 * Modaliteye göre minimum noun-token overlap eşiği. Output'taki anlamlı
 * token'ların (3+ harf) intent+answers seed token set'iyle ne kadar
 * örtüştüğünü ölçer. Eşik altında: REJECT (synth retry tetikler).
 */
const HALLUCINATION_OVERLAP_MIN: Record<Modality, number> = {
  image: 0.15,
  video: 0.15,
  code: 0.10,
  audio: 0.10,
  music: 0.05,
  text: 0.05,
  math: 0.20,
  slides: 0.10,
  diagram: 0.15,
  "3d": 0.15,
  document: 0.05,
};

/** Plan §6.a — bu deliverable tipleri yaratıcı; subject overlap zorunlu değil. */
const HALLUCINATION_EXEMPT_DELIVERABLES = new Set([
  "story",
  "poem",
  "lyrics",
  "essay",
  "blog",
  "fiction",
  "song",
]);

// Genişletilmiş çok-dilli stop-word seti (TR + EN). Hallucination overlap için
// "için", "ile", "the", "and" gibi taşıyıcı kelimeler elenir.
const STOPWORDS_TR_EN = new Set([
  // Turkish
  "için", "ile", "bir", "bu", "şu", "o", "ve", "de", "da", "ki", "ama", "fakat",
  "ne", "nasıl", "neden", "ya", "yani", "değil", "gibi", "kadar", "daha", "çok",
  "az", "biz", "siz", "ben", "sen", "onlar", "bize", "size", "bana", "sana",
  "yap", "yapma", "olan", "olmak", "olur", "var", "yok",
  // English
  "the", "a", "an", "and", "or", "but", "of", "for", "to", "in", "on", "at",
  "by", "with", "is", "are", "was", "were", "be", "been", "being", "this",
  "that", "these", "those", "it", "its", "i", "you", "we", "they", "he", "she",
  "as", "if", "then", "so", "than", "such",
]);

function tokenize(text: string): Set<string> {
  const out = new Set<string>();
  // Unicode-aware kelime ayırıcı; en az 3 harf; lowercase.
  const re = /\p{L}{3,}/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const t = m[0].toLowerCase();
    if (!STOPWORDS_TR_EN.has(t)) out.add(t);
  }
  return out;
}

/**
 * Plan §6.a — Subject hallucination detector. Output token set ∩ seed token set
 * (intent + answers + entity values) oranı eşiğin altındaysa hallucination.
 */
export function detectSubjectHallucination(args: {
  output: string;
  intentText: string;
  userAnswers?: Array<{ question: string; answer: string }>;
  entities?: IntentAnalysis["entities"];
  modality: Modality;
  deliverableKind?: string;
}): { isHallucinated: boolean; overlapRatio: number; threshold: number; overlapTokens: string[]; outputTokenCount: number } {
  const threshold = HALLUCINATION_OVERLAP_MIN[args.modality] ?? 0.10;

  // Muafiyet: deliverable yaratıcı tipindeyse hallucination check atlanır.
  if (args.deliverableKind && HALLUCINATION_EXEMPT_DELIVERABLES.has(args.deliverableKind.toLowerCase())) {
    return { isHallucinated: false, overlapRatio: 1, threshold, overlapTokens: [], outputTokenCount: 0 };
  }

  const seedParts: string[] = [args.intentText];
  for (const a of args.userAnswers ?? []) {
    seedParts.push(a.answer);
  }
  if (args.entities) {
    for (const v of Object.values(args.entities)) {
      if (typeof v === "string") seedParts.push(v);
      else if (v && typeof v === "object" && "value" in v && typeof (v as { value: unknown }).value === "string") {
        seedParts.push((v as { value: string }).value);
      } else if (v && typeof v === "object") {
        // render_text gibi nested obj — değerleri topla
        for (const inner of Object.values(v)) {
          if (typeof inner === "string") seedParts.push(inner);
        }
      }
    }
  }
  const seedTokens = tokenize(seedParts.join(" "));
  const outTokens = tokenize(args.output);
  if (outTokens.size === 0) {
    return { isHallucinated: false, overlapRatio: 1, threshold, overlapTokens: [], outputTokenCount: 0 };
  }
  const overlap: string[] = [];
  for (const t of outTokens) {
    if (seedTokens.has(t)) overlap.push(t);
  }
  const ratio = overlap.length / outTokens.size;
  return {
    isHallucinated: ratio < threshold && seedTokens.size > 0,
    overlapRatio: ratio,
    threshold,
    overlapTokens: overlap,
    outputTokenCount: outTokens.size,
  };
}

export async function runValidator(input: ValidatorInput): Promise<{ result: ValidationResult; engine: ResolvedLayerEngine | null }> {
  const issues: string[] = [];
  let decision: ValidationResult["decision"] = "PASS";
  let redactedPrompt: string | null = null;
  let aiSafetyError: string | undefined;
  let safetyEngine: ResolvedLayerEngine | null = null;

  // 1. Length — synthesizer guard (4-synthesizer.ts MIN_PROMPT_LEN=50) ile uyumlu defense-in-depth
  const trimmed = input.prompt.trim();
  if (trimmed.length < 50) {
    issues.push(`Output is too short (<50 chars). Length: ${trimmed.length}.`);
    decision = "BLOCK";
  } else if (trimmed.length > 20000) {
    issues.push("Output exceeds 20k characters.");
    decision = "WARN";
  }

  // 2. Banned words
  if (BANNED_WORDS.length > 0) {
    const lower = trimmed.toLowerCase();
    const hit = BANNED_WORDS.find((w) => w && lower.includes(w));
    if (hit) {
      issues.push(`Contains banned token (${hit.length} chars).`);
      if (decision !== "BLOCK") decision = "WARN";
    }
  }

  // 3. Reasoning-leak signature — defense-in-depth (modality-bağımsız).
  //
  // Adapter (deepseek.ts) reasoning_content sızıntısını tıkadı; format.ts
  // tek-satır preamble'ları temizliyor. Bu kontrol, model çıktısının TÜMÜNÜN
  // chain-of-thought olduğu (kullanıcının paylaştığı 2026-05-05 Suno/Semicenk
  // incidence'i gibi) durumu yakalar. Pattern'ler bilinen sızıntı kalıplarına
  // göre dar tutulmuştur — meşru bir prompt asla sistem promptundan birebir
  // alıntı yapıp "the role brief says…" demez.
  //
  // BLOCK kararı, üst katman (modality-engine.ts engine-fallback chain) için
  // sinyal: bir sonraki engine ile retry. Kullanıcı kredisi yanmaz; bozuk
  // çıktı kullanıcıya servis edilmez.
  const REASONING_LEAK_PATTERNS: RegExp[] = [
    /^we are the (synthesizer|intent[- ]analyzer|safety[- ]checker|distiller|embedder)\b/i,
    /\bthe (operational doctrine|role brief|few-shot examples?) (says|says that|states)\b/i,
    /\b(let me|let's) (re-?read|re-?examine|reconsider) (the|this)\b/i,
    /\bthat (seems|would be) contradictory\b/i,
    /\bcontradict(ion|ory)\b[\s\S]{0,80}\b(brief|examples?|spec|prompt)\b/i,
    /\bthe user (wrote|said|asked) in \*?(tr|en|de|fr|es|ja|zh|tu|it|pt|ru|ar)\*?\b/i,
    /\b(?:hmm,?|wait,|actually,)\s+(let me|the model|i should|i think|maybe)/i,
    /\bI'?ll (?:output|emit|just) (?:the|a) (?:JSON|prompt)\b[\s\S]{0,40}\b(?:as the role brief|since the brief|but the (?:role|brief|examples))\b/i,
  ];
  const leakHit = REASONING_LEAK_PATTERNS.find((rx) => rx.test(trimmed));
  if (leakHit) {
    issues.push(
      `Output appears to contain model chain-of-thought (matched: ${leakHit.source.slice(0, 60)}…). ` +
        `Synthesizer must emit deliverable, not reasoning.`,
    );
    decision = "BLOCK";
  }

  // 4. Modality-specific checks
  if (input.modality === "image") {
    // 4a. Aspect-ratio: tüm image hedeflerinde — Midjourney --ar veya genel "aspect ratio X:Y" / "X:Y"
    const hasAspect = /--ar\s+\d+:\d+/i.test(trimmed) || /aspect\s*ratio[:\s]*\d+:\d+/i.test(trimmed) || /\b\d+:\d+\b/.test(trimmed);
    if (!hasAspect) {
      issues.push("Image prompt missing aspect-ratio (e.g. '1:1', '--ar 16:9', or 'aspect ratio 9:16').");
      if (decision === "PASS") decision = "WARN";
    }

    // 4b. NEGATIVE bloğu — açık negative ifadesi var mı?
    const hasNegative = /negative[:\s]/i.test(trimmed) || /\bno\s+(?:people|watermark|text|extra|stock-photo|lorem|garbled|misspell)/i.test(trimmed) || /--no\s+/i.test(trimmed);
    if (!hasNegative) {
      issues.push("Image prompt missing NEGATIVE block (no people/watermark/lorem/etc.).");
      if (decision === "PASS") decision = "WARN";
    }

    // 4c. Midjourney-spesifik: --ar zorunlu (sadece "1:1" yetmez, flag formatı tercih edilir)
    if (input.target?.slug?.toLowerCase().includes("midjourney") && !/--ar\s+\d+:\d+/i.test(trimmed)) {
      issues.push("Midjourney prompt should use --ar flag explicitly (--ar X:Y).");
      if (decision === "PASS") decision = "WARN";
    }
  }

  // 4d. Entity preservation — intent'teki yapısal alanlar output'ta yer alıyor mu?
  if (input.intentAnalysis) {
    const ent = input.intentAnalysis.entities;
    const lower = trimmed.toLowerCase();
    const checkPresence = (label: string, value: string | undefined): void => {
      if (!value) return;
      const v = value.trim();
      if (v.length === 0) return;
      // Değer 50 karakterden uzunsa ilk 30 karakteri ile substring araması yap (kısmi koruma)
      const needle = (v.length > 50 ? v.slice(0, 30) : v).toLowerCase();
      if (!lower.includes(needle)) {
        issues.push(`Entity '${label}' (value: "${v.slice(0, 60)}${v.length > 60 ? "…" : ""}") not present in output.`);
        if (decision === "PASS") decision = "WARN";
      }
    };
    checkPresence("brand", ent.brand);
    checkPresence("product_or_service", ent.product_or_service);
    checkPresence("occasion", ent.occasion);
    if (ent.offer) checkPresence("offer.value", ent.offer.value);
    if (ent.render_text?.primary) {
      // render_text primary mutlaka tırnak içinde geçmeli (image/video için)
      const v = ent.render_text.primary;
      const inOutput = lower.includes(v.toLowerCase());
      const quoted = new RegExp(`["“][^"”]*${v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"”]*["”]`, "i").test(trimmed);
      if (!inOutput) {
        issues.push(`render_text.primary "${v}" not present in output.`);
        if (decision === "PASS") decision = "WARN";
      } else if ((input.modality === "image" || input.modality === "video") && !quoted) {
        issues.push(`render_text.primary "${v}" should be quoted in image/video prompt.`);
        if (decision === "PASS") decision = "WARN";
      }
    }
    checkPresence("render_text.secondary", ent.render_text?.secondary);
    checkPresence("render_text.cta", ent.render_text?.cta);

    // 4e. Glyph guard — language_constraints.glyphs varsa output'ta
    // "preserve characters" / "diacritics" / "no garbled glyphs" benzeri ifade var mı?
    // 2026-05-12 confabulation fix — Plan §6.b. Regex listesi genişletildi;
    // önceden /preserve\s+characters/i "preserve the characters" cümlesini
    // eşleştiremiyordu (false-positive WARN kaynağı).
    if (input.intentAnalysis.language_constraints.glyphs && input.intentAnalysis.language_constraints.glyphs.length > 0) {
      const hasGlyphGuard =
        /preserve\s+(the\s+)?characters?/i.test(trimmed) ||
        /preserve\s+(turkish|german|french|spanish|polish|czech|hungarian)\s+(diacritic|character|letter)/i.test(trimmed) ||
        /diacritic/i.test(trimmed) ||
        /no\s+(garbled?|substitut\w*|mangle\w*|corrupt\w*|misspell\w*)/i.test(trimmed) ||
        /without\s+(any\s+)?(substitution|garble|misspelling)/i.test(trimmed) ||
        /typography\s+rules/i.test(trimmed);
      if (!hasGlyphGuard && (input.modality === "image" || input.modality === "video")) {
        issues.push("language_constraints.glyphs set but output has no glyph-preservation instruction (preserve characters / diacritics / no garbled glyphs).");
        if (decision === "PASS") decision = "WARN";
      }
    }
  }

  // 2026-05-12 confabulation fix — Plan §6.a. Subject hallucination detector.
  // Output token set ∩ (intent + answers + entity values) oranı eşik altındaysa REJECT.
  // REJECT decision üst katmana sinyal: engine fallback retry.
  if (input.intentText && input.intentText.trim().length > 0) {
    const hallu = detectSubjectHallucination({
      output: trimmed,
      intentText: input.intentText,
      userAnswers: input.userAnswers,
      entities: input.intentAnalysis?.entities,
      modality: input.modality,
      deliverableKind: input.deliverableKind,
    });
    if (hallu.isHallucinated) {
      issues.push(
        `Subject hallucination detected: output token overlap with intent/answers is ${(hallu.overlapRatio * 100).toFixed(1)}% < threshold ${(hallu.threshold * 100).toFixed(0)}%. ` +
          `Output uses tokens not present in user intent — synthesizer fabricated subject matter. ` +
          `Use ANTI-FABRICATION + ASSUMPTIONS: block instead.`,
      );
      decision = "REJECT";
    }
  }

  // 2026-05-12 confabulation fix — Plan §6.c. Modality-specific output şekil
  // kontrolü. 7 modalitenin (text, code, audio, music, math, slides, diagram)
  // önceden modality-specific check'i yoktu → confabulation tespit boşluğu.
  {
    const m = input.modality;
    if (m === "music") {
      const hasStyle = /\[STYLE\]/i.test(trimmed);
      const hasLyrics = /\[LYRICS\]/i.test(trimmed);
      const isInstrumental = /\binstrumental\b/i.test(trimmed);
      if (!hasStyle && !hasLyrics && !isInstrumental) {
        issues.push("Music prompt missing [STYLE]/[LYRICS] block or 'instrumental' marker.");
        if (decision === "PASS") decision = "WARN";
      }
    } else if (m === "audio") {
      const hasVoice = /\b(voice|tone|speaker|narration|tts|accent|ssml|emotion)\b/i.test(trimmed);
      if (!hasVoice) {
        issues.push("Audio prompt missing voice/tone/speaker hint.");
        if (decision === "PASS") decision = "WARN";
      }
    } else if (m === "code") {
      const hasCodeMarker =
        /```/.test(input.prompt) ||
        /\b(function|class|import|const|let|def|return|=>)\b/.test(trimmed);
      if (!hasCodeMarker) {
        issues.push("Code prompt missing code fence or keyword markers.");
        if (decision === "PASS") decision = "WARN";
      }
    } else if (m === "video") {
      const hasShot = /\b(scene|shot|camera|frame|fps|pan|tilt|zoom|second[s]?)\b/i.test(trimmed);
      if (!hasShot) {
        issues.push("Video prompt missing scene/shot/camera hint.");
        if (decision === "PASS") decision = "WARN";
      }
    } else if (m === "math") {
      const hasMath = /\\\(|\\\[|\$\$|\\begin\{|\b(equation|theorem|integral|derivative|matrix)\b/i.test(trimmed);
      if (!hasMath) {
        issues.push("Math prompt missing LaTeX delimiter or math keyword.");
        if (decision === "PASS") decision = "WARN";
      }
    } else if (m === "slides") {
      const hasSlide = /\bslide\s*\d+|\bdeck\b|\bpresentation\b|^\s*[-*]\s.+$/im.test(trimmed);
      if (!hasSlide) {
        issues.push("Slides prompt missing slide structure or bullet outline.");
        if (decision === "PASS") decision = "WARN";
      }
    } else if (m === "diagram") {
      const hasDiagram = /\b(mermaid|graphviz|flowchart|sequence\s*diagram|class\s*diagram|plantuml|digraph)\b/i.test(trimmed);
      if (!hasDiagram) {
        issues.push("Diagram prompt missing mermaid/graphviz/plantuml marker.");
        if (decision === "PASS") decision = "WARN";
      }
    }
    // m === "text": özel şekil kontrolü yok (sadece hallucination + leak).
  }

  // 4g. Target authoring criteria checks (FAZ 2, 2026-05-03)
  if (input.target) {
    const tgt = input.target;
    // 4g.1 charLimit
    if (tgt.charLimit && tgt.charLimit > 0 && trimmed.length > tgt.charLimit) {
      issues.push(
        `Target '${tgt.name}' charLimit exceeded: output ${trimmed.length} > ${tgt.charLimit}.`,
      );
      if (decision === "PASS") decision = "WARN";
    }
    // 4g.2 requiresEnglish
    if (tgt.requiresEnglish) {
      const nonAsciiRatio =
        (trimmed.match(/[^\x00-\x7F]/g) ?? []).length / Math.max(1, trimmed.length);
      if (nonAsciiRatio > 0.05) {
        issues.push(
          `Target '${tgt.name}' requires English output but ${(nonAsciiRatio * 100).toFixed(1)}% non-ASCII detected.`,
        );
        if (decision === "PASS") decision = "WARN";
      }
    }
    // 2026-05-05 Pass 2 — REMOVED:
    //   - 4g.3 preferredFormat="json" check (B13: dead code; no target uses "json")
    //   - 4g.4 structuredFieldSpec substring check (B10: produced false WARNs for
    //     Suno's "vocals" field since Synthesizer plain-text never literally
    //     emits the word "vocals"; Layer 4 looksLikeReasoningLeak shape gate
    //     already enforces correct modality structure).
  }

  // 4h. Math/LaTeX detection (FAZ 3.5.7, 2026-05-03)
  // For 'math' modality the output should contain LaTeX or formal notation.
  if (input.modality === ("math" as Modality)) {
    const hasLatex =
      /\\(?:begin|frac|sum|int|sqrt|alpha|beta|theta|partial|infty|prod|lim|forall|exists)/i.test(trimmed) ||
      /\$.+?\$/.test(trimmed) ||
      /\\\[[^\]]+\\\]/.test(trimmed) ||
      /\\\(.+?\\\)/.test(trimmed);
    if (!hasLatex) {
      issues.push("Math modality output missing LaTeX/formal notation (use $…$, \\frac, \\sum, etc.).");
      if (decision === "PASS") decision = "WARN";
    }
  }

  // 4f. Multi-deliverable count kontrolü — deliverables N ise prompts.length de N olmalı
  if (input.intentAnalysis && input.synthesis) {
    const expected = input.intentAnalysis.deliverables.length;
    const actual = input.synthesis.prompts.length;
    if (expected > 1 && actual !== expected) {
      issues.push(`Multi-deliverable mismatch: expected ${expected} prompts, got ${actual}.`);
      if (decision === "PASS") decision = "WARN";
    }
  }

  // 5. AntiPatternRule (DB)
  if (input.domainSlug) {
    const rules = await db.antiPatternRule.findMany({
      where: {
        isActive: true,
        OR: [{ domainSlug: input.domainSlug }, { domainSlug: null }],
      },
      select: { pattern: true, isRegex: true, severity: true, rationale: true },
      take: 50,
    });
    for (const r of rules) {
      try {
        const matched = r.isRegex ? new RegExp(r.pattern, "i").test(trimmed) : trimmed.toLowerCase().includes(r.pattern.toLowerCase());
        if (matched) {
          issues.push(`Anti-pattern: ${r.rationale}`);
          if (r.severity === "block") decision = "BLOCK";
          else if (decision === "PASS") decision = "WARN";
        }
      } catch {
        // bad regex — skip
      }
    }
  }

  // 6. AI safety — Hybrid v5 (2026-05-04): admin opt-in.
  // AppSetting `validator.ai_safety_enabled` 'true' değilse AI çağrısı atlanır
  // (KOD-level PII regex + length yeterli). Default davranış: kapalı (eski sistem
  // sadeliği). Admin /pr/yonet/system-settings'tan açabilir.
  let aiSafetyOn = false;
  try {
    const setting = await db.appSetting.findUnique({
      where: { key: "validator.ai_safety_enabled" },
      select: { value: true },
    });
    aiSafetyOn = setting?.value === "true";
  } catch {
    // DB or test mock missing — default off (KOD-level checks remain)
  }
  const hasPii = /@\w+\.\w+/.test(trimmed) || /\b\d{10,}\b/.test(trimmed);
  if (aiSafetyOn && hasPii) {
    try {
      const safety = await runAiSafety(trimmed, input.modality, input.target?.slug ?? null);
      const aiResult = safety?.result ?? null;
      safetyEngine = safety?.engine ?? null;
      if (aiResult) {
        // SAFETY_CHECKER yalnızca PII redact önerebilir; BLOCK yetkisi yok artık.
        if (aiResult.decision === "WARN" && decision === "PASS") decision = "WARN";
        for (const i of aiResult.issues) issues.push(`[AI] ${i.type}: ${i.evidence}`);
        if (aiResult.redactedPrompt && !redactedPrompt) redactedPrompt = aiResult.redactedPrompt;
      }
    } catch (err) {
      // AI safety failure shouldn't block the user, but admin must see it.
      aiSafetyError = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.error("[validator.aiSafety] failed", {
        modality: input.modality,
        target: input.target?.slug ?? null,
        error: aiSafetyError,
      });
    }
  }

  // FAZ 3.5.6 (2026-05-03) — granular quality score 0..100.
  // BLOCK → 0; PASS → 100 minus 3 per WARN issue (floored at 70 unless decision worse);
  // WARN base → 80, minus 5 per additional WARN issue, clamped 50..95.
  // Charts: 0 issues PASS = 100; 2 issues WARN = 70; 5 issues WARN = 55; BLOCK = 0.
  let qualityScore: number;
  if (decision === "BLOCK") {
    qualityScore = 0;
  } else if (decision === "WARN") {
    qualityScore = Math.max(50, Math.min(95, 80 - (issues.length - 1) * 5));
  } else {
    qualityScore = Math.max(70, 100 - issues.length * 3);
  }

  const result: ValidationResult = {
    score: qualityScore,
    issues,
    decision,
    redactedPrompt,
    ...(aiSafetyError ? { aiSafetyError } : {}),
  };
  return { result, engine: safetyEngine };
}

async function runAiSafety(
  prompt: string,
  modality: Modality,
  targetSlug: string | null,
): Promise<{
  result: {
    decision: "PASS" | "WARN" | "BLOCK";
    issues: { type: string; severity: string; evidence: string }[];
    redactedPrompt: string | null;
  } | null;
  engine: ResolvedLayerEngine;
}> {
  const brief = await loadRoleBrief("SAFETY_CHECKER", 5);
  const systemPrompt = composeSystemPromptWithExemplars(brief);
  const userMessage = JSON.stringify({ prompt_draft: prompt, modality, target: targetSlug });

  type SafetyParsed = {
    decision?: string;
    issues?: { type: string; severity: string; evidence: string }[];
    redacted_prompt?: string | null;
  };

  // FAZ C2 — engine fallback chain for safety checker.
  // Errors propagate so caller (runValidator) can surface them in trace.
  const set = await resolveLayerEngineSet({
    modality,
    slot: "validator",
    roleSlug: "SAFETY_CHECKER",
    layer: 5,
  });
  const out = await runWithEngineFallback(set, async (engine) => {
    const { adapter, meta } = await resolveEngine(engine.engineId);
    const upstream = await adapter.generate({
      systemPrompt,
      userMessage,
      maxTokens: 512,
      temperature: 0,
      responseFormat: "json",
    });
    let parsed = extractJson<SafetyParsed>(upstream.text);
    if (!parsed) {
      parsed = await repairJson<SafetyParsed>({
        adapter,
        modelId: meta.modelId,
        schema: (brief.outputSchema ?? undefined) as Record<string, unknown> | undefined,
        originalSystemPrompt: systemPrompt,
        originalUserMessage: userMessage,
        failedOutput: upstream.text,
        layer: 5,
        maxTokens: 512,
      });
    }
    return parsed;
  });

  const parsed = out.result;
  if (!parsed) return { result: null, engine: out.usedEngine };

  return {
    result: {
      decision: parsed.decision === "BLOCK" || parsed.decision === "WARN" ? parsed.decision : "PASS",
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      redactedPrompt: typeof parsed.redacted_prompt === "string" ? parsed.redacted_prompt : null,
    },
    engine: out.usedEngine,
  };
}
