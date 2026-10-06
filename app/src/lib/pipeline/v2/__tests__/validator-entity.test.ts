import { describe, it, expect, vi } from "vitest";
import { runValidator } from "../5-validator";
import type { IntentAnalysis, SynthesisOutput, TargetEngineInfo } from "../types";

// DB çağrılarını mock'la — antiPatternRule.findMany sadece domainSlug için kullanılıyor
vi.mock("@/db/client", () => ({
  db: {
    antiPatternRule: { findMany: async () => [] },
  },
}));

const flux: TargetEngineInfo = {
  id: "x",
  slug: "flux-2-pro",
  name: "FLUX.2 [pro]",
  provider: "Black Forest Labs",
  modality: "image",
  promptStyleHint: "",
  preferredLanguage: null,
} as TargetEngineInfo;

const mj: TargetEngineInfo = { ...flux, slug: "midjourney", name: "Midjourney" };

const intentBase: Pick<IntentAnalysis, "entities" | "deliverables" | "language_constraints"> = {
  entities: {},
  deliverables: [{ kind: "social_post", aspect: "1:1" }],
  language_constraints: {},
};

const goodImagePrompt =
  'Luxury Instagram post for a brand. PRIMARY TEXT: "Yeni Sezon" elegant serif. ' +
  "BRAND LOGO AREA top-center. LAYOUT square 1:1. BACKGROUND marble. " +
  "TYPOGRAPHY RULES: preserve characters: ü, İ; no garbled glyphs; no misspellings. " +
  "NEGATIVE: no people, no watermark, no lorem ipsum. aspect ratio 1:1, 2048x2048.";

describe("validator — entity preservation + image image checks", () => {
  it("PASS for healthy image prompt with all guards", async () => {
    const r = await runValidator({
      prompt: goodImagePrompt,
      modality: "image",
      target: flux,
      domainSlug: "design.photo-product",
      intentAnalysis: {
        ...intentBase,
        entities: { brand: "brand", render_text: { primary: "Yeni Sezon" } },
        language_constraints: { glyphs: ["ü", "İ"] },
      },
      synthesis: { prompts: [{ deliverable: "social_post", aspect: "1:1", prompt: goodImagePrompt }] },
    });
    expect(r.decision).toBe("PASS");
    expect(r.issues).toEqual([]);
  });

  it("WARN when render_text primary missing from output", async () => {
    const r = await runValidator({
      prompt: goodImagePrompt.replace('"Yeni Sezon"', "(no headline here)"),
      modality: "image",
      target: flux,
      domainSlug: null,
      intentAnalysis: {
        ...intentBase,
        entities: { render_text: { primary: "Yeni Sezon" } },
      },
    });
    expect(r.decision).toBe("WARN");
    expect(r.issues.some((i) => i.includes("render_text.primary"))).toBe(true);
  });

  it("WARN when image prompt has no NEGATIVE block", async () => {
    const noNeg = "A picture. PRIMARY TEXT: \"Hello\". aspect ratio 1:1.";
    const r = await runValidator({
      prompt: noNeg,
      modality: "image",
      target: flux,
      domainSlug: null,
      intentAnalysis: { ...intentBase, entities: { render_text: { primary: "Hello" } } },
    });
    expect(r.decision).toBe("WARN");
    expect(r.issues.some((i) => /NEGATIVE/i.test(i))).toBe(true);
  });

  it("WARN when image prompt has no aspect ratio", async () => {
    const noAr =
      "A high-end picture for an editorial campaign with refined typography. NEGATIVE: no people, no watermark, no lorem.";
    const r = await runValidator({
      prompt: noAr,
      modality: "image",
      target: flux,
      domainSlug: null,
    });
    expect(r.decision).toBe("WARN");
    expect(r.issues.some((i) => /aspect/i.test(i))).toBe(true);
  });

  it("WARN when Midjourney prompt missing --ar flag", async () => {
    const noFlag = "minimalist logo, vector. aspect ratio 1:1. NEGATIVE: no text, no people.";
    const r = await runValidator({
      prompt: noFlag,
      modality: "image",
      target: mj,
      domainSlug: null,
    });
    expect(r.decision).toBe("WARN");
    expect(r.issues.some((i) => /--ar/i.test(i))).toBe(true);
  });

  it("WARN when glyphs set but no glyph-guard ifadesi", async () => {
    const noGlyph =
      'A picture. PRIMARY TEXT: "Hello". aspect ratio 1:1. NEGATIVE: no people, no watermark.';
    const r = await runValidator({
      prompt: noGlyph,
      modality: "image",
      target: flux,
      domainSlug: null,
      intentAnalysis: {
        ...intentBase,
        entities: { render_text: { primary: "Hello" } },
        language_constraints: { glyphs: ["ü", "İ"] },
      },
    });
    expect(r.decision).toBe("WARN");
    expect(r.issues.some((i) => /glyph/i.test(i))).toBe(true);
  });

  it("WARN on multi-deliverable count mismatch", async () => {
    const r = await runValidator({
      prompt: goodImagePrompt,
      modality: "image",
      target: flux,
      domainSlug: null,
      intentAnalysis: {
        entities: {},
        deliverables: [
          { kind: "social_post", aspect: "1:1" },
          { kind: "story", aspect: "9:16" },
          { kind: "ad_banner", aspect: "16:9" },
        ],
        language_constraints: {},
      },
      synthesis: {
        prompts: [{ deliverable: "social_post", aspect: "1:1", prompt: goodImagePrompt }],
      },
    });
    expect(r.decision).toBe("WARN");
    expect(r.issues.some((i) => /Multi-deliverable/i.test(i))).toBe(true);
  });

  it("brand entity in intent must appear in output (case-insensitive)", async () => {
    const noBrand = goodImagePrompt; // brand "<a brand>" geçmiyor
    const r = await runValidator({
      prompt: noBrand,
      modality: "image",
      target: flux,
      domainSlug: null,
      intentAnalysis: {
        ...intentBase,
        entities: { brand: "Acme Corp", render_text: { primary: "Yeni Sezon" } },
        language_constraints: { glyphs: ["ü"] },
      },
    });
    expect(r.decision).toBe("WARN");
    expect(r.issues.some((i) => i.includes("brand"))).toBe(true);
  });
});
