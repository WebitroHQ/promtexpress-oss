import { describe, it, expect } from "vitest";
import { finalize } from "../6-format";
import type { SynthesisOutput, ValidationResult } from "../types";

const passValidation: ValidationResult = {
  score: 95,
  issues: [],
  decision: "PASS",
  redactedPrompt: null,
};

function syn(prompt: string): SynthesisOutput {
  return {
    prompt,
    prompts: [{ deliverable: "default", prompt }],
    assumptions: [],
  };
}

describe("finalize — reasoning preamble stripping (B7)", () => {
  it("strips 'We are asked to produce' preamble", () => {
    const out = finalize({
      synthesis: syn(
        "We are asked to produce a final prompt for Suno (music).\n\n[STYLE]\nclassical orchestra\n\n[LYRICS]\n[Verse]\nrising sun",
      ),
      validation: passValidation,
      target: null,
    });
    expect(out.promptText).not.toMatch(/we are asked/i);
    expect(out.promptText).toMatch(/\[STYLE\]/);
    expect(out.promptText).toMatch(/classical orchestra/);
  });

  it("strips 'We'll generate...' preamble", () => {
    const out = finalize({
      synthesis: syn(
        "We'll generate a prompt in English because Suno works best with English descriptors.\n\n[STYLE]\nlo-fi",
      ),
      validation: passValidation,
      target: null,
    });
    expect(out.promptText).not.toMatch(/we'll generate/i);
    expect(out.promptText).toMatch(/\[STYLE\]/);
  });

  it("strips <thinking>...</thinking> blocks", () => {
    const out = finalize({
      synthesis: syn(
        "<thinking>Let me consider the user's intent and pick a structure.</thinking>\n\nminimalist logo, vector, --ar 1:1 --v 6",
      ),
      validation: passValidation,
      target: null,
    });
    expect(out.promptText).not.toMatch(/<thinking>/);
    expect(out.promptText).not.toMatch(/let me consider/i);
    expect(out.promptText).toMatch(/minimalist logo/);
  });

  it("strips <think> blocks (DeepSeek style)", () => {
    const out = finalize({
      synthesis: syn(
        "<think>The user wants a Python perf prompt.</think>You are a senior Python engineer...",
      ),
      validation: passValidation,
      target: null,
    });
    expect(out.promptText).not.toMatch(/<think>/);
    expect(out.promptText).toMatch(/^You are a senior/);
  });

  it("strips 'Here is your prompt:' wrapper", () => {
    const out = finalize({
      synthesis: syn("Here is your prompt: A whimsical illustration..."),
      validation: passValidation,
      target: null,
    });
    expect(out.promptText.toLowerCase()).not.toContain("here is your prompt");
    expect(out.promptText).toMatch(/whimsical/);
  });

  it("strips 'Final prompt:' header", () => {
    const out = finalize({
      synthesis: syn("Final prompt:\n\nminimalist coffee shop logo --v 6"),
      validation: passValidation,
      target: null,
    });
    expect(out.promptText).not.toMatch(/^final prompt:/i);
    expect(out.promptText).toMatch(/minimalist coffee/);
  });

  it("strips trailing 'Let me know if...' meta-commentary", () => {
    const out = finalize({
      synthesis: syn("the prompt body here\n\nLet me know if you need any adjustments!"),
      validation: passValidation,
      target: null,
    });
    expect(out.promptText).not.toMatch(/let me know/i);
    expect(out.promptText).toMatch(/the prompt body here/);
  });

  it("strips markdown code-fence wrapper around full output", () => {
    const out = finalize({
      synthesis: syn("```\nminimalist logo, --ar 1:1\n```"),
      validation: passValidation,
      target: null,
    });
    expect(out.promptText).not.toMatch(/^```/);
    expect(out.promptText).toBe("minimalist logo, --ar 1:1");
  });

  it("BLOCK validation replaces output with safety message", () => {
    const out = finalize({
      synthesis: syn("dangerous content"),
      validation: { ...passValidation, decision: "BLOCK", score: 0 },
      target: null,
    });
    expect(out.promptText).toMatch(/güvenlik/i);
  });

  it("WARN with redactedPrompt uses redacted version", () => {
    const out = finalize({
      synthesis: syn("contact john.doe@example.com about the deal"),
      validation: {
        score: 70,
        issues: ["PII"],
        decision: "WARN",
        redactedPrompt: "contact [EMAIL_REDACTED] about the deal",
      },
      target: null,
    });
    expect(out.promptText).toBe("contact [EMAIL_REDACTED] about the deal");
  });

  it("normalizes excess newlines (3+ → 2)", () => {
    const out = finalize({
      synthesis: syn("line 1\n\n\n\n\nline 2"),
      validation: passValidation,
      target: null,
    });
    expect(out.promptText).toBe("line 1\n\nline 2");
  });

  it("preserves clean Suno two-block format unchanged", () => {
    const clean =
      "[STYLE]\nclassical orchestra, presto, A major, 168 BPM\n\n[LYRICS]\n[Verse]\nrising sun\n\n[Chorus]\nsing the dawn";
    const out = finalize({
      synthesis: syn(clean),
      validation: passValidation,
      target: null,
    });
    expect(out.promptText).toBe(clean);
  });
});
