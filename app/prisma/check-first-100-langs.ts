/**
 * Replicate the OLD bulkTranslate path (take: 100 with no orderBy)
 * and report what detectLanguage thinks for each row. This proves whether
 * the user's button click would have surfaced anything to translate.
 */
import { PrismaClient } from "@prisma/client";
import { detectLanguage } from "../src/lib/library/lang-detect";

const db = new PrismaClient();

async function main() {
  // Old code: findMany with no orderBy, take 100. Postgres returns
  // physical heap order (not insert order). Reproduce it.
  const rows: { id: string; prompt: string }[] = await db.promptExemplar.findMany({
    select: { id: true, prompt: true },
    take: 100,
  });

  const counts: Record<string, number> = {};
  let nonEnSamples = 0;
  const samples: { id: string; lang: string; head: string }[] = [];

  for (const r of rows) {
    const { lang } = detectLanguage(r.prompt);
    counts[lang] = (counts[lang] ?? 0) + 1;
    if (lang !== "en" && nonEnSamples < 5) {
      samples.push({
        id: r.id,
        lang,
        head: r.prompt.replace(/\s+/g, " ").slice(0, 80),
      });
      nonEnSamples++;
    }
  }

  console.log("=== detectLanguage on first 100 (heap order) ===");
  for (const [lang, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${lang.padEnd(4)} ${count}`);
  }
  console.log("\n=== First 5 non-en candidates ===");
  for (const s of samples) {
    console.log(`  [${s.id.slice(0, 8)}] ${s.lang} — ${s.head}`);
  }

  // Also: how many across the WHOLE library does detectLanguage classify as non-en?
  console.log("\n=== Sweeping all rows (this takes a moment) ===");
  const all: { prompt: string }[] = await db.promptExemplar.findMany({
    select: { prompt: true },
  });
  const allCounts: Record<string, number> = {};
  for (const r of all) {
    const { lang } = detectLanguage(r.prompt);
    allCounts[lang] = (allCounts[lang] ?? 0) + 1;
  }
  console.log(`Total rows scanned: ${all.length}`);
  for (const [lang, count] of Object.entries(allCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${lang.padEnd(4)} ${count}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
