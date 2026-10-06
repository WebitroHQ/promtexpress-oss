/**
 * Detect translation vs embedding activity.
 * - Translation: bumps `updatedAt`, changes `prompt` & `contentLength`, leaves `embeddedAt` null.
 * - Embedding: bumps `updatedAt` AND sets `embeddedAt`.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const total = await db.promptExemplar.count();
  const nonEn = await db.promptExemplar.count({ where: { language: { not: "en" } } });
  const embedded = await db.promptExemplar.count({ where: { embeddedAt: { not: null } } });

  console.log(`Total                     : ${total}`);
  console.log(`Non-English (lang != en)  : ${nonEn}`);
  console.log(`Embedded (embeddedAt set) : ${embedded}`);

  // Modified rows split by embedding state
  const modifiedTotal = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "PromptExemplar"
    WHERE "updatedAt" > "createdAt" + INTERVAL '1 second'
  `;
  const modifiedAndEmbedded = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "PromptExemplar"
    WHERE "updatedAt" > "createdAt" + INTERVAL '1 second' AND "embeddedAt" IS NOT NULL
  `;
  const modifiedNotEmbedded = await db.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count FROM "PromptExemplar"
    WHERE "updatedAt" > "createdAt" + INTERVAL '1 second' AND "embeddedAt" IS NULL
  `;
  console.log(`\nModified after import     : ${modifiedTotal[0].count}`);
  console.log(`  → also embedded         : ${modifiedAndEmbedded[0].count} (likely embed action)`);
  console.log(`  → NOT embedded          : ${modifiedNotEmbedded[0].count} (likely translation action)`);

  console.log("\n=== Top 10 modified-but-NOT-embedded (translation candidates) ===");
  const candidates = await db.$queryRaw<
    {
      id: string;
      sourceId: string | null;
      language: string;
      contentLength: number;
      createdAt: Date;
      updatedAt: Date;
      prompt: string;
    }[]
  >`
    SELECT id, "sourceId", language, "contentLength", "createdAt", "updatedAt",
           LEFT(prompt, 80) AS prompt
    FROM "PromptExemplar"
    WHERE "updatedAt" > "createdAt" + INTERVAL '1 second'
      AND "embeddedAt" IS NULL
    ORDER BY "updatedAt" DESC
    LIMIT 10
  `;
  for (const r of candidates) {
    console.log(
      `  [${r.sourceId ?? "?"}] ${r.language} | upd ${r.updatedAt.toISOString()} | len ${r.contentLength} | "${r.prompt.replace(/\s+/g, " ")}"`,
    );
  }

  console.log("\n=== Latest 5 embedded rows ===");
  const embeddedRows = await db.promptExemplar.findMany({
    where: { embeddedAt: { not: null } },
    select: {
      id: true,
      sourceId: true,
      language: true,
      embeddedAt: true,
      embeddingModel: true,
    },
    orderBy: { embeddedAt: "desc" },
    take: 5,
  });
  for (const r of embeddedRows) {
    console.log(
      `  [${r.sourceId}] ${r.language} | emb ${r.embeddedAt?.toISOString()} | model ${r.embeddingModel}`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
