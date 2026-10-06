/**
 * Profile the PromptExemplar table to identify low-quality candidates
 * for deletion. Read-only — outputs evidence for the admin to approve
 * specific deletion criteria before any destructive action runs.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const total = await db.promptExemplar.count();
  console.log(`Total exemplars: ${total.toLocaleString()}\n`);

  // ── 1. Length distribution ──────────────────────────────────────────────
  console.log("=== contentLength distribution ===");
  const lenBins = await db.$queryRaw<{ bucket: string; count: bigint }[]>`
    SELECT bucket, COUNT(*)::bigint AS count FROM (
      SELECT CASE
        WHEN "contentLength" = 0           THEN '0001  empty'
        WHEN "contentLength" < 20          THEN '0002  <20'
        WHEN "contentLength" < 40          THEN '0003  20-40'
        WHEN "contentLength" < 80          THEN '0004  40-80'
        WHEN "contentLength" < 150         THEN '0005  80-150'
        WHEN "contentLength" < 300         THEN '0006  150-300'
        WHEN "contentLength" < 600         THEN '0007  300-600'
        WHEN "contentLength" < 1500        THEN '0008  600-1500'
        WHEN "contentLength" < 5000        THEN '0009  1500-5000'
        ELSE                                    '0010  5000+'
      END AS bucket
      FROM "PromptExemplar"
    ) AS s GROUP BY bucket ORDER BY bucket
  `;
  for (const r of lenBins) {
    const pct = ((Number(r.count) / total) * 100).toFixed(1);
    console.log(`  ${r.bucket.slice(6).padEnd(12)} ${r.count.toString().padStart(7)}  (${pct}%)`);
  }

  // ── 2. Top sources ──────────────────────────────────────────────────────
  console.log("\n=== Top 25 sources ===");
  const sources = await db.$queryRaw<{ source: string; count: bigint; avg_len: number }[]>`
    SELECT source, COUNT(*)::bigint AS count, AVG("contentLength")::int AS avg_len
    FROM "PromptExemplar" GROUP BY source ORDER BY COUNT(*) DESC LIMIT 25
  `;
  for (const r of sources) {
    console.log(
      `  ${r.count.toString().padStart(6)}  avg ${String(r.avg_len).padStart(5)}c  ${r.source.slice(0, 90)}`,
    );
  }

  // ── 3. oasst1 / dataset noise detection ─────────────────────────────────
  console.log("\n=== Likely-noise sources (datasets, not curated prompts) ===");
  const noise = await db.$queryRaw<{ pattern: string; count: bigint }[]>`
    SELECT pattern, COUNT(*)::bigint AS count FROM (
      SELECT CASE
        WHEN source ILIKE '%oasst1%'          THEN 'oasst1 (OpenAssistant Q&A pairs)'
        WHEN title  ILIKE 'oasst1 (%'         THEN 'oasst1 (title prefix)'
        WHEN source ILIKE '%alpaca%'          THEN 'alpaca dataset'
        WHEN source ILIKE '%dolly%'           THEN 'dolly dataset'
        WHEN title  ILIKE 'Custom GPT%'       THEN 'Custom GPT (GPT Store description, often not a prompt)'
        WHEN prompt ILIKE 'GPT URL: %'        THEN 'GPT URL header (Custom GPT meta block)'
        ELSE                                       'other'
      END AS pattern
      FROM "PromptExemplar"
    ) s WHERE pattern <> 'other' GROUP BY pattern ORDER BY COUNT(*) DESC
  `;
  for (const r of noise) {
    console.log(`  ${r.count.toString().padStart(6)}  ${r.pattern}`);
  }

  // ── 4. Modality ─────────────────────────────────────────────────────────
  console.log("\n=== modality ===");
  const modal = await db.promptExemplar.groupBy({
    by: ["modality"],
    _count: { _all: true },
  });
  for (const r of modal) console.log(`  ${r.modality.padEnd(10)} ${r._count._all}`);

  // ── 5. Status ───────────────────────────────────────────────────────────
  console.log("\n=== status ===");
  const stat = await db.promptExemplar.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  for (const r of stat) console.log(`  ${r.status.padEnd(10)} ${r._count._all}`);

  // ── 6. Sample short prompts ─────────────────────────────────────────────
  console.log("\n=== Random sample of contentLength < 40 (look — are these real prompts?) ===");
  const shorts = await db.$queryRaw<
    { sourceId: string; len: number; prompt: string }[]
  >`
    SELECT "sourceId", "contentLength" AS len, prompt
    FROM "PromptExemplar" WHERE "contentLength" < 40
    ORDER BY random() LIMIT 15
  `;
  for (const r of shorts) {
    console.log(`  [${r.sourceId}] ${String(r.len).padStart(3)}c  "${r.prompt.replace(/\s+/g, " ")}"`);
  }

  // ── 7. Sample oasst1 ────────────────────────────────────────────────────
  console.log("\n=== Random sample of oasst1 rows (these are usually user-Q, not prompts) ===");
  const oasst = await db.$queryRaw<
    { sourceId: string; len: number; title: string; prompt: string }[]
  >`
    SELECT "sourceId", "contentLength" AS len, COALESCE(title, '') AS title, prompt
    FROM "PromptExemplar" WHERE source ILIKE '%oasst1%' OR title ILIKE 'oasst1%'
    ORDER BY random() LIMIT 8
  `;
  for (const r of oasst) {
    const head = r.prompt.replace(/\s+/g, " ").slice(0, 90);
    console.log(`  [${r.sourceId}] ${r.len}c  ${head}…`);
  }

  // ── 8. Sample Custom GPT (GPT Store entries) ────────────────────────────
  console.log("\n=== Random sample of 'Custom GPT' / 'GPT URL:' rows ===");
  const gpts = await db.$queryRaw<
    { sourceId: string; len: number; prompt: string }[]
  >`
    SELECT "sourceId", "contentLength" AS len, prompt
    FROM "PromptExemplar"
    WHERE title ILIKE 'Custom GPT%' OR prompt ILIKE 'GPT URL: %'
    ORDER BY random() LIMIT 8
  `;
  for (const r of gpts) {
    const head = r.prompt.replace(/\s+/g, " ").slice(0, 90);
    console.log(`  [${r.sourceId}] ${r.len}c  ${head}…`);
  }

  // ── 9. Combined "obvious garbage" candidate count ───────────────────────
  console.log("\n=== Proposed delete candidates (additive) ===");
  const candidates: Array<[string, string]> = [
    ['empty (contentLength=0)',           `"contentLength" = 0`],
    ['<40 chars (likely fragments)',      `"contentLength" < 40`],
    ['oasst1 dataset',                    `(source ILIKE '%oasst1%' OR title ILIKE 'oasst1%')`],
    ['Custom GPT meta blocks',            `(title ILIKE 'Custom GPT%' OR prompt ILIKE 'GPT URL: %')`],
    ['<80 chars',                         `"contentLength" < 80`],
    ['<150 chars',                        `"contentLength" < 150`],
  ];
  for (const [label, where] of candidates) {
    const r = await db.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint AS count FROM "PromptExemplar" WHERE ${where}`,
    );
    const c = Number(r[0].count);
    console.log(`  ${String(c).padStart(6)}  ${label}`);
  }

  // ── 10. Combined union — what we'd delete with all the rules above ─────
  const union = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "PromptExemplar"
    WHERE
      "contentLength" < 80
      OR (source ILIKE '%oasst1%' OR title ILIKE 'oasst1%')
      OR (title ILIKE 'Custom GPT%' OR prompt ILIKE 'GPT URL: %')
  `;
  console.log(
    `\n>>> Union of {<80 chars OR oasst1 OR Custom-GPT}: ${Number(union[0].count).toLocaleString()} rows would be deleted (${
      ((Number(union[0].count) / total) * 100).toFixed(1)
    }%)`,
  );
  console.log(
    `>>> Survivors:                                     ${(total - Number(union[0].count)).toLocaleString()} rows`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
