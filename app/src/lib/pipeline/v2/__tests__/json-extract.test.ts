import { describe, it, expect } from "vitest";
import { extractJson } from "../json-extract";

describe("extractJson", () => {
  it("returns null for empty input", () => {
    expect(extractJson("")).toBeNull();
  });

  it("parses pure JSON (provider native JSON mode)", () => {
    const raw = '{"prompt":"hello","assumptions":[]}';
    expect(extractJson<{ prompt: string }>(raw)).toEqual({
      prompt: "hello",
      assumptions: [],
    });
  });

  it("parses ```json fenced block", () => {
    const raw = "Here you go:\n```json\n{\"prompt\":\"x\"}\n```\nbye";
    expect(extractJson<{ prompt: string }>(raw)).toEqual({ prompt: "x" });
  });

  it("parses unfenced ``` block", () => {
    const raw = "```\n{\"prompt\":\"y\"}\n```";
    expect(extractJson<{ prompt: string }>(raw)).toEqual({ prompt: "y" });
  });

  it("parses JSON after reasoning preamble (depth-aware)", () => {
    const raw =
      "We are asked to produce a final prompt. Looking at this, here is the JSON:\n" +
      '{"prompt":"final","assumptions":[{"key":"k","value":"v","label_tr":"x"}]}\n' +
      "Hope this helps!";
    const parsed = extractJson<{ prompt: string; assumptions: unknown[] }>(raw);
    expect(parsed?.prompt).toBe("final");
    expect(parsed?.assumptions).toHaveLength(1);
  });

  it("handles nested braces inside string literal (Suno lyrics with {melody})", () => {
    const raw = '{"prompt":"[STYLE]\\nclassical\\n\\n[LYRICS]\\n[Verse]\\n{melody hint}\\nopen vowels"}';
    const parsed = extractJson<{ prompt: string }>(raw);
    expect(parsed?.prompt).toContain("[STYLE]");
    expect(parsed?.prompt).toContain("{melody hint}");
  });

  it("handles escaped quotes inside string literal", () => {
    const raw = '{"prompt":"he said \\"hello\\" then left"}';
    const parsed = extractJson<{ prompt: string }>(raw);
    expect(parsed?.prompt).toBe('he said "hello" then left');
  });

  it("returns null for malformed JSON with no recoverable shape", () => {
    expect(extractJson("just plain prose, no json at all")).toBeNull();
  });

  it("prefers direct parse when text is already JSON (Anthropic tool-use stringify case)", () => {
    const raw = JSON.stringify({ prompt: "tool-use output", assumptions: [] });
    expect(extractJson<{ prompt: string }>(raw)).toEqual({
      prompt: "tool-use output",
      assumptions: [],
    });
  });

  it("parses array root", () => {
    const raw = "Output:\n[1,2,3]";
    expect(extractJson<number[]>(raw)).toEqual([1, 2, 3]);
  });

  it("ignores braces inside string when scanning depth", () => {
    // İlk { string içinde, ikinci { gerçek JSON başlangıcı
    const raw = 'Note: "use { for blocks". Then:\n{"prompt":"ok"}';
    const parsed = extractJson<{ prompt: string }>(raw);
    expect(parsed?.prompt).toBe("ok");
  });
});
