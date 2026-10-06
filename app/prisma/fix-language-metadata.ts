/**
 * Phase 3 — backfill `language` for rows whose metadata says non-en
 * but actual content is English. Uses the upgraded lang-detect (franc-min
 * + script heuristics) to verify before updating.
 */
import { PrismaClient } from "@prisma/client";
import { detectLanguage } from "../src/lib/library/lang-detect";

const db = new PrismaClient();

async function main() {
  const rows = await db.promptExemplar.findMany({
    where: { language: { not: "en" } },
    select: { id: true, sourceId: true, language: true, prompt: true },
  });
  console.log(`Candidate rows (language != en): ${rows.length}`);

  let updated = 0;
  let kept = 0;
  for (const r of rows) {
    const detected = detectLanguage(r.prompt);
    if (detected.lang === "en") {
      await db.promptExemplar.update({
        where: { id: r.id },
        data: { language: "en" },
      });
      console.log(`  ✓ ${r.sourceId}  was ${r.language} → en`);
      updated++;
    } else {
      console.log(`  · ${r.sourceId}  stays ${r.language} (detector says ${detected.lang}/${detected.confidence})`);
      kept++;
    }
  }
  console.log(`\nUpdated: ${updated}  |  Kept: ${kept}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
