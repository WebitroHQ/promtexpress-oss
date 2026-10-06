/**
 * v4 PROMPT ENGINE — type contracts for the 6-layer pipeline.
 *
 * Pipeline:
 *   [1] preprocess (KOD) → PreprocessOutput
 *   [2] intent-analyzer (AI) → IntentAnalysis
 *   [3] context-assembly (KOD) → AssembledContext
 *   [4] synthesizer (AI) → SynthesisOutput
 *   [5] validator (KOD + opt. AI) → ValidationResult
 *   [6] format (KOD) → FinalOutput + persist
 *
 * Direktif #1: AI motor adı/modeli kodda yok — admin AgentRoleAssignment ile atar.
 */

// ──────────────────────────────────────────────────────
// Public contract
// ──────────────────────────────────────────────────────

export interface GenerationInputV4 {
  userId: string;
  intent: string;
  modality: Modality;
  targetEngineId?: string | null;
  /** Chip answers from Screen 2 (Scenario B). Empty if scenario was A or skipped. */
  answers?: Answer[];
  /** Iteration mode: regenerate based on user feedback on a previous prompt. */
  iteration?: { ofPromptId: string; feedback: string } | null;
  /** Optional source for ledger tagging. */
  source?: "web" | "api";
  /**
   * F1 — Intent cache. UI'dan analyze sonucu geldiğinde Layer 2 atlanır.
   * Aynı /generator akışında intent çift çağrılmaz.
   */
  cachedIntent?: IntentAnalysis | null;
}

export interface GenerationResultV4 {
  promptId: string;
  output: string;
  creditsUsed: number;
  creditsRemaining: number;
  latencyMs: number;
  validationScore: number | null;
  validationIssues: string[];
  /** UI shows these as "Assumptions you can adjust" in Screen 3. */
  assumptions: Assumption[];
  /** GenerationTrace.id — admin debug + iteration anchor. */
  traceId: string;
  /** Scenario detected by intent-analyzer. */
  scenario: "A" | "B" | "C";
  /** For Scenario B: chip questions to render on Screen 2. */
  chipQuestions?: ChipQuestion[];
  /** For Scenario C: ambiguity clarifications. */
  ambiguityClarifications?: string[];
  /** Sidebar "Son üretimler" listesine lokal eklenecek entry — router.refresh ihtiyacını ortadan kaldırır. */
  recentEntry: {
    id: string;
    mod: string;
    title: string;
    userInput: string;
    date: string;
  };
}

// ──────────────────────────────────────────────────────
// Shared primitive types
// ──────────────────────────────────────────────────────

export type Modality =
  | "text"
  | "code"
  | "image"
  | "video"
  | "audio"
  | "music"
  // FAZ 3.5 (2026-05-03) — coverage expansion
  | "math"
  | "slides"
  | "diagram"
  | "3d"
  | "document";

export interface Answer {
  question: string;
  answer: string;
}

export interface ChipQuestion {
  label: string;
  options: string[];
}

export interface Assumption {
  key: string;
  value: string;
  /** Turkish label for UI. */
  label_tr: string;
}

// ──────────────────────────────────────────────────────
// Layer outputs
// ──────────────────────────────────────────────────────

export interface PreprocessOutput {
  rawText: string;
  cleanText: string;
  language: string; // ISO 639-1
  modality: Modality;
  /** Heuristic length signal */
  charCount: number;
  /** PII matches found and masked in cleanText */
  piiMasked: { type: string; mask: string }[];
  /** Code-level entity hint çıkarımı (regex tabanlı, AI çağrısı YOK).
   *  Intent analyzer için yardımcı sinyal — yapısal alanları gözden kaçırma riskini düşürür. */
  entityHints: {
    properNouns: string[];
    quotedStrings: string[];
    percentages: string[];
    monetary: string[];
    dates: string[];
    deliverableKeywords: string[];
  };
}

export interface IntentAnalysis {
  domain: string;
  language: string;
  scenario: "A" | "B" | "C";
  missing_params: string[];
  chip_questions: ChipQuestion[];
  ambiguity_clarifications: string[];
  psych_signals: {
    expertise: "novice" | "intermediate" | "expert";
    tone: "casual" | "professional" | "frustrated" | "neutral";
    specificity: number;
  };

  /** Intent metninden çıkarılmış yapılandırılmış varlıklar.
   *  Synthesizer bu alanları çıktı prompt'ta KORUMAK zorundadır
   *  (3-context-assembly ENTITIES_TO_PRESERVE bloğu olarak iletir).
   *  Tüm alt alanlar opsiyoneldir; intent ilgili sinyali içermiyorsa boş kalır. */
  entities: {
    brand?: string;
    product_or_service?: string;
    occasion?: string;
    offer?: { kind: "discount" | "bundle" | "freebie" | "other"; value: string };
    render_text?: { primary?: string; secondary?: string; cta?: string };
    audience?: string;
    forbidden?: string[];
  };

  /** Çoklu çıktı talebi (örn. "post + banner") tespit edildiyse her bir kalem.
   *  Tek çıktı durumunda diziye 1 eleman koyulur. */
  deliverables: Array<{
    kind: string;
    aspect?: string;
    resolution?: string;
    notes?: string;
  }>;

  /** Dil/karakter kısıtları. Intent dili özel diakritik içeriyorsa veya
   *  kullanıcı çıktı dilini sabitlediyse buradan synthesizer'a iletilir. */
  language_constraints: {
    glyphs?: string[];
    keep_intent_language?: boolean;
    /** 2026-05-05 — Music modality: lyrics dilini override. Boş bırakılırsa
     *  varsayılan: intent dili (kültürel sadakat). Descriptors dili ayrıca
     *  decideOutputLanguage ile belirlenir. */
    lyrics_language?: string;
  };
}

export interface EngineCapabilities {
  modelId: string;
  contextWindow: number | null;
  maxOutputTokens: number | null;
  preferredFormat: string | null;
  promptGuidelines: string | null;
  supportsVision: boolean;
  supportsReasoning: boolean;
}

export interface AssembledContext {
  /** Pre-built system prompt for synthesizer. */
  systemPrompt: string;
  /** User message body (intent + answers + iteration feedback). */
  userMessage: string;
  /** Resolved target engine info (if any). */
  target: TargetEngineInfo | null;
  /** IDs of exemplars retrieved by RAG (for trace). */
  exemplarIds: string[];
  /** Persona slug used (for trace). */
  personaSlug: string | null;
  /** Constitution version used. */
  constitutionVersion: string | null;
  /** Synthesizer engine'inin ProviderProfile.hyperparams değeri (DB → synthesizer). */
  hyperparams: { temperature?: number; maxTokens?: number; topP?: number } | null;
  /** Synthesizer engine'inin model-level capability metadata'sı. */
  engineCapabilities: EngineCapabilities | null;
}

export interface TargetEngineInfo {
  id: string;
  slug: string;
  name: string;
  provider: string | null;
  modality: string;
  promptStyleHint: string;
  /** Bu target'in en iyi anladığı çıktı dili. ISO 639-1 ("en", "tr"…) veya "multilingual". null = kullanıcı dili. */
  preferredLanguage: string | null;
  /** FAZ 1 (2026-05-03) — synthesizer & validator hard constraints */
  charLimit: number | null;
  preferredFormat: string | null;
  requiresEnglish: boolean;
  negativePromptSupport: boolean;
  structuredFieldSpec: unknown;
  parameterHints: unknown;
  authoringTipsMd: string | null;
}

export interface SynthesisOutput {
  /** Birincil prompt — geri uyumluluk için. prompts[0].prompt ile aynı içerik.
   *  Persist tarafı (Prompt.result) bu alanı kullanır. */
  prompt: string;
  /** Çoklu çıktı (deliverables.length > 1) için her deliverable'ın tam prompt'u.
   *  Tek çıktı durumunda 1 elemanlı dizi; her zaman dolu. */
  prompts: Array<{ deliverable: string; aspect?: string; prompt: string }>;
  assumptions: Assumption[];
  /**
   * 2026-05-12 (Garantili Teslimat v2):
   * `true` when the synthesizer fallback chain could not produce a
   * gate-passing output and the engine returned a best-effort candidate
   * instead. Pipeline orchestrator (index.ts) uses this to skipDebit and
   * surface telemetry; user-facing UI may show a "best-effort, regenerate?"
   * banner.
   */
  degraded: boolean;
  /**
   * Quality issues attached by the synthesizer (e.g. "shape-mismatch:video").
   * Empty when the output passed all gates.
   */
  qualityIssues: string[];
}

export interface ValidationResult {
  /** 0-100 quality score; null if AI scoring not applied */
  score: number | null;
  issues: string[];
  /**
   * 2026-05-12 — Plan §6.a. REJECT eklendi: subject hallucination ya da
   * modality-critical şekil ihlali. Üst katman engine fallback retry tetikler.
   */
  decision: "PASS" | "WARN" | "BLOCK" | "REJECT";
  redactedPrompt: string | null;
  /** Set when the optional AI safety check threw before returning a verdict.
   *  Pipeline keeps soft-fail UX (does not block the user) but admin can see
   *  the failure via GenerationTrace.validationJson. */
  aiSafetyError?: string;
}

export interface FinalOutput {
  promptText: string;
  assumptions: Assumption[];
  validationScore: number | null;
  validationIssues: string[];
}

// ──────────────────────────────────────────────────────
// Errors (re-exported from layer modules)
// ──────────────────────────────────────────────────────

export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly layer: 1 | 2 | 3 | 4 | 5 | 6,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "PipelineError";
  }
}
