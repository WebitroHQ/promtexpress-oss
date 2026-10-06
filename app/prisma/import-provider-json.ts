/**
 * Import provider prompt-library JSON files (Anthropic, OpenAI, Google, etc.)
 * into PromptExemplar.
 *
 * Run: pnpm tsx prisma/import-provider-json.ts <file1.json> [file2.json …]
 *
 * Each JSON file must be an ARRAY whose elements look like:
 *   {
 *     "title":       "Cosmic Keystrokes",
 *     "prompt":      "<full prompt text>",
 *     "modality":    "text" | "image" | "code" | "audio" | "video",
 *     "subCategory": "Code & development",
 *     "source":      "Anthropic Prompt Library",
 *     "sourceId":    "cosmic-keystrokes",
 *     "language":    "en"
 *   }
 *
 * Behaviour:
 *   - SHA-256 of the prompt text → unique promptHash, dedup is automatic.
 *   - Rows are inserted in batches with skipDuplicates so we never collide
 *     with the existing 5,589 curated rows.
 *   - sourceFile is set to the JSON filename so we can attribute / roll
 *     back later.
 *   - status defaults to REVIEW just like the original import path.
 */

import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { basename } from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type Incoming = {
  title?: string;
  prompt: string;
  modality?: string;
  subCategory?: string;
  source?: string;
  sourceId?: string;
  language?: string;
  intentTags?: string[];
};

const VALID_MODALITIES = new Set(["text", "image", "video", "audio", "code"]);
function toModality(raw: string | undefined): string {
  if (!raw) return "text";
  const lower = raw.trim().toLowerCase();
  return VALID_MODALITIES.has(lower) ? lower : "text";
}

function promptHash(text: string): string {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

async function importFile(path: string) {
  if (!existsSync(path)) {
    console.error(`  ❌ ${path} — not found`);
    return;
  }
  const raw = readFileSync(path, "utf8");
  let parsed: Incoming[];
  try {
    parsed = JSON.parse(raw) as Incoming[];
  } catch (e) {
    console.error(`  ❌ ${path} — invalid JSON: ${(e as Error).message}`);
    return;
  }
  if (!Array.isArray(parsed)) {
    console.error(`  ❌ ${path} — root must be an array`);
    return;
  }
  const sourceFile = basename(path);
  console.log(`\n=== ${sourceFile} (${parsed.length} candidates) ===`);

  const rows = parsed
    .filter((p) => p && typeof p.prompt === "string" && p.prompt.trim().length >= 30)
    .map((p) => ({
      source: p.source ?? sourceFile,
      sourceId: p.sourceId ?? null,
      sourceFile,
      modality: toModality(p.modality),
      subCategory: p.subCategory ?? null,
      intentTags: p.intentTags ?? [],
      language: p.language?.trim() || "en",
      title: p.title?.trim() || null,
      prompt: p.prompt.trim(),
      promptHash: promptHash(p.prompt),
      contentLength: p.prompt.trim().length,
      status: "REVIEW" as const,
    }));

  console.log(`  After filter (prompt >= 30 chars): ${rows.length}`);
  if (rows.length === 0) return;

  const BATCH = 200;
  let inserted = 0;
  let duplicates = 0;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    const result = await db.promptExemplar.createMany({
      data: batch,
      skipDuplicates: true,
    });
    inserted += result.count;
    duplicates += batch.length - result.count;
  }
  console.log(`  Inserted     : ${inserted}`);
  console.log(`  Skipped (dup): ${duplicates}`);
}

async function main() {
  const files = process.argv.slice(2);
  if (files.length === 0) {
    console.error(
      "Usage: pnpm tsx prisma/import-provider-json.ts <file1.json> [file2.json …]",
    );
    process.exit(1);
  }

  const before = await db.promptExemplar.count();
  console.log(`Rows before: ${before.toLocaleString()}`);

  for (const f of files) {
    await importFile(f);
  }

  const after = await db.promptExemplar.count();
  console.log(`\nRows after : ${after.toLocaleString()}`);
  console.log(`Net added  : ${(after - before).toLocaleString()}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
