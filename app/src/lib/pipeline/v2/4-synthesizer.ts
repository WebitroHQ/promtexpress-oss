/**
 * Layer 4 — SYNTHESIZER (1 AI call, plain-text mode — Hybrid v5, 2026-05-04)
 *
 * Rol: SYNTHESIZER (admin atar)
 * Görev: Constitution + context → tek nihai prompt (PLAIN TEXT)
 *
 * 2026-05-04 (Hybrid v5 — eski sistem sadeliği + yeni bağlam zenginliği):
 *   - JSON discipline KALDIRILDI: response_format/outputSchema gönderilmez,
 *     extractJson/repairJson çağrılmaz, retry yok, wall-clock budget yok.
 *   - Çıktı düz metin: model ne dönerse trim edilir, "prompt" olarak kullanılır.
 *   - Boş/çok kısa çıktıda fallback engine chain devreye girer (admin
 *     atadığı yedek motor — engine-agnostic kuralı).
 *   - Multi-deliverable: model "---DELIVERABLE: <kind>, <aspect>---" satırıyla
 *     ayırır; KOD splitter ile prompts[] dizisine çevrilir.
 *   - Constitution + ExpertPersona + TargetEngine guidance + Few-shot
 *     exemplar'lar SYSTEM PROMPT'A INJECT (3-context-assembly + role-brief
 *     üzerinden — değişmedi).
 *
 * 2026-05-05 (Pass 1 — KS Suno reasoning leak fix):
 *   - looksLikeReasoningLeak() shape gate: META_LEAK_TOKENS (head'de "We are
 *     the Synthesizer", "operational doctrine", "<thinking>" vb.) +
 *     MODALITY_SHAPE_PATTERNS (music/image/video/audio/text/code için yapısal
 *     marker zorunluluğu) ile chain-of-thought sızıntısı ve şekilsiz çıktı
 *     yakalanır.
 *   - Yakalanırsa PipelineError fırlatılır → runWithEngineFallback bir sonraki
 *     motora geçer (admin'in tanımladığı fallback chain).
 *   - Music modality için [STYLE] zorunlu; vokal varsa [LYRICS] da zorunlu;
 *     instrumental ise lyrics opsiyonel.
 *
 * Direktif #1: Hangi motor → admin atar.
 * Direktif #6: Çıktı, kullanıcının prompt mühendisi olmadan profesyonel
 *              kalitede prompt almasıdır.
 */
import { resolveEngine } from "@/lib/engines/registry";
import {
  resolveLayerEngineSet,
  runWithEngineFallback,
  type ResolvedLayerEngine,
  type EngineAttemptLog,
} from "./modality-engine";
import { loadRoleBrief, composeSystemPromptWithExemplars } from "./role-brief";
import { getPipelineTimeouts } from "./timeouts";
import type { AssembledContext, SynthesisOutput, Modality, TargetEngineInfo } from "./types";
import { PipelineError } from "./types";

/** Bir prompt'un anlamlı sayılması için minimum karakter sayısı. */
const MIN_PROMPT_LEN = 50;

/** Çoklu çıktı separator: model "---DELIVERABLE: post, 1:1---" satırıyla ayırır. */
const DELIVERABLE_SEPARATOR_RE =
  /^[ \t]*---DELIVERABLE:\s*([^,\n]+?)(?:\s*,\s*([^-\n]+?))?\s*---[ \t]*$/gm;

/**
 * 2026-05-05 — Reasoning leak markers (KS Suno).
 * If the first ~300 chars of the model's plain-text output contain ANY of
 * these tokens, treat the response as a reasoning dump (not a prompt) and
 * trigger fallback chain. Modality-spesifik shape kontrolleri ayrı.
 */
const META_LEAK_TOKENS = [
  "role brief",
  "few-shot examples",
  "few-shot example",
  "operational doctrine",
  "Constitution block",
  "the Synthesizer",
  "the Intent Analyzer",
  "<thinking>",
  "<think>",
  "I think",
  "Let me",
  "Looking at",
  "Based on the",
  "Given the",
  "We are the",
  "We are asked",
  "We must",
  "We'll",
  "Hmm,",
  "Wait,",
  "Actually,",
];

/**
 * Modality-spesifik şekil kapıları.
 *
 * Tasarım kuralı: en az BİR yapısal sinyal yakalanmalı. Çok katı değil
 * (false-positive riskini düşürmek için OR-bazlı), ama tamamen şekilsiz /
 * sohbetli çıktılar yakalanır. Suno-tipi katı format → music için TÜM
 * koşullar zorunlu (AND).
 */
const MODALITY_SHAPE_PATTERNS: Partial<Record<Modality, { mustHave: RegExp[]; anyOf: RegExp[] }>> = {
  music: {
    mustHave: [/\[STYLE\]/i],
    anyOf: [], // music'te [LYRICS] zorunluluğu instrumental kontrolüyle ayrı işleniyor
  },
  image: {
    mustHave: [],
    // Image prompt'ları en az BİR yapısal yer-tutucu içerir: aspect ratio /
    // negative block / şekilsel slot başlığı / Midjourney/SDXL flag'i / quoted
    // text. Konuşma metni bunların hiçbirini taşımaz.
    anyOf: [
      /\baspect ratio\b/i,
      /--ar\s+\d/i,
      /\bNEGATIVE:/,
      /\bSUBJECT:/,
      /\bSTYLE\b\s*[:\-]/i,
      /\bLIGHTING:/i,
      /\bBACKGROUND:/i,
      /\bTECHNICAL:/i,
      /\bTYPOGRAPHY (?:RULES?)?:/i,
      /--v\s+\d/i,
      /--style\s+\w/i,
      /"[^"\n]{2,}"/, // quoted render-text or inline quoted token
    ],
  },
  video: {
    mustHave: [],
    anyOf: [
      /\bCAMERA\s*[:\-]/i,
      /\b(?:SHOT|DURATION|MOOD|LIGHTING|AUDIO)\s*[:\-]/i,
      /\b\d+\s*(?:seconds?|sec|fps)\b/i,
      /\baspect ratio\b/i,
      /\bSUBJECT\s*\+?\s*ACTION\b/i,
      /\b(?:dolly|pan|tilt|tracking|handheld|locked-off|anamorphic|cinematic establishing)\b/i,
    ],
  },
  audio: {
    mustHave: [],
    anyOf: [
      /\bVOICE_PROFILE\b/i,
      /\bVOICE\b\s*[:\-]/i,
      /\bSCRIPT\b\s*[:\-]/i,
      /\bPACING\b/i,
      /\bEMOTION_TAGS?\b/i,
      /\[(?:warm|serious|excited|whisper|happy|sad|calm|angry|neutral|contemplative|melancholic|hopeful|slow|fast|medium pacing)[,\s\]]/i,
      /\b\d+\s*kHz\b/i,
      /\bSSML\b/i,
    ],
  },
  text: {
    mustHave: [],
    anyOf: [
      /^\s*ROLE\s*[:\-]/im,
      /^\s*TASK\s*[:\-]/im,
      /^\s*CONTEXT\s*[:\-]/im,
      /^\s*FORMAT\s*[:\-]/im,
      /^\s*CONSTRAINTS?\s*[:\-]/im,
      /^\s*#\s+[A-Z]/m, // markdown section
      /^\s*Sen\s+(?:bir|kıdemli|deneyimli)\b/im, // Turkish role intro
      /^\s*You are\s+(?:a|an|the|the senior)\b/im,
    ],
  },
  code: {
    mustHave: [],
    anyOf: [
      /```/,
      /\bACCEPTANCE\b/i,
      /\bOUT OF SCOPE\b/i,
      /\bOUT_OF_SCOPE\b/i,
      /\bRefactor\b/i,
      /\bImplement\b/i,
      /@[A-Za-z][A-Za-z0-9/._-]+\.[a-z]+/, // @path/file.ts (Cursor)
      /^\s*##?\s+(?:Requirements?|Context|Task|Acceptance)\b/im,
      /^\s*TASK\s*[:\-]/im,
      /^\s*CONTEXT\s*[:\-]/im,
    ],
  },
};

export function looksLikeReasoningLeak(text: string, modality: Modality, target?: TargetEngineInfo | null): boolean {
  const head = text.slice(0, 300).toLowerCase();
  for (const tok of META_LEAK_TOKENS) {
    if (head.includes(tok.toLowerCase())) return true;
  }

  // Modality-spesifik şekil kapısı (mustHave AND anyOf).
  const shape = MODALITY_SHAPE_PATTERNS[modality];
  if (shape) {
    for (const re of shape.mustHave) {
      if (!re.test(text)) return true;
    }
    if (shape.anyOf.length > 0) {
      // 2026-05-12 (Garantili Teslimat v2) — natural-language escape generalized
      // from image-only to ALL modalities. Natural-language targets (Sora 2,
      // Veo 3 prose mode, GPT Image 2, ElevenLabs) don't emit structured
      // Midjourney/SDXL/SUNO-style markers. They're identified by:
      //   - no negative-prompt support, AND
      //   - either preferredFormat === "plain" / null, OR no structuredFieldSpec.
      // mustHave (e.g. music [STYLE], Suno's hard format) is still enforced
      // above this block.
      const isNaturalLanguageTarget =
        target != null &&
        !target.negativePromptSupport &&
        (target.preferredFormat === "plain" ||
          target.preferredFormat == null ||
          target.structuredFieldSpec == null);

      if (!isNaturalLanguageTarget) {
        const matched = shape.anyOf.some((re) => re.test(text));
        if (!matched) return true;
      }
    }
  }

  // Music özel: vocals/instrumental ayrımı.
  if (modality === "music") {
    const instrumental = /\binstrumental\s*,?\s*no\s+vocals\b|\binstrumental\b\s*$/im.test(
      text,
    );
    if (!instrumental && !/\[LYRICS\]/i.test(text)) return true;
  }

  return false;
}

export interface SynthesisInput {
  context: AssembledContext;
  modality: Modality;
  /** Optional pre-resolved engine. If omitted, the layer resolves its own. */
  resolved?: ResolvedLayerEngine;
}

/**
 * Modality-bazlı maxTokens. Image/audio output kısa (100-300 token);
 * thinking-mode model bütçesi azalınca latency düşer.
 */
function maxTokensForModality(m: Modality): number {
  switch (m) {
    // 2026-05-06 — modality bütçeleri yeniden kalibre (reasoning-aware
    // motorlar tüm bütçeyi thinking'e harcayıp content kesik üretebiliyor;
    // empirically observed in 2026-05-05 Suno/Semicenk incident).
    case "image": return 1024;  // Midjourney long-form params + NEGATIVE block
    case "audio": return 1024;  // VOICE_PROFILE + SCRIPT + EMOTION_TAGS
    case "music": return 1536;  // Suno [STYLE] + multi-stanza [LYRICS] ~3000-4500 chars
    case "video": return 1536;  // shot list + camera + lighting + audio (Runway/Veo)
    case "code":  return 2048;
    case "text":  return 1536;
    default:      return 1024;
  }
}

interface SplitDeliverable {
  kind: string;
  aspect?: string;
  prompt: string;
}

/**
 * Modelin düz metin çıktısını "---DELIVERABLE: kind, aspect---" ile bölünmüş
 * parçalara ayırır. Separator yoksa tek deliverable olarak döner.
 */
function splitDeliverables(rawText: string): SplitDeliverable[] {
  const text = rawText.trim();
  // Reset regex state (global flag has lastIndex)
  DELIVERABLE_SEPARATOR_RE.lastIndex = 0;
  const matches: Array<{ start: number; end: number; kind: string; aspect?: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = DELIVERABLE_SEPARATOR_RE.exec(text)) !== null) {
    matches.push({
      start: m.index,
      end: m.index + m[0].length,
      kind: m[1].trim(),
      aspect: m[2] ? m[2].trim() : undefined,
    });
  }

  if (matches.length === 0) {
    return [{ kind: "default", prompt: text }];
  }

  // Pattern: prompt1\n---DELIVERABLE: A---\nprompt2\n---DELIVERABLE: B---\n…
  // Each separator marks the END of the prompt that came BEFORE it; following
  // text belongs to the NEXT deliverable. Tail (after last separator) is the
  // last prompt.
  const out: SplitDeliverable[] = [];
  let cursor = 0;
  for (let i = 0; i < matches.length; i++) {
    const sep = matches[i];
    const promptText = text.slice(cursor, sep.start).trim();
    if (promptText.length >= MIN_PROMPT_LEN) {
      // The deliverable description for THIS chunk comes from the PREVIOUS
      // separator (if any); for the first chunk, it has no leading separator
      // so we tag it by the FOLLOWING separator's metadata.
      const meta = i === 0 ? sep : matches[i - 1];
      out.push({
        kind: meta.kind,
        aspect: meta.aspect,
        prompt: promptText,
      });
    }
    cursor = sep.end;
  }
  // Tail after last separator
  const tail = text.slice(cursor).trim();
  if (tail.length >= MIN_PROMPT_LEN) {
    const meta = matches[matches.length - 1];
    out.push({ kind: meta.kind, aspect: meta.aspect, prompt: tail });
  }

  if (out.length === 0) {
    // Separators present but nothing usable — fall back to whole text minus separators
    const cleaned = text.replace(DELIVERABLE_SEPARATOR_RE, "").trim();
    return [{ kind: "default", prompt: cleaned }];
  }
  return out;
}

/**
 * 2026-05-12 confabulation fix — Plan §5.
 *
 * Anti-fabrication guardrail. RoleBrief DB içeriği admin tarafından yazıldığı
 * için orada eksik olabilir; bu sabit blok HER SYNTHESIZER çağrısında system
 * prompt'a EK olarak enjekte edilir (idempotent). Admin RoleBrief'i silse bile
 * bu blok kod tarafında garanti edilir.
 */
const ANTI_FABRICATION_BLOCK = `
[ANTI-FABRICATION — MANDATORY]
Do NOT introduce concrete subject nouns (specific products, brands, named
people, places, scenes, materials, code identifiers, melody/lyric details,
theorem names, equations, slide content, diagram entities, colors-as-subject)
that the user did NOT write in INTENT or USER_ANSWERS.

If the intent is too vague to produce a concrete subject, produce a
parameterized/abstract description (use placeholder phrases like "the
user-specified subject", "the chosen topic") AND emit an ASSUMPTIONS: block
at the very end listing every guessed concrete decision, one per line.

Format for assumptions block (verbatim):
ASSUMPTIONS:
- assumption 1
- assumption 2

Violations are detected and rejected by the validator (subject-hallucination
check). Adding an assumption is always safer than inventing a concrete subject.
`;

/**
 * Plan §5 — Modaliteye göre temperature tablosu. Önceki davranış: tüm
 * modaliteler 0.4 (reasoning model dışında). Confabulation kanıtı image'da
 * (cmp2aq14u000bh0ermbawejs1) görüldüğü için image/code/video/math/slides/
 * diagram deterministik yöne çekildi; text/audio/music kısmi yaratıcılık
 * gerektirir.
 */
const TEMP_BY_MODALITY: Record<Modality, number> = {
  text: 0.3,
  code: 0.2,
  image: 0.2,
  video: 0.2,
  audio: 0.3,
  music: 0.3,
  math: 0.1,
  slides: 0.2,
  diagram: 0.2,
  "3d": 0.2,
  document: 0.3,
};

/**
 * Plan §5 — Output sonundaki "ASSUMPTIONS:" bloğunu ayır. Synthesizer plain-text
 * modunda assumption üretirse, bunlar prompt metnine sızmadan SynthesisOutput.
 * assumptions array'ine geçer. UI ayrı kart olarak gösterir.
 */
const ASSUMPTIONS_BLOCK_RE = /\n\s*ASSUMPTIONS\s*:\s*\n([\s\S]+?)\s*$/i;

function extractAssumptions(text: string): { promptText: string; assumptions: string[] } {
  const m = text.match(ASSUMPTIONS_BLOCK_RE);
  if (!m) return { promptText: text, assumptions: [] };
  const block = m[1];
  const assumptions = block
    .split(/\n/)
    .map((l) => l.replace(/^[\s\-*•]+/, "").trim())
    .filter((l) => l.length > 0);
  const promptText = text.slice(0, m.index).trimEnd();
  return { promptText, assumptions };
}

interface SynthOnceResult {
  text: string;
  qualityIssues: string[];
}

export async function runSynthesizer(
  input: SynthesisInput,
): Promise<{ output: SynthesisOutput; engine: ResolvedLayerEngine; attemptsLog: EngineAttemptLog[] }> {
  const { context, modality } = input;

  // RoleBrief + Constitution context — engine-bağımsız.
  const brief = await loadRoleBrief("SYNTHESIZER", 4);
  const briefSystemPrompt = composeSystemPromptWithExemplars(brief);
  // 2026-05-12 — Anti-fabrication block kod-tarafı garanti.
  const finalSystemPrompt = `${briefSystemPrompt}\n\n${ANTI_FABRICATION_BLOCK}\n\n${context.systemPrompt}`;

  /**
   * Tek motor çağrısı. Plain-text.
   *
   * 2026-05-12 (Garantili Teslimat v2): shape-gate ihlali artık throw etmez;
   * `qualityIssues` ile döner. Üst katman (`runWithEngineFallback`) acceptable
   * gate'ini kullanarak en az kötü adayı best-effort olarak seçer. SADECE
   * empty/too-short (gerçek üretim başarısızlığı) throw eder → zincir
   * bir sonraki motora geçer.
   */
  const synthOnce = async (
    engine: ResolvedLayerEngine,
    signal?: AbortSignal,
  ): Promise<SynthOnceResult> => {
    const { adapter, meta } = await resolveEngine(engine.engineId);

    // 2026-05-12 confabulation fix — Plan §5. Modaliteye göre temperature.
    let baseTemperature = context.hyperparams?.temperature ?? TEMP_BY_MODALITY[modality] ?? 0.3;
    const modalityCap = context.hyperparams?.maxTokens ?? maxTokensForModality(modality);
    let modalityWithReasoning = modalityCap;
    if (meta.supportsReasoning) {
      baseTemperature = Math.min(baseTemperature, 0.2);
      modalityWithReasoning = Math.ceil(modalityCap * 2.5);
    }
    const baseMaxTokens = meta.maxOutputTokens
      ? Math.min(modalityWithReasoning, meta.maxOutputTokens)
      : modalityWithReasoning;

    const upstream = await adapter.generate({
      systemPrompt: finalSystemPrompt,
      userMessage: context.userMessage,
      maxTokens: baseMaxTokens,
      temperature: baseTemperature,
      signal,
      // PLAIN TEXT — JSON yok
    });

    const text = (upstream.text ?? "").trim();
    if (text.length < MIN_PROMPT_LEN) {
      // Bölüm 0 — gerçek başarısızlık koşulu 1: motor zero/short text.
      throw new PipelineError(
        `Synthesizer empty/too-short on engine=${engine.engineId} (len=${text.length})`,
        4,
      );
    }
    const qualityIssues: string[] = [];
    if (looksLikeReasoningLeak(text, modality, context.target)) {
      // Shape gate fail → throw etme; quality issue olarak işaretle. Best-effort
      // kandidat olarak fallback chain'e iletilecek.
      qualityIssues.push(`shape-mismatch:${modality}`);
    }
    return { text, qualityIssues };
  };

  // Engine fallback chain: modality-mapping → role primary → role fallbacks
  let resolved: ResolvedLayerEngine;
  let rawText: string;
  let degraded = false;
  let qualityIssues: string[] = [];
  let attemptsLog: EngineAttemptLog[] = [];

  if (input.resolved) {
    // Single-engine path (caller pinned the engine). Best-effort fallback yok;
    // gate fail durumunda yine de quality issue'lar surface edilir.
    resolved = input.resolved;
    const single = await synthOnce(resolved);
    rawText = single.text;
    qualityIssues = single.qualityIssues;
    degraded = qualityIssues.length > 0;
    attemptsLog = [{ engineId: resolved.engineId, source: resolved.source, durationMs: 0 }];
  } else {
    const set = await resolveLayerEngineSet({
      modality,
      slot: "primary",
      roleSlug: "SYNTHESIZER",
      layer: 4,
    });

    // Per-engine ve total budget'i `getPipelineTimeouts` üzerinden türet.
    // Outer Promise.race (index.ts) zaten `synth` budget'i ile sınırlandırır;
    // burada da aynı budget'i kullanıp 2sn savunma payı çıkarırız.
    const timeouts = await getPipelineTimeouts();
    const chainLen = 1 + set.fallbacks.length;
    const safetyMarginMs = 2_000;
    const totalBudgetMs = Math.max(5_000, timeouts.synth - safetyMarginMs);
    const perEngineTimeoutMs = Math.max(5_000, Math.floor(totalBudgetMs / Math.max(chainLen, 1)));

    const out = await runWithEngineFallback(
      set,
      (engine, _i, signal) => synthOnce(engine, signal),
      {
        acceptable: (r) => r.qualityIssues.length === 0,
        bestEffort: (cands) => cands[0]?.result ?? null,
        perEngineTimeoutMs,
        totalBudgetMs,
      },
    );
    resolved = out.usedEngine;
    rawText = out.result.text;
    qualityIssues = out.result.qualityIssues;
    degraded = out.degraded;
    attemptsLog = out.attemptsLog;
  }

  // 2026-05-12 confabulation fix — Plan §5. ASSUMPTIONS: block parse.
  const { promptText, assumptions } = extractAssumptions(rawText);

  // Split multi-deliverable (separator-based) or single-deliverable
  const deliverables = splitDeliverables(promptText);

  const output: SynthesisOutput = {
    prompt: deliverables[0].prompt,
    prompts: deliverables.map((d) => ({
      deliverable: d.kind,
      aspect: d.aspect,
      prompt: d.prompt,
    })),
    assumptions: assumptions.map((text, i) => ({
      key: `assumption_${i + 1}`,
      value: text,
      label_tr: text,
    })),
    degraded,
    qualityIssues,
  };

  return { output, engine: resolved, attemptsLog };
}
