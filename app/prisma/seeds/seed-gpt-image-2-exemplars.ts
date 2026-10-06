/**
 * GPT Image 2 — GOLD exemplar seed.
 *
 * RAG sorgusu (rag.ts:112) targetEngineId eşleşmesi olmadığında jenerik
 * image exemplarlarına düşer. Bu jenerik exemplarlar Midjourney formatında
 * olduğundan synthesizer'a yanlış format öğretilir.
 *
 * Bu seed GPT Image 2'ye özel doğal dil exemplarları ekler; RAG artık
 * doğru formatı gösterir.
 *
 * Idempotent: promptHash unique constraint üzerinden — her çalıştırmada
 * aynı prompt varsa atlanır.
 */
import { PrismaClient, ExemplarStatus } from "@prisma/client";
import { createHash } from "crypto";

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

const EXEMPLARS: Array<{
  prompt: string;
  title: string;
  intentTags: string[];
  qualityScore: number;
}> = [
  {
    title: "Photo lighting enhancement — shadow/highlight balance",
    intentTags: ["photo-edit", "lighting", "exposure", "enhancement"],
    qualityScore: 95,
    prompt:
      "Enhance this photograph by improving the overall lighting. " +
      "Increase exposure in the shadow areas by approximately 1.5 stops while preserving highlight detail. " +
      "Adjust the white balance to a warmer golden tone around 5500K. " +
      "Apply subtle clarity enhancement to midtones. Keep skin tones natural and avoid over-saturation.",
  },
  {
    title: "Product hero image — minimalist studio",
    intentTags: ["product-photography", "generate", "studio", "commercial"],
    qualityScore: 92,
    prompt:
      "A sleek smartphone lying flat on a clean white marble surface. " +
      "Soft diffused studio lighting from the upper left with a gentle fill light on the right side. " +
      "Minimal shadow beneath the device. Shallow depth of field with sharp focus on the screen. " +
      "Clean white background. No people, no text overlays, no props.",
  },
  {
    title: "Portrait retouching — natural skin, background softening",
    intentTags: ["portrait", "retouch", "photo-edit", "skin"],
    qualityScore: 90,
    prompt:
      "Edit this portrait: soften the harsh shadows under the eyes without losing natural skin texture. " +
      "Apply a gentle background blur to separate the subject. " +
      "Increase overall brightness by 10-15%. Do not over-smooth skin — preserve pores and natural detail. " +
      "Preserve the original color palette. No background replacement.",
  },
  {
    title: "Food photography — color and lighting correction",
    intentTags: ["food", "photo-edit", "color-correction", "commercial"],
    qualityScore: 88,
    prompt:
      "Correct the color and lighting of this food photograph. " +
      "Boost the warmth slightly to make the food look more appetizing. " +
      "Increase vibrance of the food colors without making them look artificial. " +
      "Add subtle top-down soft light to bring out the texture. " +
      "Clean the background if any distracting elements are visible.",
  },
  {
    title: "E-commerce product — white background isolation",
    intentTags: ["e-commerce", "product", "white-background", "generate"],
    qualityScore: 91,
    prompt:
      "A pair of white running shoes photographed on a pure white background with no shadows or reflections. " +
      "Even, flat lighting that shows all product details clearly. " +
      "The shoes are placed at a slight three-quarter angle showing both the side profile and the toe box. " +
      "Ultra-sharp detail on the shoe texture and lacing. Commercial product photography style.",
  },
];

export async function seedGptImage2Exemplars(
  prisma: PrismaClient,
): Promise<{ inserted: number; skipped: number }> {
  // Resolve the TargetEngine id for slug="gpt-image-2"
  const targetEngine = await prisma.targetEngine.findUnique({
    where: { slug: "gpt-image-2" },
    select: { id: true },
  });

  if (!targetEngine) {
    console.warn("  ⚠ TargetEngine slug=gpt-image-2 not found — skipping GPT Image 2 exemplars.");
    console.warn("    Create the engine via /pr/yonet/target-engines first, then re-run pnpm db:seed.");
    return { inserted: 0, skipped: EXEMPLARS.length };
  }

  let inserted = 0;
  let skipped = 0;

  for (const ex of EXEMPLARS) {
    const hash = sha256(ex.prompt);
    const existing = await prisma.promptExemplar.findUnique({
      where: { promptHash: hash },
      select: { id: true },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.promptExemplar.create({
      data: {
        source: "seed_gpt_image_2",
        modality: "image",
        targetEngineId: targetEngine.id,
        language: "en",
        title: ex.title,
        prompt: ex.prompt,
        promptHash: hash,
        contentLength: ex.prompt.length,
        intentTags: ex.intentTags,
        qualityScore: ex.qualityScore,
        status: ExemplarStatus.GOLD,
      },
    });
    inserted++;
  }

  return { inserted, skipped };
}
