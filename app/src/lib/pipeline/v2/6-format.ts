/**
 * Layer 6 — FINAL FORMAT (KOD only)
 *
 * Direktif #8: Bu katman %100 kod, AI çağrısı yok.
 *
 * Yaptıkları:
 *   - Target-spesifik son cila (Midjourney param sırası, ChatGPT markdown clean-up)
 *   - Whitespace normalize
 *   - Ön-arka kırpma (preamble/postamble removal)
 */
import type { FinalOutput, SynthesisOutput, ValidationResult, TargetEngineInfo } from "./types";

export function finalize(args: {
  synthesis: SynthesisOutput;
  validation: ValidationResult;
  target: TargetEngineInfo | null;
}): FinalOutput {
  let promptText = args.synthesis.prompt.trim();

  // 1. Preamble/postamble removal
  promptText = stripCommonWrappers(promptText);

  // 2. Markdown code-fence sıyırma (eğer model "```...```" ile sarmışsa)
  const fenceMatch = /^```(?:[a-zA-Z]+)?\s*([\s\S]*?)\s*```$/.exec(promptText);
  if (fenceMatch && fenceMatch[1]) {
    promptText = fenceMatch[1].trim();
  }

  // 3. Validator BLOCK ise ham metin yerine güvenlik mesajı
  if (args.validation.decision === "BLOCK") {
    promptText =
      args.validation.redactedPrompt ??
      "Bu istek için güvenlik kontrolünden geçemedi. Lütfen isteği yeniden ifade edin.";
  } else if (args.validation.decision === "WARN" && args.validation.redactedPrompt) {
    // PII maskelenmiş prompt'u kullan
    promptText = args.validation.redactedPrompt;
  }

  // 4. Trailing whitespace & multi-newline normalize
  promptText = promptText.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n");

  return {
    promptText,
    assumptions: args.synthesis.assumptions,
    validationScore: args.validation.score,
    validationIssues: args.validation.issues,
  };
}

/**
 * Modality-aware "where does the actual prompt start?" anchor patterns.
 * If text before the anchor is reasoning leak, we slice from the anchor.
 * Order matters slightly (more specific first); all are tried.
 */
const PROMPT_START_ANCHORS: RegExp[] = [
  /\[STYLE\]/i,                              // Suno / Udio music
  /\[LYRICS\]/i,                             // Suno / Udio music
  /\[Verse\]|\[Intro\]|\[Chorus\]|\[Bridge\]|\[Outro\]/i,
  /^---DELIVERABLE:\s/m,                     // multi-deliverable separator
  /^(?:ROLE|TASK|SUBJECT|CONTEXT|FORMAT)\s*:/m, // RTCFE / structured prose
  /^# [A-Z][A-Za-z ]{2,}/m,                   // markdown section header
  /^SUBJECT\s*\+\s*ACTION:/im,                // video template
  /^VOICE_PROFILE:/im,                        // audio template
];

function stripCommonWrappers(s: string): string {
  let r = s;

  // 1) Reasoning XML blokları (Claude/DeepSeek thinking-mode sızıntısı)
  const THINK_BLOCKS = [
    /^<thinking>[\s\S]*?<\/thinking>\s*/i,
    /^<think>[\s\S]*?<\/think>\s*/i,
    /<thinking>[\s\S]*?<\/thinking>\s*/gi,
    /<think>[\s\S]*?<\/think>\s*/gi,
  ];
  for (const p of THINK_BLOCKS) {
    r = r.replace(p, "");
  }

  // 2) Reasoning preamble — "We are asked to produce...", "We'll generate...", vs.
  // KS-1 / KS-7: synthesizer fallback kalıbı; B1+B5 birincil korumadır,
  // bu son güvenlik ağıdır.
  // 2026-05-05 — KS Suno: model started with "We are the Synthesizer." then
  // ran 3000+ chars of meta-reasoning. Patterns expanded + multi-line tolerant.
  const PRE_PATTERNS = [
    /^(?:Here'?s?|Here is)\s+(?:your\s+)?prompt:?\s*/i,
    /^Sure,?\s+(?:here\s+is|let me).*?:\s*/i,
    /^Promptunuz:?\s*/i,
    /^İşte\s+(?:promptunuz|prompt'unuz):?\s*/i,
    /^(?:We are asked|We are the|We'll|We will|We must|Let me|Let's|I'll|I will|I think|I need|Looking at|Based on|Given the|Reading the)\s[\s\S]*?\n\s*\n+/i,
    /^(?:Hmm|Wait|Actually|So,|Okay,|Ok,|Right,|Alright)[,\s][\s\S]*?\n\s*\n+/i,
    /^The (?:operational doctrine|role brief|Constitution|few-shot examples|user|task|target tool|target's)\b[\s\S]*?\n\s*\n+/i,
    /^But\b[\s\S]*?\n\s*\n+/i,
    /^(?:Thinking|Reasoning|Analysis|Note):\s*\n[\s\S]*?\n\n/i,
    /^Final prompt:?\s*\n+/i,
    /^The final prompt is:?\s*\n+/i,
    /^Final answer:?\s*\n+/i,
  ];
  for (const p of PRE_PATTERNS) {
    r = r.replace(p, "");
  }

  // 2b) Defense-in-depth: if the head still contains meta-leak markers AND
  // a known prompt-start anchor exists somewhere in the body, slice from the
  // earliest anchor. Catches multi-paragraph reasoning that pattern-matching
  // can't fully tokenize.
  const HEAD = r.slice(0, 800);
  const META_LEAK_HEAD =
    /\b(?:role brief|few-shot examples?|operational doctrine|Constitution block|the Synthesizer|the Intent Analyzer)\b/i.test(
      HEAD,
    );
  if (META_LEAK_HEAD) {
    let earliest = -1;
    for (const anchor of PROMPT_START_ANCHORS) {
      const m = anchor.exec(r);
      if (m && m.index !== undefined) {
        if (earliest === -1 || m.index < earliest) earliest = m.index;
      }
    }
    if (earliest > 0) {
      r = r.slice(earliest);
    }
  }

  // 3) Trailing meta-commentary ("Let me know if...", "Hope this helps")
  const POST_PATTERNS = [
    /\n\s*Let me know if[\s\S]*$/i,
    /\n\s*Hope this helps[\s\S]*$/i,
    /\n\s*Bu yardımcı olur mu[\s\S]*$/i,
    /\n\s*Feel free to[\s\S]*$/i,
  ];
  for (const p of POST_PATTERNS) {
    r = r.replace(p, "");
  }
  return r.trim();
}
