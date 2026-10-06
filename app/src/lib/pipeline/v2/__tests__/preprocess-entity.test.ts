import { describe, it, expect } from "vitest";
import { preprocess } from "../1-preprocess";

describe("preprocess — entityHints (regex-based, AI-free)", () => {
  it("extracts quoted strings", () => {
    const out = preprocess('Slogan "Daha az çaba, daha çok sonuç" için video', "video");
    expect(out.entityHints.quotedStrings).toContain("Daha az çaba, daha çok sonuç");
  });

  it("extracts curly-quoted strings", () => {
    const out = preprocess("başlık “Yeni Sezon” olacak", "image");
    expect(out.entityHints.quotedStrings).toContain("Yeni Sezon");
  });

  it("extracts percentages in TR and EN forms", () => {
    const out = preprocess("kampanya %30 indirim ve 25% off", "image");
    expect(out.entityHints.percentages.length).toBeGreaterThanOrEqual(2);
  });

  it("extracts monetary figures", () => {
    const out = preprocess("ürün ₺199 ve $49 fiyatlı", "text");
    expect(out.entityHints.monetary.length).toBeGreaterThanOrEqual(2);
  });

  it("extracts dates in TR and ISO forms", () => {
    const out = preprocess("son tarih 2026-06-15", "text");
    expect(out.entityHints.dates).toContain("2026-06-15");
  });

  it("extracts TR month-form dates", () => {
    const out = preprocess("12 Mayıs 2026 günü açılış", "text");
    expect(out.entityHints.dates.length).toBeGreaterThanOrEqual(1);
  });

  it("detects deliverable keywords (post + banner)", () => {
    const out = preprocess(
      "Instagram postu ve reklam banner'ı hazırlamak istiyorum",
      "image",
    );
    expect(out.entityHints.deliverableKeywords).toContain("post");
    expect(out.entityHints.deliverableKeywords).toContain("banner");
  });

  it("detects multi-format social (post + story + reel)", () => {
    const out = preprocess(
      "Yeni menü için Instagram post + story + reel hepsini hazırla",
      "image",
    );
    const dk = out.entityHints.deliverableKeywords;
    expect(dk).toContain("post");
    expect(dk).toContain("story");
    expect(dk).toContain("reel");
  });

  it("does not extract content as proper noun when none present", () => {
    const out = preprocess("merhaba dünya nasılsın", "text");
    expect(out.entityHints.properNouns).toEqual([]);
  });

  it("returns empty hints for empty-content modalities without leakage", () => {
    const out = preprocess("test", "code");
    expect(out.entityHints.percentages).toEqual([]);
    expect(out.entityHints.monetary).toEqual([]);
    expect(out.entityHints.dates).toEqual([]);
  });
});
