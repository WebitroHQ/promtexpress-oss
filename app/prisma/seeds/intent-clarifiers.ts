/**
 * FAZ 3 (2026-05-03) — IntentClarifierRule seed.
 *
 * Modality-spesifik clarifying soru kataloğu. Few-shot emergent yerine
 * deterministic backstop: Intent Analyzer'a complementary olarak çalışır.
 * Eğer LLM bu soruları sormadıysa ve user intent'i bu boyutu net içermiyorsa,
 * bu kurallar otomatik chip question olarak eklenir.
 *
 * Mission §1: Her modality için "her konuda mükemmel prompt" üretmek için
 * gerekli minimum disambiguation seti.
 */

import { PrismaClient } from "@prisma/client";

interface ClarifierSeed {
  modality: string;
  domainSlug?: string | null;
  priority: number;
  questionKey: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  triggerWhen?: Record<string, unknown> | null;
  isRequired: boolean;
}

export const INTENT_CLARIFIERS: ClarifierSeed[] = [
  // ── MUSIC — vocal/instrumental + lyrics source + genre/mood
  {
    modality: "music",
    priority: 100,
    questionKey: "vocals_or_instrumental",
    label: "Vocals or instrumental?",
    options: [
      { value: "vocals", label: "With vocals (lyrics)" },
      { value: "instrumental", label: "Instrumental (no vocals)" },
    ],
    isRequired: true,
  },
  {
    modality: "music",
    priority: 90,
    questionKey: "lyrics_source",
    label: "Where do lyrics come from?",
    options: [
      { value: "user_provided", label: "I'll provide them" },
      { value: "generate", label: "Generate lyrics for me" },
      { value: "none", label: "No lyrics (instrumental)" },
    ],
    triggerWhen: { vocals_or_instrumental: "vocals" },
    isRequired: false,
  },
  {
    modality: "music",
    priority: 80,
    questionKey: "duration",
    label: "Approximate duration?",
    options: [
      { value: "short", label: "Short (≤ 30s, jingle/hook)" },
      { value: "standard", label: "Standard (~ 2-3 min, full song)" },
      { value: "long", label: "Long (~ 4-6 min, extended)" },
    ],
    isRequired: false,
  },

  // ── TEXT — doc-type + length + audience
  {
    modality: "text",
    priority: 100,
    questionKey: "doc_type",
    label: "What kind of text?",
    options: [
      { value: "academic", label: "Academic / research" },
      { value: "blog", label: "Blog post" },
      { value: "seo_article", label: "SEO article" },
      { value: "social_media", label: "Social media post" },
      { value: "email", label: "Email" },
      { value: "ad_copy", label: "Ad copy / marketing" },
      { value: "script", label: "Script (video / podcast)" },
      { value: "fiction", label: "Fiction / creative" },
      { value: "technical_doc", label: "Technical documentation" },
      { value: "other", label: "Other / general" },
    ],
    isRequired: true,
  },
  {
    modality: "text",
    priority: 90,
    questionKey: "length",
    label: "Approximate length?",
    options: [
      { value: "short", label: "Short (< 300 words)" },
      { value: "medium", label: "Medium (300-1000 words)" },
      { value: "long", label: "Long (1000-3000 words)" },
      { value: "very_long", label: "Very long (3000+ words)" },
    ],
    isRequired: false,
  },
  {
    modality: "text",
    priority: 80,
    questionKey: "tone",
    label: "Tone?",
    options: [
      { value: "professional", label: "Professional" },
      { value: "casual", label: "Casual / friendly" },
      { value: "authoritative", label: "Authoritative" },
      { value: "warm", label: "Warm / empathetic" },
      { value: "humorous", label: "Humorous" },
    ],
    isRequired: false,
  },

  // ── IMAGE — aspect + style + text-in-image
  {
    modality: "image",
    priority: 100,
    questionKey: "aspect_ratio",
    label: "Aspect ratio?",
    options: [
      { value: "1:1", label: "1:1 (square — Instagram post)" },
      { value: "9:16", label: "9:16 (vertical — Stories/Reels/TikTok)" },
      { value: "16:9", label: "16:9 (horizontal — banner/hero)" },
      { value: "4:5", label: "4:5 (Instagram portrait)" },
      { value: "3:2", label: "3:2 (photo standard)" },
    ],
    isRequired: true,
  },
  {
    modality: "image",
    priority: 90,
    questionKey: "has_text",
    label: "Does the image need rendered text?",
    options: [
      { value: "yes_provided", label: "Yes — I'll provide exact text" },
      { value: "yes_generate", label: "Yes — generate suitable text" },
      { value: "no", label: "No text" },
    ],
    isRequired: false,
  },
  {
    modality: "image",
    priority: 80,
    questionKey: "style",
    label: "Visual style?",
    options: [
      { value: "photorealistic", label: "Photorealistic" },
      { value: "illustration", label: "Illustration" },
      { value: "3d_render", label: "3D render" },
      { value: "minimal_flat", label: "Minimal / flat" },
      { value: "cinematic", label: "Cinematic" },
      { value: "anime", label: "Anime" },
      { value: "abstract", label: "Abstract" },
    ],
    isRequired: false,
  },

  // ── VIDEO — duration + camera + audio
  {
    modality: "video",
    priority: 100,
    questionKey: "duration_sec",
    label: "Duration (seconds)?",
    options: [
      { value: "5", label: "~5s (TikTok/Reel hook)" },
      { value: "10", label: "~10s (Runway/Kling max)" },
      { value: "15", label: "~15s (Story)" },
      { value: "30", label: "~30s (ad spot)" },
      { value: "60", label: "~60s (Sora max)" },
    ],
    isRequired: true,
  },
  {
    modality: "video",
    priority: 90,
    questionKey: "aspect_ratio",
    label: "Aspect ratio?",
    options: [
      { value: "9:16", label: "9:16 (vertical — TikTok/Reels/Shorts)" },
      { value: "16:9", label: "16:9 (horizontal — YouTube/landing)" },
      { value: "1:1", label: "1:1 (square)" },
      { value: "4:5", label: "4:5 (Instagram portrait)" },
    ],
    isRequired: true,
  },
  {
    modality: "video",
    priority: 80,
    questionKey: "audio",
    label: "Audio?",
    options: [
      { value: "ambient", label: "Ambient sound design" },
      { value: "music", label: "Music track" },
      { value: "dialogue", label: "Dialogue / voice-over" },
      { value: "none", label: "Silent (no audio)" },
    ],
    isRequired: false,
  },

  // ── AUDIO — voice profile + emotion + format
  {
    modality: "audio",
    priority: 100,
    questionKey: "voice_gender",
    label: "Voice gender?",
    options: [
      { value: "female", label: "Female" },
      { value: "male", label: "Male" },
      { value: "neutral", label: "Neutral / non-binary" },
    ],
    isRequired: true,
  },
  {
    modality: "audio",
    priority: 90,
    questionKey: "tone",
    label: "Tone/emotion?",
    options: [
      { value: "professional", label: "Professional / news" },
      { value: "warm", label: "Warm / friendly" },
      { value: "energetic", label: "Energetic / excited" },
      { value: "calm", label: "Calm / soothing" },
      { value: "dramatic", label: "Dramatic / cinematic" },
    ],
    isRequired: false,
  },

  // ── CODE — stack + change type + acceptance
  {
    modality: "code",
    priority: 100,
    questionKey: "change_type",
    label: "Type of change?",
    options: [
      { value: "new_feature", label: "Add new feature" },
      { value: "fix_bug", label: "Fix a bug" },
      { value: "refactor", label: "Refactor existing code" },
      { value: "migrate", label: "Migrate / upgrade" },
      { value: "explain", label: "Explain / document existing code" },
      { value: "test", label: "Add tests" },
    ],
    isRequired: true,
  },
  {
    modality: "code",
    priority: 90,
    questionKey: "stack",
    label: "Tech stack?",
    options: [
      { value: "javascript_typescript", label: "JavaScript / TypeScript" },
      { value: "python", label: "Python" },
      { value: "go", label: "Go" },
      { value: "rust", label: "Rust" },
      { value: "java_kotlin", label: "Java / Kotlin" },
      { value: "csharp", label: "C# / .NET" },
      { value: "swift", label: "Swift" },
      { value: "sql", label: "SQL" },
      { value: "shell_devops", label: "Shell / DevOps / IaC" },
      { value: "other", label: "Other / multi-stack" },
    ],
    isRequired: false,
  },
];

export async function seedIntentClarifiers(
  prisma: PrismaClient,
): Promise<{ inserted: number; updated: number; skipped: number }> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const c of INTENT_CLARIFIERS) {
    const existing = await prisma.intentClarifierRule.findUnique({
      where: { modality_questionKey: { modality: c.modality, questionKey: c.questionKey } },
    });
    if (!existing) {
      await prisma.intentClarifierRule.create({
        data: {
          modality: c.modality,
          domainSlug: c.domainSlug ?? null,
          priority: c.priority,
          questionKey: c.questionKey,
          label: c.label,
          options: c.options as never,
          triggerWhen: (c.triggerWhen ?? null) as never,
          isRequired: c.isRequired,
          isActive: true,
        },
      });
      inserted++;
      continue;
    }
    const sameOptions =
      JSON.stringify(existing.options) === JSON.stringify(c.options) &&
      JSON.stringify(existing.triggerWhen ?? null) === JSON.stringify(c.triggerWhen ?? null);
    const same =
      existing.priority === c.priority &&
      existing.label === c.label &&
      existing.isRequired === c.isRequired &&
      existing.domainSlug === (c.domainSlug ?? null) &&
      sameOptions;
    if (same) {
      skipped++;
      continue;
    }
    await prisma.intentClarifierRule.update({
      where: { id: existing.id },
      data: {
        priority: c.priority,
        label: c.label,
        options: c.options as never,
        triggerWhen: (c.triggerWhen ?? null) as never,
        isRequired: c.isRequired,
        domainSlug: c.domainSlug ?? null,
      },
    });
    updated++;
  }
  return { inserted, updated, skipped };
}
