/**
 * Verify import of an archive file → PromptExemplar
 * Run: pnpm tsx prisma/verify-archive-import.ts <filename.md>
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const SOURCE_FILE = process.argv[2];
if (!SOURCE_FILE) {
  console.error("Usage: pnpm tsx prisma/verify-archive-import.ts <filename.md>");
  process.exit(1);
}

async function main() {
  const total = await db.promptExemplar.count();
  const fromFile = await db.promptExemplar.count({
    where: { sourceFile: SOURCE_FILE },
  });

  const byLanguage = await db.promptExemplar.groupBy({
    by: ["language"],
    where: { sourceFile: SOURCE_FILE },
    _count: { _all: true },
    orderBy: { _count: { language: "desc" } },
  });

  const byStatus = await db.promptExemplar.groupBy({
    by: ["status"],
    where: { sourceFile: SOURCE_FILE },
    _count: { _all: true },
  });

  const sample = await db.promptExemplar.findMany({
    where: { sourceFile: SOURCE_FILE },
    select: {
      sourceId: true,
      title: true,
      language: true,
      modality: true,
      status: true,
      contentLength: true,
    },
    orderBy: { createdAt: "asc" },
    take: 3,
  });

  console.log("=== PromptExemplar verify ===");
  console.log(`Total exemplars in DB        : ${total}`);
  console.log(`From ${SOURCE_FILE} : ${fromFile}`);
  console.log("\nBy language:");
  for (const row of byLanguage) {
    console.log(`  ${row.language.padEnd(10)} ${row._count._all}`);
  }
  console.log("\nBy status:");
  for (const row of byStatus) {
    console.log(`  ${row.status.padEnd(10)} ${row._count._all}`);
  }
  console.log("\nFirst 3 rows:");
  for (const r of sample) {
    console.log(
      `  [${r.sourceId}] ${r.title} — ${r.language}/${r.modality}/${r.status} (${r.contentLength} chars)`,
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
