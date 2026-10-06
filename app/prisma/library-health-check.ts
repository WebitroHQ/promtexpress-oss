/**
 * Comprehensive prompt library health & quality audit.
 * Read-only. Produces a single consolidated report.
 *
 * Sections:
 *  1. Volume & integrity
 *  2. Quality score distribution
 *  3. Length distribution
 *  4. Modality / status / language / source breakdown
 *  5. Embedding status
 *  6. Pollution check
 *  7. Functional integrity (required fields, hash uniqueness)
 *  8. Recently modified rows
 *  9. Anomaly detection (outliers, suspect content)
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const sec = (label: string) => {
  console.log(`\n${"━".repeat(70)}`);
  console.log(`  ${label}`);
  console.log("━".repeat(70));
};

async function main() {
  console.log("PROMPT LIBRARY HEALTH & QUALITY AUDIT");
  console.log("Generated:", new Date().toISOString());

  // ── 1. Volume & integrity ─────────────────────────────────────────────────
  sec("1. VOLUME & INTEGRITY");
  const total = await db.promptExemplar.count();
  const withTitle = await db.promptExemplar.count({ where: { title: { not: null } } });
  const withScore = await db.promptExemplar.count({ where: { qualityScore: { not: null } } });
  const withSourceId = await db.promptExemplar.count({ where: { sourceId: { not: null } } });
  const empty = await db.promptExemplar.count({ where: { contentLength: 0 } });
  const tooShort = await db.promptExemplar.count({ where: { contentLength: { lt: 100 } } });
  const tooLong = await db.promptExemplar.count({ where: { contentLength: { gt: 50000 } } });

  console.log(`  Total prompts        : ${total.toLocaleString()}`);
  console.log(`  With title           : ${withTitle.toLocaleString()} (${((withTitle/total)*100).toFixed(1)}%)`);
  console.log(`  With qualityScore    : ${withScore.toLocaleString()} (${((withScore/total)*100).toFixed(1)}%)`);
  console.log(`  With sourceId        : ${withSourceId.toLocaleString()} (${((withSourceId/total)*100).toFixed(1)}%)`);
  console.log(`  Empty (length=0)     : ${empty}`);
  console.log(`  <100 chars           : ${tooShort}`);
  console.log(`  >50,000 chars        : ${tooLong}`);

  // ── 2. Quality score distribution ────────────────────────────────────────
  sec("2. QUALITY SCORE DISTRIBUTION");
  const scoreDist = await db.$queryRaw<{ s: number; count: bigint; avg_len: number }[]>`
    SELECT "qualityScore" AS s, COUNT(*)::bigint AS count, AVG("contentLength")::int AS avg_len
    FROM "PromptExemplar"
    GROUP BY "qualityScore" ORDER BY "qualityScore" DESC NULLS LAST
  `;
  for (const r of scoreDist) {
    const label = r.s === null ? "null " : `${r.s}    `;
    const bar = "█".repeat(Math.round(Number(r.count) / total * 50));
    console.log(`  ${label} ${String(r.count).padStart(5)}  avg ${String(r.avg_len).padStart(5)}c  ${bar}`);
  }

  // ── 3. Length distribution ───────────────────────────────────────────────
  sec("3. LENGTH DISTRIBUTION");
  const lenBins = await db.$queryRaw<{ bucket: string; count: bigint }[]>`
    SELECT bucket, COUNT(*)::bigint AS count FROM (
      SELECT CASE
        WHEN "contentLength" < 200        THEN '0  <200'
        WHEN "contentLength" < 500        THEN '1  200-500'
        WHEN "contentLength" < 1000       THEN '2  500-1000'
        WHEN "contentLength" < 2500       THEN '3  1k-2.5k'
        WHEN "contentLength" < 5000       THEN '4  2.5k-5k'
        WHEN "contentLength" < 15000      THEN '5  5k-15k'
        WHEN "contentLength" < 50000      THEN '6  15k-50k'
        ELSE                                    '7  50k+'
      END AS bucket
      FROM "PromptExemplar"
    ) AS s GROUP BY bucket ORDER BY bucket
  `;
  for (const r of lenBins) {
    const bar = "█".repeat(Math.round(Number(r.count) / total * 50));
    console.log(`  ${r.bucket.slice(3).padEnd(10)} ${String(r.count).padStart(5)}  ${bar}`);
  }

  // ── 4. Modality / status / language ──────────────────────────────────────
  sec("4. MODALITY / STATUS / LANGUAGE");
  const modal = await db.promptExemplar.groupBy({
    by: ["modality"], _count: { _all: true }, orderBy: { _count: { modality: "desc" } },
  });
  console.log("  By modality:");
  for (const r of modal) console.log(`    ${r.modality.padEnd(10)} ${r._count._all}`);

  const status = await db.promptExemplar.groupBy({
    by: ["status"], _count: { _all: true },
  });
  console.log("\n  By status:");
  for (const r of status) console.log(`    ${r.status.padEnd(10)} ${r._count._all}`);

  const lang = await db.promptExemplar.groupBy({
    by: ["language"], _count: { _all: true }, orderBy: { _count: { language: "desc" } },
  });
  console.log("\n  By language (top 8):");
  for (const r of lang.slice(0, 8)) console.log(`    ${r.language.padEnd(8)} ${r._count._all}`);

  // ── 5. Source breakdown ──────────────────────────────────────────────────
  sec("5. SOURCE BREAKDOWN");
  const sources = await db.$queryRaw<{ source: string; count: bigint; avg_score: number; avg_len: number }[]>`
    SELECT source, COUNT(*)::bigint AS count,
           AVG("qualityScore")::numeric(3,1) AS avg_score,
           AVG("contentLength")::int AS avg_len
    FROM "PromptExemplar"
    GROUP BY source ORDER BY COUNT(*) DESC LIMIT 12
  `;
  for (const r of sources) {
    console.log(`  ${String(r.count).padStart(4)}  s=${r.avg_score}  ${String(r.avg_len).padStart(5)}c  ${r.source.slice(0, 60)}`);
  }

  // ── 6. Embedding status ──────────────────────────────────────────────────
  sec("6. EMBEDDING STATUS");
  const embedded = await db.promptExemplar.count({ where: { embeddedAt: { not: null } } });
  const unembedded = total - embedded;
  console.log(`  Embedded             : ${embedded} (${((embedded/total)*100).toFixed(1)}%)`);
  console.log(`  Un-embedded          : ${unembedded} (${((unembedded/total)*100).toFixed(1)}%)`);
  if (embedded > 0) {
    const models = await db.promptExemplar.groupBy({
      by: ["embeddingModel"], _count: { _all: true },
    });
    console.log("\n  By embedding model:");
    for (const r of models) console.log(`    ${(r.embeddingModel ?? "null").padEnd(30)} ${r._count._all}`);
  }

  // ── 7. Pollution check ───────────────────────────────────────────────────
  sec("7. POLLUTION CHECK");
  const pollutionPatterns = [
    ["URLs (http/https/www)",                   `prompt ~* '(https?://|\\bwww\\.[a-z0-9])'`],
    ["Email addresses",                         `prompt ~* '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'`],
    ["HTML tags",                                `prompt ~ '<(img|a|div|span|p|h[1-6])\\b'`],
    ["Markdown links",                           `prompt ~ '\\[[^\\]]+\\]\\([^)]+\\)'`],
    ["GPT URL meta",                             `prompt LIKE 'GPT URL:%'`],
    ["Author tag",                               `prompt ~* '\\nAuthor:\\s'`],
    ["GitHub-style file refs",                   `prompt ~ '/(src|app|lib|components|pages)/[a-zA-Z0-9_./-]+\\.(py|ts|js|tsx|jsx|md|json)'`],
    ["Twitter handles",                          `prompt ~ '\\s@[a-zA-Z0-9_]{3,}\\b'`],
    ["Hashtags",                                 `prompt ~ '\\s#[a-zA-Z][a-zA-Z0-9_]{2,}'`],
    ["Phone numbers",                            `prompt ~ '(\\+?\\d{1,3}[-.\\s]?)?\\(?\\d{3}\\)?[-.\\s]\\d{3}[-.\\s]\\d{4}'`],
  ] as const;
  for (const [label, expr] of pollutionPatterns) {
    const r = await db.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint AS count FROM "PromptExemplar" WHERE ${expr}`,
    );
    console.log(`  ${String(r[0].count).padStart(4)}  ${label}`);
  }
  const anyPattern = pollutionPatterns.map(([, e]) => `(${e})`).join(" OR ");
  const anyR = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM "PromptExemplar" WHERE ${anyPattern}`,
  );
  console.log(`\n  ANY pollution        : ${anyR[0].count} (${(Number(anyR[0].count)/total*100).toFixed(1)}%)`);

  // ── 8. Functional integrity ──────────────────────────────────────────────
  sec("8. FUNCTIONAL INTEGRITY");
  const hashCheck = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT "promptHash", COUNT(*) AS c
      FROM "PromptExemplar" GROUP BY "promptHash" HAVING COUNT(*) > 1
    ) dups
  `;
  console.log(`  Duplicate promptHash : ${hashCheck[0].count} (must be 0; unique constraint)`);

  const lenMismatch = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "PromptExemplar"
    WHERE "contentLength" != LENGTH(prompt)
  `;
  console.log(`  contentLength drift  : ${lenMismatch[0].count} (rows where stored length != actual length)`);

  const orphaned = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "PromptExemplar"
    WHERE "targetEngineId" IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM "TargetEngine" t WHERE t.id = "PromptExemplar"."targetEngineId")
  `;
  console.log(`  Orphaned targetEngine: ${orphaned[0].count}`);

  const cleanedRecords = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "PromptExemplar"
    WHERE "qualityBreakdown" ->> 'sanitizedAt' IS NOT NULL
      OR "qualityBreakdown" ->> 'regexStrippedAt' IS NOT NULL
  `;
  console.log(`  Cleaned by sanitizer : ${cleanedRecords[0].count}`);

  // ── 9. Anomalies ─────────────────────────────────────────────────────────
  sec("9. ANOMALIES & OUTLIERS");
  const minScore = await db.promptExemplar.aggregate({
    _min: { qualityScore: true }, _max: { qualityScore: true },
    _avg: { qualityScore: true, contentLength: true },
  });
  console.log(`  qualityScore range   : ${minScore._min.qualityScore} – ${minScore._max.qualityScore}`);
  console.log(`  qualityScore avg     : ${minScore._avg.qualityScore?.toFixed(2)}`);
  console.log(`  contentLength avg    : ${minScore._avg.contentLength?.toFixed(0)}c`);

  // Suspicious — score ≥ 8 but length < 200 (too short to be engineered)
  const suspectShort = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "PromptExemplar"
    WHERE "qualityScore" >= 8 AND "contentLength" < 200
  `;
  console.log(`  high-score but short : ${suspectShort[0].count} (s≥8 yet <200 chars — review)`);

  // Score == null shouldn't exist after curation
  const ungraded = await db.promptExemplar.count({ where: { qualityScore: null } });
  console.log(`  Ungraded             : ${ungraded}`);

  // Top 3 longest prompts (sanity check — production system prompts can be huge)
  console.log("\n  Top 3 longest prompts:");
  const longest = await db.$queryRaw<{ sourceId: string; source: string; len: number; score: number; head: string }[]>`
    SELECT "sourceId", source, "contentLength" AS len, "qualityScore" AS score, LEFT(prompt, 80) AS head
    FROM "PromptExemplar" ORDER BY "contentLength" DESC LIMIT 3
  `;
  for (const r of longest) {
    console.log(`    ${String(r.len).padStart(6)}c  s=${r.score}  ${(r.sourceId ?? "no-id").slice(0, 30)}`);
    console.log(`           "${r.head.replace(/\s+/g, " ").slice(0, 70)}"`);
  }

  // Top 3 highest-scoring shortest
  console.log("\n  Top 3 highest-scoring (s=10):");
  const top10 = await db.$queryRaw<{ sourceId: string; source: string; len: number; head: string }[]>`
    SELECT "sourceId", source, "contentLength" AS len, LEFT(prompt, 100) AS head
    FROM "PromptExemplar" WHERE "qualityScore" = 10
    ORDER BY random() LIMIT 3
  `;
  for (const r of top10) {
    console.log(`    ${String(r.len).padStart(6)}c  ${(r.sourceId ?? "no-id").slice(0, 30)}  ${r.source.slice(0, 30)}`);
    console.log(`           "${r.head.replace(/\s+/g, " ").slice(0, 90)}"`);
  }

  console.log(`\n${"━".repeat(70)}\n  AUDIT COMPLETE\n${"━".repeat(70)}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
