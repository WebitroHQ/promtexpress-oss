"use server";

import { db } from "@/db/client";
import { requireAdmin, writeAudit } from "@/lib/audit";
import { parseFileContent } from "@/lib/library/parsers";
import { detectLanguage } from "@/lib/library/lang-detect";
import { translateToEnglish } from "@/lib/library/translate";
import { computePromptHash, findExistingByHash } from "@/lib/library/dedupe";
import { embedText, saveEmbedding } from "@/lib/library/embedding";
import { revalidatePath } from "next/cache";

export type ImportProgress = {
  total: number;
  parsed: number;
  translated: number;
  embedded: number;
  saved: number;
  duplicates: number;
  errors: string[];
};

export type ImportOptions = {
  sourceLabel: string;
  defaultModality?: string;
  autoEmbed?: boolean;
  dryRun?: boolean;
};

export async function importLibraryFile(
  filename: string,
  content: string,
  options: ImportOptions,
): Promise<ImportProgress> {
  const admin = await requireAdmin();

  const progress: ImportProgress = {
    total: 0,
    parsed: 0,
    translated: 0,
    embedded: 0,
    saved: 0,
    duplicates: 0,
    errors: [],
  };

  // 1. Parse
  const parseResult = parseFileContent(filename, content);
  progress.errors.push(...parseResult.errors);
  progress.parsed = parseResult.items.length;
  progress.total = parseResult.items.length + parseResult.skipped;

  if (parseResult.items.length === 0) return progress;
  if (options.dryRun) return progress;

  // 2. Process each item
  for (const item of parseResult.items) {
    try {
      let promptText = item.prompt.trim();
      if (promptText.length < 5) { progress.errors.push("Skipped: too short"); continue; }

      // Language detection + translation
      const { lang } = detectLanguage(promptText);
      if (lang !== "en") {
        const result = await translateToEnglish(promptText, lang);
        if (!result.skipped) {
          promptText = result.translated;
          progress.translated++;
        }
      }

      // Dedup check
      const hash = computePromptHash(promptText);
      const existing = await findExistingByHash(hash);
      if (existing) { progress.duplicates++; continue; }

      // Determine modality
      const modality = normalizeModality(item.modality ?? options.defaultModality ?? "text");

      // Save to DB
      const exemplar = await db.promptExemplar.create({
        data: {
          source: options.sourceLabel,
          sourceId: item.sourceId ?? null,
          sourceFile: filename,
          modality,
          subCategory: item.subCategory ?? null,
          intentTags: item.intentTags ?? [],
          language: "en",
          title: item.title ?? null,
          prompt: promptText,
          expectedOutput: item.expectedOutput ?? null,
          promptHash: hash,
          contentLength: promptText.length,
          status: "REVIEW",
        },
      });
      progress.saved++;

      // Auto-embed if enabled
      if (options.autoEmbed) {
        const emb = await embedText(promptText);
        if (emb) {
          await saveEmbedding(exemplar.id, emb);
          progress.embedded++;
        }
      }
    } catch (e) {
      progress.errors.push(`Item error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await writeAudit({ actorId: admin.id, action: "library.import", targetType: "promptExemplar", meta: { filename, source: options.sourceLabel, saved: progress.saved, duplicates: progress.duplicates, errors: progress.errors.length } });
  revalidatePath("/pr/yonet/library");
  revalidatePath("/pr/yonet/library/import");
  return progress;
}

export async function getLibraryStats() {
  await requireAdmin();
  const [total, byStatus, byModality] = await Promise.all([
    db.promptExemplar.count(),
    db.promptExemplar.groupBy({ by: ["status"], _count: true }),
    db.promptExemplar.groupBy({ by: ["modality"], _count: true }),
  ]);
  return { total, byStatus, byModality };
}

function normalizeModality(raw: string): string {
  const m = raw.toLowerCase().trim();
  const MAP: Record<string, string> = {
    text: "text", writing: "text", chat: "text", assistant: "text",
    image: "image", photo: "image", picture: "image", art: "image",
    video: "video", animation: "video",
    audio: "audio", music: "audio", voice: "audio",
    code: "code", programming: "code", coding: "code",
  };
  return MAP[m] ?? "text";
}
