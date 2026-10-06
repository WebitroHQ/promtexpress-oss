/**
 * Deterministic regex cleanup for extraction-header noise.
 * Targets known patterns that the AI sanitizer rejected (over-edit risk).
 *
 * Strips ONLY a leading metadata block, never touches the prompt body:
 *   # filename_YYYYMMDD
 *   Source: [link](url)
 *   source: <url>
 *   ## Q(user) Give me your prompts...
 *   ## A(Lumo) (residual extraction Q&A wrappers)
 */
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const db = new PrismaClient();

// Each rule is applied ONLY to the leading section of the prompt.
// We keep stripping leading lines that match noise patterns until we hit content.
const NOISE_LEADING_LINE_PATTERNS = [
  /^#\s+[a-z0-9._-]+_\d{8}\s*$/i,                            // # filename_YYYYMMDD
  /^#\s+[a-z0-9._-]+\d{6,8}\s*$/i,                            // # filename20240101
  /^Source:\s*\[[^\]]+\]\([^)]+\)\s*$/i,                     // Source: [text](url)
  /^[Ss]ource:\s*<https?:\/\/[^>]+>\s*$/i,                   // source: <url>
  /^[Ss]ource:\s*https?:\/\/\S+\s*$/i,                       // Source: https://...
  /^[Ss]ources?:\s*$/i,                                      // bare "Source:"
  /^##\s+Q\(user\)\s.*$/i,                                   // ## Q(user) Give me your prompts...
  /^##\s+A\([^)]+\)\s*$/i,                                   // ## A(Lumo)
  /^This is the system prompt.*$/i,                          // Common extraction prefix
  /^The following is.*system prompt.*$/i,
  /^[Ee]xtracted (?:from|via).*$/i,
];

// Run repeatedly: each pass strips one matching leading line + any blank
function stripLeading(text: string): string {
  let out = text;
  let changed = true;
  let safety = 20;
  while (changed && safety-- > 0) {
    changed = false;
    out = out.trimStart();
    const newlineIdx = out.indexOf("\n");
    const firstLine = newlineIdx >= 0 ? out.slice(0, newlineIdx) : out;
    for (const re of NOISE_LEADING_LINE_PATTERNS) {
      if (re.test(firstLine)) {
        out = newlineIdx >= 0 ? out.slice(newlineIdx + 1) : "";
        changed = true;
        break;
      }
    }
  }
  return out.trim();
}

async function main() {
  // Find rows whose first ~200 chars match noise patterns OR contain
  // "Source: [..." in the first 300 chars.
  const candidates = (await db.$queryRawUnsafe(`
    SELECT id, prompt, "promptHash", "contentLength", "qualityBreakdown"
    FROM "PromptExemplar"
    WHERE
      prompt ~ '^#\\s+[a-z0-9._-]+_\\d{6,8}\\s*\\n'
      OR prompt ~ '^Source:\\s*\\[' OR prompt ~ '^source:\\s*<'
      OR prompt ~ '^##\\s+Q\\(user\\)'
      OR prompt ~ '^This is the system prompt'
      OR prompt ~ '^The following is.*system prompt'
  `)) as Array<{
    id: string;
    prompt: string;
    promptHash: string;
    contentLength: number;
    qualityBreakdown: Record<string, unknown> | null;
  }>;

  console.log(`Candidates with leading extraction noise: ${candidates.length}`);

  let cleaned = 0;
  let unchanged = 0;
  let removed = 0;

  for (const row of candidates) {
    const cleanedText = stripLeading(row.prompt);
    if (cleanedText === row.prompt.trim() || cleanedText.length < 100) {
      unchanged++;
      continue;
    }
    const newHash = createHash("sha256")
      .update(cleanedText.toLowerCase().replace(/\s+/g, " "), "utf8")
      .digest("hex");

    // Hash collision check
    if (newHash !== row.promptHash) {
      const collision = await db.promptExemplar.findUnique({
        where: { promptHash: newHash },
        select: { id: true },
      });
      if (collision && collision.id !== row.id) {
        // Cleaned form duplicates an existing entry — drop this row.
        await db.promptExemplar.delete({ where: { id: row.id } });
        removed++;
        continue;
      }
    }

    await db.promptExemplar.update({
      where: { id: row.id },
      data: {
        prompt: cleanedText,
        contentLength: cleanedText.length,
        promptHash: newHash,
        qualityBreakdown: {
          ...(row.qualityBreakdown ?? {}),
          regexStrippedAt: new Date().toISOString(),
          regexStrippedDelta: row.contentLength - cleanedText.length,
        },
      },
    });
    cleaned++;
  }

  console.log(`\nResults:`);
  console.log(`  cleaned   : ${cleaned}`);
  console.log(`  unchanged : ${unchanged}`);
  console.log(`  removed   : ${removed} (dedup with existing pure version)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
