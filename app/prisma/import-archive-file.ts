/**
 * Generic PxArchive importer → PromptExemplar table
 * Run: pnpm tsx prisma/import-archive-file.ts <filename.md>
 *
 * - Parses PromtExpress PxArchive format (### [P-XXXXX] headings)
 * - SHA-256 dedup via unique promptHash index (skipDuplicates)
 * - Batch insert for efficiency
 * - Only prompt content is stored — no meta noise
 * - Language metadata mapped to ISO codes; falls back to "en" when unknown.
 *   Real detection/translation happens via the admin translate-engine
 *   pipeline (manual trigger).
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const ROOT = join(__dirname, "..");
const SOURCE_FILE = process.argv[2];
if (!SOURCE_FILE) {
  console.error("Usage: pnpm tsx prisma/import-archive-file.ts <filename.md>");
  process.exit(1);
}
const FILE_PATH = join(ROOT, "adsız klasör", SOURCE_FILE);

// ── Language code map (native + English names → ISO 639) ─────────────────────
const LANG_MAP: Record<string, string> = {
  // English → en
  english: "en",
  // Spanish → es
  spanish: "es",
  español: "es",
  // Indonesian → id
  indonesian: "id",
  "bahasa indonesia": "id",
  // Turkish → tr
  turkish: "tr",
  türkçe: "tr",
  // Korean → ko
  korean: "ko",
  "한국어": "ko",
  // French → fr
  french: "fr",
  français: "fr",
  // Japanese → ja
  japanese: "ja",
  "日本語": "ja",
  // Russian → ru
  russian: "ru",
  "русский": "ru",
  // Irish → ga
  irish: "ga",
  // German → de
  german: "de",
  deutsch: "de",
  // Italian → it
  italian: "it",
  italiano: "it",
  // Portuguese → pt
  portuguese: "pt",
  português: "pt",
  // Arabic → ar
  arabic: "ar",
  "العربية": "ar",
  // Catalan → ca
  catalan: "ca",
  català: "ca",
  // Portuguese (BR) → pt-BR
  "portuguese (br)": "pt-BR",
  "português (br)": "pt-BR",
  // Hindi → hi
  hindi: "hi",
  "हिन्दी": "hi",
  // Vietnamese → vi
  vietnamese: "vi",
  "tiếng việt": "vi",
  // Northern Sotho → nso
  "northern sotho": "nso",
  // Somali → so
  somali: "so",
  soomaali: "so",
  // Dutch → nl
  dutch: "nl",
  nederlands: "nl",
  // Chinese → zh
  chinese: "zh",
  "中文": "zh",
  // Polish → pl
  polish: "pl",
  polski: "pl",
  // Lithuanian → lt
  lithuanian: "lt",
  lietuvių: "lt",
  // Malay → ms
  malay: "ms",
  "malay (standard)": "ms",
  "bahasa melayu (standart)": "ms",
  "bahasa melayu": "ms",
  // Shona → sn
  shona: "sn",
  // Finnish → fi
  finnish: "fi",
  suomi: "fi",
  // Swedish → sv
  swedish: "sv",
  svenska: "sv",
  // Ukrainian → uk
  ukrainian: "uk",
  "українська": "uk",
  // Cebuano → ceb
  cebuano: "ceb",
  // Chinese (Simplified) → zh-CN
  "chinese (simplified)": "zh-CN",
  "中文 (简体)": "zh-CN",
  // Egyptian Arabic → arz
  "egyptian arabic": "arz",
  // Basque → eu
  basque: "eu",
  // Danish → da
  danish: "da",
  dansk: "da",
  // Hungarian → hu
  hungarian: "hu",
  magyar: "hu",
  // Sundanese → su
  sundanese: "su",
  // Zulu → zu
  zulu: "zu",
  isizulu: "zu",
  // Thai → th
  thai: "th",
  "ไทย": "th",
  // Hausa → ha
  hausa: "ha",
  // Greek → el
  greek: "el",
  "ελληνικά": "el",
  // Nepali → ne
  nepali: "ne",
  "नेपाली": "ne",
  // Tagalog → tl
  tagalog: "tl",
  // Igbo → ig
  igbo: "ig",
  // Najdi Arabic → ars
  "najdi arabic": "ars",
  // Sindhi → sd
  sindhi: "sd",
  // Javanese → jv
  javanese: "jv",
  // Xhosa → xh
  xhosa: "xh",
  isixhosa: "xh",
  // Burmese → my
  burmese: "my",
  "မြန်မာ": "my",
  // Swahili → sw
  swahili: "sw",
  kiswahili: "sw",
};

function toLangCode(raw: string | undefined): string {
  if (!raw) return "en";
  const key = raw.trim().toLowerCase();
  return LANG_MAP[key] ?? "en";
}

// ── Modality normalization ────────────────────────────────────────────────────
const VALID_MODALITIES = new Set(["text", "image", "video", "audio", "code"]);
function toModality(raw: string | undefined): string {
  if (!raw) return "text";
  const lower = raw.trim().toLowerCase();
  if (VALID_MODALITIES.has(lower)) return lower;
  return "text";
}

// ── Hash ──────────────────────────────────────────────────────────────────────
function promptHash(text: string): string {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

// ── PxArchive parser ──────────────────────────────────────────────────────────
function metaField(body: string, field: string): string | undefined {
  const re = new RegExp(`\\*\\*${field}:\\*\\*\\s*([^\\n]+)`);
  const m = body.match(re);
  if (!m) return undefined;
  return m[1].replace(/`([^`]+)`/g, "$1").trim() || undefined;
}

type ParsedPrompt = {
  title: string | undefined;
  promptText: string;
  modality: string;
  subCategory: string | undefined;
  language: string;
  source: string;
  sourceId: string | undefined;
};

function parsePxArchive(content: string): ParsedPrompt[] {
  const results: ParsedPrompt[] = [];
  const headingRe = /^###\s+(\[P-\d+\][^\n]*)/gm;
  const matches = [...content.matchAll(headingRe)];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const heading = match[1].trim();
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd = matches[i + 1]?.index ?? content.length;
    const body = content.slice(bodyStart, bodyEnd);

    const codeMatch = body.match(/```[^\n]*\n([\s\S]*?)```/);
    if (!codeMatch || codeMatch[1].trim().length < 10) continue;
    const promptText = codeMatch[1].trim();

    const idMatch = heading.match(/^\[P-(\d+)\]\s*(.*)/);
    const sourceId = idMatch ? `P-${idMatch[1]}` : undefined;
    const title = idMatch ? idMatch[2].trim() || undefined : heading || undefined;

    results.push({
      title,
      promptText,
      modality: toModality(metaField(body, "Modality")),
      subCategory: metaField(body, "Category"),
      language: toLangCode(metaField(body, "Language")),
      source: metaField(body, "Source") ?? SOURCE_FILE,
      sourceId,
    });
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`Reading ${FILE_PATH} …`);
  const content = readFileSync(FILE_PATH, "utf8");

  console.log("Parsing prompts …");
  const parsed = parsePxArchive(content);
  console.log(`  Parsed: ${parsed.length}`);

  const rows = parsed.map((p) => ({
    source: p.source,
    sourceId: p.sourceId,
    sourceFile: SOURCE_FILE,
    modality: p.modality,
    subCategory: p.subCategory,
    intentTags: [] as string[],
    language: p.language,
    title: p.title,
    prompt: p.promptText,
    promptHash: promptHash(p.promptText),
    contentLength: p.promptText.length,
    status: "REVIEW" as const,
  }));

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
    process.stdout.write(
      `\r  Progress: ${Math.min(i + BATCH, rows.length)}/${rows.length} — inserted ${inserted}, duplicates ${duplicates}`,
    );
  }

  console.log("\nDone.");
  console.log(`  Total parsed : ${rows.length}`);
  console.log(`  Inserted     : ${inserted}`);
  console.log(`  Skipped(dup) : ${duplicates}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
