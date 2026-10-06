/**
 * AI prompt sanitizer.
 *
 * Goal: remove metadata / attribution noise from each prompt while
 * preserving role definitions, instructions, and functional content.
 * Runs only against rows flagged as "polluted" by the profiler.
 *
 * Resumable: writes a marker `qualityBreakdown.sanitizedAt` so re-runs
 * skip already-cleaned rows.
 *
 * Run:
 *   pnpm tsx prisma/sanitize-prompts.ts             # full pass
 *   pnpm tsx prisma/sanitize-prompts.ts --sample 20 # spot-check first
 */

import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { decrypt } from "../src/lib/crypto";

const db = new PrismaClient();

const SYSTEM_PROMPT = [
  "You are a prompt sanitizer. The user message is a single prompt wrapped in <prompt>...</prompt> tags.",
  "Remove ONLY this kind of NOISE:",
  "  • Leading markdown title lines that are just identifiers (e.g. '# v0_20250306', '# anthropic-claude-sonnet-4.5_20251119').",
  "  • 'Source:' / 'source:' / 'Sources:' attribution lines and the URLs they reference.",
  "  • 'Author:' / 'Credits:' / 'Created by:' / 'By @username' attribution lines.",
  "  • Trailing copyright, GitHub repo links, or extraction metadata that are not part of the prompt's task.",
  "  • Standalone documentation links that are not used by the prompt's instructions.",
  "PRESERVE EVERYTHING ELSE:",
  "  • Role definitions ('You are X, created by Y') — these are FUNCTIONAL, keep them verbatim.",
  "  • Brand names that define what the prompt is for (e.g. 'You are Cursor IDE Agent', 'You are v0, Vercel's...').",
  "  • URLs/emails/phone numbers that the prompt instructs the AI to USE.",
  "  • Examples, structured content, code blocks, JSON/XML schemas, rules, constraints.",
  "  • Personal names that are part of role-play personas defined inside the prompt.",
  "OUTPUT: Return ONLY the cleaned prompt text. No explanations, no <prompt> tags, no preamble, no quotes.",
  "If there is NOTHING to clean (the prompt is already pure), return the input unchanged.",
].join(" ");


async function getEngine() {
  const engine = await db.aiEngine.findFirst({
    where: { provider: "deepseek", isActive: true, modelId: "deepseek-chat" },
  });
  if (!engine) throw new Error("No active deepseek-chat engine");
  if (!engine.encryptedKey) throw new Error("Engine has no key");
  return { ...engine, apiKey: decrypt(engine.encryptedKey) };
}


async function sanitizeOne(apiKey: string, model: string, text: string): Promise<string | null> {
  const userMsg = `<prompt>\n${text}\n</prompt>`;
  const maxTokens = Math.min(16384, Math.max(2048, Math.ceil(text.length * 1.2)));
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  const content: string = (data.choices?.[0]?.message?.content ?? "").trim();
  if (!content) return null;
  // Strip residual <prompt> tags if model echoed them.
  return content.replace(/^<prompt>\s*|\s*<\/prompt>$/g, "").trim();
}


// SQL filter for polluted rows
const POLLUTION_FILTER = `
  ("qualityBreakdown" ->> 'sanitizedAt' IS NULL)
  AND (
    prompt ~* '(https?://|\\bwww\\.[a-z0-9])'
    OR prompt ~* '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'
    OR prompt ~ '\\[[^\\]]+\\]\\([^)]+\\)'
    OR prompt ~* '^Author:\\s'
    OR prompt ~* '\\nAuthor:\\s'
    OR prompt ~ '/(src|app|lib|components|pages)/[a-zA-Z0-9_./-]+\\.(py|ts|js|tsx|jsx|md|json)'
    OR prompt LIKE 'GPT URL:%'
    OR prompt ~* '(my name is|I''m)\\s+[A-Z][a-zA-Z]{2,}\\s+[A-Z][a-zA-Z]{2,}'
    OR prompt ~ '\\s@[a-zA-Z0-9_]{3,}\\b'
    OR prompt ~ '\\s#[a-zA-Z][a-zA-Z0-9_]{2,}'
    OR prompt ~ '202[0-9]-[01][0-9]-[0-3][0-9]'
  )
`;


async function main() {
  const args = process.argv.slice(2);
  const sampleArgIdx = args.indexOf("--sample");
  const sampleSize = sampleArgIdx >= 0 ? parseInt(args[sampleArgIdx + 1] ?? "20", 10) : null;
  const dryRun = args.includes("--dry");

  const engine = await getEngine();
  console.log(`Engine: ${engine.name} (${engine.modelId})`);
  console.log(`Mode  : ${dryRun ? "DRY-RUN (no DB writes)" : "WRITE"}\n`);

  const limitClause = sampleSize ? `LIMIT ${sampleSize}` : "";
  const orderClause = sampleSize ? "ORDER BY random()" : `ORDER BY id`;

  type Row = {
    id: string;
    prompt: string;
    contentLength: number;
    sourceId: string | null;
    promptHash: string;
    qualityBreakdown: Record<string, unknown> | null;
  };
  const rows = (await db.$queryRawUnsafe(`
    SELECT id, prompt, "contentLength", "sourceId", "promptHash", "qualityBreakdown"
    FROM "PromptExemplar"
    WHERE ${POLLUTION_FILTER}
    ${orderClause}
    ${limitClause}
  `)) as Row[];

  console.log(`${rows.length} polluted rows to sanitize\n`);

  const startedAt = Date.now();
  let cleaned = 0;
  let unchanged = 0;
  let rejected = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const result = await sanitizeOne(engine.apiKey, engine.modelId, row.prompt);
      if (!result) {
        errors++;
        continue;
      }

      // Sanity: cleaned length must be at least 50% of original.
      // Otherwise the model probably destroyed the prompt — skip it.
      if (result.length < row.prompt.length * 0.5) {
        rejected++;
        if (sampleSize) {
          console.log(`  ✗ REJECTED [${(row.sourceId ?? row.id.slice(0,8))}] cleaned ${result.length}c < 50% of ${row.contentLength}c`);
        }
        continue;
      }

      const norm = result.trim();
      if (norm === row.prompt.trim()) {
        // Already pure — mark sanitizedAt anyway so we don't re-process.
        if (!dryRun) {
          await db.promptExemplar.update({
            where: { id: row.id },
            data: {
              qualityBreakdown: {
                ...(row.qualityBreakdown ?? {}),
                sanitizedAt: new Date().toISOString(),
                sanitizedDelta: 0,
              },
            },
          });
        }
        unchanged++;
        continue;
      }

      const newHash = createHash("sha256")
        .update(norm.trim().toLowerCase().replace(/\s+/g, " "), "utf8")
        .digest("hex");

      if (!dryRun) {
        // Hash collision check (rare but possible — another row already has this clean text)
        const collision = await db.promptExemplar.findUnique({
          where: { promptHash: newHash },
          select: { id: true },
        });
        if (collision && collision.id !== row.id) {
          // Drop this row — its cleaned form duplicates an existing entry.
          await db.promptExemplar.delete({ where: { id: row.id } });
        } else {
          await db.promptExemplar.update({
            where: { id: row.id },
            data: {
              prompt: norm,
              contentLength: norm.length,
              promptHash: newHash,
              qualityBreakdown: {
                ...(row.qualityBreakdown ?? {}),
                sanitizedAt: new Date().toISOString(),
                sanitizedDelta: row.contentLength - norm.length,
                originalContentLength: row.contentLength,
              },
            },
          });
        }
      }

      cleaned++;
      if (sampleSize) {
        const delta = row.contentLength - norm.length;
        console.log(`  ✓ [${(row.sourceId ?? row.id.slice(0,8)).slice(0, 35)}]  ${row.contentLength}c → ${norm.length}c  (-${delta}c)`);
      }

      if (cleaned % 25 === 0 && !sampleSize) {
        const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
        const rate = cleaned / Math.max(elapsedSec, 1);
        const remaining = rows.length - (cleaned + unchanged + rejected + errors);
        const etaMin = Math.round(remaining / Math.max(rate, 0.1) / 60);
        console.log(
          `  ${cleaned + unchanged + rejected + errors}/${rows.length}  cleaned ${cleaned}  unchanged ${unchanged}  rejected ${rejected}  err ${errors}  ETA ${etaMin}m`,
        );
      }
    } catch (e) {
      errors++;
      if (errors <= 3) console.error(`  error on ${row.id}: ${(e as Error).message}`);
    }
  }

  const totalSec = Math.round((Date.now() - startedAt) / 1000);
  console.log(`\nDone in ${totalSec}s.`);
  console.log(`  cleaned   : ${cleaned}`);
  console.log(`  unchanged : ${unchanged} (already pure)`);
  console.log(`  rejected  : ${rejected} (suspicious over-edit, skipped)`);
  console.log(`  errors    : ${errors}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
