/**
 * Layer 3 — CONTEXT ASSEMBLY (KOD only, no AI call)
 *
 * Direktif #8: Bu katman %100 kod. RAG embedding çağrısı EMBEDDER rolü
 * üzerinden — model hardcode değil.
 *
 * DB'den paketler:
 *   - Constitution.active
 *   - ProviderProfile[synthesizer'ın motoru]
 *   - TargetEngine.promptStyleHint (mevcut) + syntaxSpec (gelecek)
 *   - ExpertPersona[domain]
 *   - PromptExemplar pgvector top-3 (GOLD/VERIFIED)
 *   - AntiPatternRule[domain] + global
 */
import { db } from "@/db/client";
import { retrieveExemplars } from "./rag";
import { resolveRoleEngine } from "./role-engine";
import { renderPersonaSection } from "@/lib/personas/render";
import type {
  AssembledContext,
  Answer,
  EngineCapabilities,
  IntentAnalysis,
  Modality,
  TargetEngineInfo,
} from "./types";
import { PipelineError } from "./types";

interface SynthEngineRow {
  provider: string;
  modelId: string;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  preferredFormat: string | null;
  promptGuidelines: string | null;
  supportsVision: boolean;
  supportsReasoning: boolean;
}

/**
 * Yaklaşık token sayımı — 1 token ≈ 3.5 karakter (multilingual ortalama).
 * BPE tokenizer'lara göre kabaca; context window budget kontrolü için yeterli.
 */
function approxTokens(s: string): number {
  return Math.ceil(s.length / 3.5);
}

// F5 — In-memory cache for static context pieces (Constitution + ProviderProfile + AntiPattern + Persona).
// Admin değişiklik yaparsa invalidateContextCache() çağrılır (ileride admin save action'larından).
type Cached<T> = { value: T; exp: number };
const CTX_CACHE = {
  constitution: null as Cached<{ version: string; content: string } | null> | null,
  provider: new Map<string, Cached<{ styleHint: string; hyperparams: unknown } | null>>(),
  persona: new Map<string, Cached<{ name: string; body: string; jargon: string[]; frameworks: string[]; antiPatterns: string[] } | null>>(),
  antipatterns: new Map<string, Cached<{ pattern: string; severity: string; rationale: string }[]>>(),
  synthEngine: null as Cached<SynthEngineRow | null> | null,
};
const TTL = 5 * 60 * 1000; // 5 dakika
const now = () => Date.now();

/**
 * Decide the language of the GENERATED PROMPT (not the user's intent).
 * CLAUDE.md §0: English is the default; the output is consumed by the target
 * AI, not the user. Only deviates when the target explicitly demands a
 * non-EN language, or when the user explicitly asked to keep the intent
 * language (`language_constraints.keep_intent_language === true`).
 *
 * 2026-05-05 — Music modality: descriptors and lyrics may live in DIFFERENT
 * languages. Style/tags are interpreted by the model and benefit from EN;
 * lyrics carry cultural meaning and should match the user's cultural intent
 * (e.g. Turkish artist style → Turkish lyrics + English descriptors). The
 * caller passes `modality`; for music we return a separate `lyricsLang`.
 */
export function decideOutputLanguage(args: {
  intentAnalysis: Pick<IntentAnalysis, "language" | "language_constraints">;
  target: Pick<TargetEngineInfo, "name" | "preferredLanguage"> | null;
  modality?: Modality;
}): {
  outputLang: string;
  outputLangReason: string;
  intentLang: string;
  lyricsLang: string | null;
  lyricsLangReason: string | null;
} {
  const intentLang = args.intentAnalysis.language || "en";
  const targetLang = args.target?.preferredLanguage ?? null;
  const userExplicitKeepIntent =
    args.intentAnalysis.language_constraints.keep_intent_language === true;
  const userLyricsOverride =
    typeof (args.intentAnalysis.language_constraints as Record<string, unknown>)
      .lyrics_language === "string"
      ? ((args.intentAnalysis.language_constraints as Record<string, unknown>)
          .lyrics_language as string)
      : null;

  // Music: descriptors language + lyrics language ayrı kararlanır.
  const isMusic = args.modality === "music";
  let lyricsLang: string | null = null;
  let lyricsLangReason: string | null = null;
  if (isMusic) {
    if (userLyricsOverride) {
      lyricsLang = userLyricsOverride;
      lyricsLangReason = `user override via language_constraints.lyrics_language`;
    } else {
      // Default: lyrics follow user's intent language (cultural fidelity).
      lyricsLang = intentLang;
      lyricsLangReason = `lyrics follow user's intent language (${intentLang}) for cultural fidelity; descriptors stay in the descriptors language for model fidelity`;
    }
  }

  if (userExplicitKeepIntent) {
    return {
      outputLang: intentLang,
      outputLangReason: `user explicitly requested output in their intent language (${intentLang})`,
      intentLang,
      lyricsLang,
      lyricsLangReason,
    };
  }
  if (targetLang && targetLang !== "multilingual") {
    return {
      outputLang: targetLang,
      outputLangReason: `target tool ${args.target!.name} performs best in ${targetLang}`,
      intentLang,
      lyricsLang,
      lyricsLangReason,
    };
  }
  return {
    outputLang: "en",
    outputLangReason: args.target
      ? `target tool ${args.target.name} is ${targetLang ?? "unspecified"}; English is the default for best LLM performance`
      : `no target tool selected; English is the default for best LLM performance`,
    intentLang,
    lyricsLang,
    lyricsLangReason,
  };
}

export function invalidateContextCache(): void {
  CTX_CACHE.constitution = null;
  CTX_CACHE.provider.clear();
  CTX_CACHE.persona.clear();
  CTX_CACHE.antipatterns.clear();
  CTX_CACHE.synthEngine = null;
}

export async function assembleContext(args: {
  intentText: string;
  intentAnalysis: IntentAnalysis;
  modality: Modality;
  target: TargetEngineInfo | null;
  answers: Answer[];
  iteration: { ofPromptId: string; feedback: string } | null;
}): Promise<AssembledContext> {
  const { intentText, intentAnalysis, modality, target, answers, iteration } = args;

  // Synthesizer engine (provider + capabilities) — F5 cache (5 dk)
  const N = now();
  let synthEngineRow: SynthEngineRow | null = null;
  if (CTX_CACHE.synthEngine && CTX_CACHE.synthEngine.exp > N) {
    synthEngineRow = CTX_CACHE.synthEngine.value;
  } else {
    try {
      const { engineId } = await resolveRoleEngine("SYNTHESIZER", 3);
      synthEngineRow = await db.aiEngine.findUnique({
        where: { id: engineId },
        select: {
          provider: true,
          modelId: true,
          contextWindow: true,
          maxOutputTokens: true,
          preferredFormat: true,
          promptGuidelines: true,
          supportsVision: true,
          supportsReasoning: true,
        },
      });
      CTX_CACHE.synthEngine = { value: synthEngineRow, exp: N + TTL };
    } catch (err) {
      throw new PipelineError(
        "Synthesizer role not assigned. Admin must configure /pr/yonet/agent-roles.",
        3,
        { cause: err },
      );
    }
  }
  const synthProvider = synthEngineRow?.provider ?? null;

  // Constitution — F5 cache
  const constitution = await (async () => {
    if (CTX_CACHE.constitution && CTX_CACHE.constitution.exp > N) return CTX_CACHE.constitution.value;
    const c = await db.constitution.findFirst({
      where: { isActive: true },
      orderBy: { activatedAt: "desc" },
      select: { version: true, content: true },
    });
    CTX_CACHE.constitution = { value: c, exp: N + TTL };
    return c;
  })();

  // ProviderProfile — F5 cache
  const providerProfile = await (async () => {
    if (!synthProvider) return null;
    const hit = CTX_CACHE.provider.get(synthProvider);
    if (hit && hit.exp > N) return hit.value;
    const p = await db.providerProfile.findUnique({
      where: { provider: synthProvider },
      select: { styleHint: true, hyperparams: true },
    });
    CTX_CACHE.provider.set(synthProvider, { value: p, exp: N + TTL });
    return p;
  })();

  // Persona — F5 cache (per-domain)
  const persona = await (async () => {
    const slug = intentAnalysis.domain;
    const hit = CTX_CACHE.persona.get(slug);
    if (hit && hit.exp > N) return hit.value;
    const p = await db.expertPersona.findUnique({
      where: { domainSlug: slug },
      select: { name: true, body: true, jargon: true, frameworks: true, antiPatterns: true },
    });
    CTX_CACHE.persona.set(slug, { value: p, exp: N + TTL });
    return p;
  })();

  // AntiPatterns — F5 cache (per-domain, "global" anahtarı domain=null için)
  const antipatterns = await (async () => {
    const slug = intentAnalysis.domain || "_global_only_";
    const hit = CTX_CACHE.antipatterns.get(slug);
    if (hit && hit.exp > N) return hit.value;
    const r = await db.antiPatternRule.findMany({
      where: {
        isActive: true,
        OR: [{ domainSlug: intentAnalysis.domain }, { domainSlug: null }],
      },
      select: { pattern: true, severity: true, rationale: true },
      take: 20,
    });
    CTX_CACHE.antipatterns.set(slug, { value: r, exp: N + TTL });
    return r;
  })();

  // Exemplars — RAG (cache yok; embedding her sorguda farklı intent text)
  // Context window varsa exemplar sayısını ona göre seç (3 → 2 → 1).
  const initialK = ((): number => {
    const cw = synthEngineRow?.contextWindow ?? 0;
    if (cw === 0) return 3; // bilinmiyorsa default
    if (cw < 16_000) return 1;
    if (cw < 64_000) return 2;
    return 3;
  })();
  let exemplars = await retrieveExemplars({
    intentText,
    modality,
    targetEngineId: target?.id ?? null,
    k: initialK,
    // The analyzer's fields lean English even when the intent is not, which helps match the
    // (English) library without an embedding model.
    extraTerms: [
      intentAnalysis.domain?.replace(/[-_]/g, " "),
      intentAnalysis.entities?.product_or_service,
      intentAnalysis.entities?.audience,
      intentAnalysis.entities?.occasion,
      ...(intentAnalysis.deliverables ?? []).map((d) => d.kind),
    ],
  });

  // System prompt'u derle
  const sections: string[] = [];

  if (constitution) {
    sections.push(`# === CONSTITUTION (v${constitution.version}) ===\n${constitution.content}`);
  } else {
    throw new PipelineError("No active Constitution in DB. Run seed.", 3);
  }

  if (providerProfile?.styleHint) {
    sections.push(`# === PROVIDER PROFILE (${synthProvider}) ===\n${providerProfile.styleHint}`);
  }

  // Model-level format tercihi — admin AiEngine satırına yazdıysa pipeline pekiştirir.
  if (synthEngineRow?.preferredFormat) {
    sections.push(
      `# === MODEL FORMAT PREFERENCE (${synthEngineRow.modelId}) ===\nThis model performs best when the **generated prompt** is structured in **${synthEngineRow.preferredFormat}** format. Shape the prompt content accordingly. Output is plain text — no JSON wrapper, no fences.`,
    );
  }

  // Output language — TARGET-BEST DEFAULT (CLAUDE.md §0). Pure helper used for tests.
  const { outputLang, outputLangReason, intentLang, lyricsLang, lyricsLangReason } =
    decideOutputLanguage({
      intentAnalysis,
      target,
      modality,
    });

  if (modality === "music" && lyricsLang) {
    // Music: descriptors dili + lyrics dili ayrı.
    if (lyricsLang === outputLang) {
      sections.push(
        `# === OUTPUT LANGUAGE ===\n` +
          `Style descriptors / tags: emit in **${outputLang}**. Reason: ${outputLangReason}.\n` +
          `Lyrics: emit in **${lyricsLang}** (same as descriptors here).`,
      );
    } else {
      sections.push(
        `# === OUTPUT LANGUAGE (music — split) ===\n` +
          `Style descriptors / tags: emit in **${outputLang}**. Reason: ${outputLangReason}.\n` +
          `Lyrics: emit in **${lyricsLang}**. Reason: ${lyricsLangReason}.\n` +
          `This split is intentional and non-negotiable: descriptors are interpreted by the model and benefit from ${outputLang}; lyrics carry cultural meaning and should match ${lyricsLang}.`,
      );
    }
  } else if (outputLang === intentLang) {
    sections.push(
      `# === OUTPUT LANGUAGE ===\n` +
        `Emit the final prompt in **${outputLang}** (matches user intent). Reason: ${outputLangReason}.`,
    );
  } else {
    sections.push(
      `# === OUTPUT LANGUAGE (cross-language) ===\n` +
        `The user wrote in **${intentLang}** but the final prompt MUST be emitted in **${outputLang}**. ` +
        `Reason: ${outputLangReason}. ` +
        `UNDERSTAND the user's intent in ${intentLang}; EMIT the final prompt in ${outputLang}. ` +
        `This is non-negotiable: the prompt is consumed by the target AI, not the user.`,
    );
  }

  // Model-spesifik serbest metin rehber (admin'in bu modele özel girdiği)
  if (synthEngineRow?.promptGuidelines) {
    sections.push(
      `# === MODEL-SPECIFIC GUIDELINES (${synthEngineRow.modelId}) ===\n${synthEngineRow.promptGuidelines}`,
    );
  }

  if (target) {
    sections.push(
      `# === TARGET TOOL: ${target.name} ===\nProvider: ${target.provider ?? "n/a"}\nModality: ${target.modality}\n${target.promptStyleHint}`,
    );

    // FAZ 2 (2026-05-03) — TargetEngine authoring criteria injection.
    // These admin-curated fields shape synthesizer output to match the target tool's
    // expected format/limits. Synthesizer must honor them as hard constraints.
    const criteriaLines: string[] = [];
    if (target.charLimit && target.charLimit > 0) {
      criteriaLines.push(`- HARD CHAR LIMIT: ≤ ${target.charLimit} characters. Do not exceed.`);
    }
    // 2026-05-05 — Hybrid v5 plain-text alignment: preferredFormat and
    // structuredFieldSpec are INTERNAL data shape hints (used by validators /
    // future tooling), NOT instructions for the synthesizer. Authoring guidance
    // for the synthesizer flows through `authoringTipsMd` below — that field is
    // human-curated per target and reflects the literal format the target tool
    // expects (e.g. Suno's "[STYLE] / [LYRICS]" two-block plain text).
    if (target.requiresEnglish) {
      criteriaLines.push(
        `- ENGLISH REQUIRED: emit prompt in English regardless of intent language (target tool needs EN).`,
      );
    }
    if (target.negativePromptSupport) {
      criteriaLines.push(
        `- NEGATIVE PROMPTS supported: include explicit "no X" / "negative:" cues for unwanted elements.`,
      );
    }
    if (target.parameterHints && typeof target.parameterHints === "object") {
      const hints = target.parameterHints as Record<string, unknown>;
      const hintList = Object.entries(hints)
        .map(([k, v]) => `    ${k} = ${typeof v === "string" ? v : JSON.stringify(v)}`)
        .join("\n");
      criteriaLines.push(
        `- PARAMETER HINTS (apply when relevant):\n${hintList}`,
      );
    }
    if (target.authoringTipsMd) {
      criteriaLines.push(`- AUTHORING TIPS:\n${target.authoringTipsMd}`);
    }

    if (criteriaLines.length > 0) {
      sections.push(
        `# === TARGET TOOL RULES (HARD CONSTRAINTS — honor these) ===\n${criteriaLines.join("\n")}`,
      );
    }
  } else {
    sections.push(`# === TARGET TOOL ===\n(User did not specify a target tool. Make reasonable assumptions for ${modality} output.)`);
  }

  if (persona) {
    sections.push(renderPersonaSection(persona));
  }

  // G9 — exemplar prompt'larını sıkı listele (similarity skoru kaldırıldı; modele faydası yok)
  let exemplarSectionIndex = -1;
  if (exemplars.length > 0) {
    const exBlock = exemplars.map((ex, i) => `### Exemplar ${i + 1}\n${ex.prompt}`).join("\n\n");
    exemplarSectionIndex = sections.length;
    sections.push(`# === GOLD EXEMPLARS (learn the pattern, do not copy literally) ===\n${exBlock}`);
  }

  // G9 — anti-pattern listesi tek satırlık rationale; severity tag opsiyonel
  let antipatternSectionIndex = -1;
  let antipatternsActive = antipatterns.slice();
  if (antipatterns.length > 0) {
    const apBlock = antipatternsActive.map((a) => `- ${a.rationale}`).join("\n");
    antipatternSectionIndex = sections.length;
    sections.push(`# === ANTI-PATTERNS (do NOT do these) ===\n${apBlock}`);
  }

  // G9 — intent context kompakt (JSON yerine inline)
  sections.push(
    `# === INTENT CONTEXT ===\nDomain: ${intentAnalysis.domain}\nScenario: ${intentAnalysis.scenario}\nLang: ${intentAnalysis.language}\nExpertise: ${intentAnalysis.psych_signals.expertise} | Tone: ${intentAnalysis.psych_signals.tone}`,
  );

  // Context window awareness — system prompt + reserved output context'e sığmazsa kıs.
  // Budget = contextWindow - reservedOutput - userMessage estimate (200 token).
  if (synthEngineRow?.contextWindow) {
    const reservedOutput = synthEngineRow.maxOutputTokens ?? 4096;
    const reservedUserMsg = 1024;
    const budget = synthEngineRow.contextWindow - reservedOutput - reservedUserMsg;
    let attempts = 0;
    while (attempts < 4 && approxTokens(sections.join("\n\n---\n\n")) > budget) {
      attempts++;
      // 1. exemplar'ları azalt
      if (exemplars.length > 1 && exemplarSectionIndex >= 0) {
        exemplars = exemplars.slice(0, exemplars.length - 1);
        const newExBlock = exemplars
          .map((ex, i) => `### Exemplar ${i + 1}\n${ex.prompt}`)
          .join("\n\n");
        sections[exemplarSectionIndex] = `# === GOLD EXEMPLARS (learn the pattern, do not copy literally) ===\n${newExBlock}`;
        continue;
      }
      // 2. antipattern listesini 20 → 10'a indir
      if (antipatternsActive.length > 10 && antipatternSectionIndex >= 0) {
        antipatternsActive = antipatternsActive.slice(0, 10);
        const newApBlock = antipatternsActive.map((a) => `- ${a.rationale}`).join("\n");
        sections[antipatternSectionIndex] = `# === ANTI-PATTERNS (do NOT do these) ===\n${newApBlock}`;
        continue;
      }
      // 3. exemplar bölümünü tamamen sil
      if (exemplarSectionIndex >= 0 && exemplars.length > 0) {
        exemplars = [];
        sections[exemplarSectionIndex] = "";
        continue;
      }
      break;
    }
  }

  const systemPrompt = sections.filter((s) => s.length > 0).join("\n\n---\n\n");

  // User message: imperative — modelin "we will produce..." preamble'ına düşmesini önle.
  // 2026-05-05 — Hybrid v5 plain-text alignment: the synthesizer emits the prompt
  // text itself, NOT a JSON envelope. Reinforce that here.
  const userParts: string[] = [
    "PRODUCE THE FINAL PROMPT NOW.",
    "Output ONLY the prompt text. No JSON wrapper. No markdown fences. No preamble like \"We are…\", \"Here is…\", \"Let me…\", \"Looking at…\", \"Based on…\". No reasoning aloud. The first character of your output is the first character of the prompt itself.",
    "",
    `INTENT:\n${intentText}`,
  ];

  // ENTITIES_TO_PRESERVE — synthesizer çıktıda HER non-empty alanı korumak zorunda.
  const ent = intentAnalysis.entities;
  const lc = intentAnalysis.language_constraints;
  const entityLines: string[] = [];
  if (ent.brand) entityLines.push(`  brand: ${ent.brand}`);
  if (ent.product_or_service) entityLines.push(`  product_or_service: ${ent.product_or_service}`);
  if (ent.occasion) entityLines.push(`  occasion: ${ent.occasion}`);
  if (ent.offer) entityLines.push(`  offer: { kind: ${ent.offer.kind}, value: "${ent.offer.value}" }`);
  if (ent.render_text?.primary) entityLines.push(`  render_text.primary: "${ent.render_text.primary}"`);
  if (ent.render_text?.secondary) entityLines.push(`  render_text.secondary: "${ent.render_text.secondary}"`);
  if (ent.render_text?.cta) entityLines.push(`  render_text.cta: "${ent.render_text.cta}"`);
  if (ent.audience) entityLines.push(`  audience: ${ent.audience}`);
  if (ent.forbidden && ent.forbidden.length > 0) entityLines.push(`  forbidden_by_user: [${ent.forbidden.map((f) => `"${f}"`).join(", ")}]`);
  if (lc.glyphs && lc.glyphs.length > 0) entityLines.push(`  language_constraints.glyphs: [${lc.glyphs.map((g) => `"${g}"`).join(", ")}]`);
  if (lc.keep_intent_language) entityLines.push(`  language_constraints.keep_intent_language: true`);

  if (entityLines.length > 0) {
    userParts.push(
      `ENTITIES_TO_PRESERVE:\n${entityLines.join("\n")}\n\nREQUIREMENT: Every non-empty entity above MUST appear in the output prompt(s) verbatim or as an unmistakable equivalent (logo wordmark for brand, quoted string for render_text, exact figure for offer.value).`,
    );
  }

  // DELIVERABLES_TO_PRODUCE — synthesizer çoklu çıktı durumunda prompts[] dizisinde
  // her deliverable için ayrı tam prompt üretmeli.
  const dels = intentAnalysis.deliverables;
  if (dels.length > 0) {
    const delLines = dels
      .map((d) => {
        const parts: string[] = [`kind=${d.kind}`];
        if (d.aspect) parts.push(`aspect=${d.aspect}`);
        if (d.resolution) parts.push(`resolution=${d.resolution}`);
        if (d.notes) parts.push(`notes=${d.notes}`);
        return `  - ${parts.join(", ")}`;
      })
      .join("\n");
    const multiNote =
      dels.length > 1
        ? "\n\nREQUIREMENT: deliverables.length > 1 → produce ONE FULLY SELF-CONTAINED prompt per deliverable in the prompts[] array. Each prompt repeats brand/render-text/style references; aspect/composition tailored to that deliverable's aspect ratio."
        : "";
    userParts.push(`DELIVERABLES_TO_PRODUCE:\n${delLines}${multiNote}`);
  }

  if (answers.length > 0) {
    const answerBlock = answers.map((a) => `- ${a.question}: ${a.answer}`).join("\n");
    userParts.push(`USER ANSWERS:\n${answerBlock}`);
  } else if (intentAnalysis.scenario === "B" && intentAnalysis.missing_params.length > 0) {
    userParts.push(
      `USER SKIPPED CLARIFICATION. Use sensible defaults for: ${intentAnalysis.missing_params.join(", ")}. Record each as an assumption.`,
    );
  }
  if (iteration) {
    userParts.push(
      `ITERATION FEEDBACK (previous prompt ID ${iteration.ofPromptId}):\n${iteration.feedback}\n\nKeep what was good. Address this specific complaint. Update assumptions accordingly.`,
    );
  }

  const userMessage = userParts.join("\n\n");

  // ProviderProfile.hyperparams JSON'u tipsiz geldiği için defansif normalize.
  const hypRaw = (providerProfile?.hyperparams ?? null) as Record<string, unknown> | null;
  const hyperparams =
    hypRaw && typeof hypRaw === "object"
      ? {
          temperature: typeof hypRaw.temperature === "number" ? hypRaw.temperature : undefined,
          maxTokens: typeof hypRaw.maxTokens === "number" ? hypRaw.maxTokens : undefined,
          topP: typeof hypRaw.topP === "number" ? hypRaw.topP : undefined,
        }
      : null;

  const engineCapabilities: EngineCapabilities | null = synthEngineRow
    ? {
        modelId: synthEngineRow.modelId,
        contextWindow: synthEngineRow.contextWindow,
        maxOutputTokens: synthEngineRow.maxOutputTokens,
        preferredFormat: synthEngineRow.preferredFormat,
        promptGuidelines: synthEngineRow.promptGuidelines,
        supportsVision: synthEngineRow.supportsVision,
        supportsReasoning: synthEngineRow.supportsReasoning,
      }
    : null;

  return {
    systemPrompt,
    userMessage,
    target,
    exemplarIds: exemplars.map((e) => e.id),
    personaSlug: persona ? intentAnalysis.domain : null,
    constitutionVersion: constitution?.version ?? null,
    hyperparams,
    engineCapabilities,
  };
}
