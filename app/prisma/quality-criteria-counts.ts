import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const RULES: Array<{ label: string; where: string }> = [
  { label: "A. Empty / near-empty (contentLength < 40)",      where: `"contentLength" < 40` },
  { label: "B. Hugging Face training datasets",                where: `source ILIKE 'huggingface.co/datasets/%'` },
  { label: "C. oasst1 / oasst2 (alt path / titles)",          where: `(source ILIKE '%oasst1%' OR source ILIKE '%oasst2%' OR title ILIKE 'oasst1%' OR title ILIKE 'oasst2%')` },
  { label: "D. Custom GPT URL metadata blocks (HTML)",         where: `prompt LIKE 'GPT URL: %'` },
  { label: "E. Short fragments (<80c) NOT in awesome-chatgpt", where: `"contentLength" < 80 AND source NOT ILIKE '%awesome-chatgpt-prompts%'` },
];

async function main() {
  const total = await db.promptExemplar.count();
  console.log(`Total: ${total.toLocaleString()}\n`);

  console.log("=== Per-rule candidate counts (overlapping) ===");
  for (const r of RULES) {
    const row = await db.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint AS count FROM "PromptExemplar" WHERE ${r.where}`,
    );
    console.log(`  ${String(row[0].count).padStart(6)}  ${r.label}`);
  }

  // Combined union — what we'd actually delete with rules A∪B∪C∪D
  const safeUnion = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "PromptExemplar"
    WHERE "contentLength" < 40
       OR source ILIKE 'huggingface.co/datasets/%'
       OR source ILIKE '%oasst1%' OR source ILIKE '%oasst2%' OR title ILIKE 'oasst1%' OR title ILIKE 'oasst2%'
       OR prompt LIKE 'GPT URL: %'
  `;
  console.log(
    `\n>>> Plan SAFE (A∪B∪C∪D):       ${Number(safeUnion[0].count).toLocaleString()} delete  /  ${(total - Number(safeUnion[0].count)).toLocaleString()} survive`,
  );

  const aggressive = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "PromptExemplar"
    WHERE "contentLength" < 40
       OR source ILIKE 'huggingface.co/datasets/%'
       OR source ILIKE '%oasst1%' OR source ILIKE '%oasst2%' OR title ILIKE 'oasst1%' OR title ILIKE 'oasst2%'
       OR prompt LIKE 'GPT URL: %'
       OR ("contentLength" < 80 AND source NOT ILIKE '%awesome-chatgpt-prompts%')
  `;
  console.log(
    `>>> Plan AGGRESSIVE (A∪B∪C∪D∪E): ${Number(aggressive[0].count).toLocaleString()} delete  /  ${(total - Number(aggressive[0].count)).toLocaleString()} survive`,
  );

  // Length distribution among survivors after SAFE plan
  console.log("\n=== Survivor length profile after Plan SAFE ===");
  const survivorBins = await db.$queryRaw<{ bucket: string; count: bigint }[]>`
    SELECT bucket, COUNT(*)::bigint AS count FROM (
      SELECT CASE
        WHEN "contentLength" < 80          THEN '0001  <80'
        WHEN "contentLength" < 150         THEN '0002  80-150'
        WHEN "contentLength" < 300         THEN '0003  150-300'
        WHEN "contentLength" < 600         THEN '0004  300-600'
        WHEN "contentLength" < 1500        THEN '0005  600-1500'
        WHEN "contentLength" < 5000        THEN '0006  1500-5000'
        ELSE                                    '0007  5000+'
      END AS bucket
      FROM "PromptExemplar"
      WHERE NOT (
        "contentLength" < 40
        OR source ILIKE 'huggingface.co/datasets/%'
        OR source ILIKE '%oasst1%' OR source ILIKE '%oasst2%' OR title ILIKE 'oasst1%' OR title ILIKE 'oasst2%'
        OR prompt LIKE 'GPT URL: %'
      )
    ) AS s GROUP BY bucket ORDER BY bucket
  `;
  for (const r of survivorBins) {
    console.log(`  ${r.bucket.slice(6).padEnd(12)} ${r.count}`);
  }

  // Top survivor sources
  console.log("\n=== Top 15 survivor sources after Plan SAFE ===");
  const topSurvivors = await db.$queryRaw<{ source: string; count: bigint; avg_len: number }[]>`
    SELECT source, COUNT(*)::bigint AS count, AVG("contentLength")::int AS avg_len
    FROM "PromptExemplar"
    WHERE NOT (
      "contentLength" < 40
      OR source ILIKE 'huggingface.co/datasets/%'
      OR source ILIKE '%oasst1%' OR source ILIKE '%oasst2%' OR title ILIKE 'oasst1%' OR title ILIKE 'oasst2%'
      OR prompt LIKE 'GPT URL: %'
    )
    GROUP BY source ORDER BY COUNT(*) DESC LIMIT 15
  `;
  for (const r of topSurvivors) {
    console.log(`  ${r.count.toString().padStart(5)}  avg ${String(r.avg_len).padStart(5)}c  ${r.source.slice(0, 90)}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
