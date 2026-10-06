/**
 * End-to-end test of maybeTranslate with rows whose actual CONTENT
 * (not just metadata) is verifiably non-English. Picks rows by string
 * markers that only occur in the target language.
 *
 * Read-only: does NOT update the DB.
 */
import { PrismaClient } from "@prisma/client";
import { maybeTranslate } from "../src/lib/library/translate";

const db = new PrismaClient();

async function pickByContains(needle: string) {
  return db.promptExemplar.findFirst({
    where: { prompt: { contains: needle } },
    select: { id: true, sourceId: true, language: true, prompt: true },
  });
}

async function runOne(label: string, prompt: string) {
  console.log(`\n--- ${label} ---`);
  console.log(`INPUT  (${prompt.length} chars): ${prompt.replace(/\s+/g, " ").slice(0, 140)}${prompt.length > 140 ? "…" : ""}`);
  const t0 = Date.now();
  const r = await maybeTranslate(prompt);
  const ms = Date.now() - t0;
  console.log(`RESULT ${ms}ms — changed=${r.changed} skipped=${r.skipped}${r.reason ? ` reason=${r.reason}` : ""}`);
  console.log(`OUTPUT (${r.result.length} chars): ${r.result.replace(/\s+/g, " ").slice(0, 140)}${r.result.length > 140 ? "…" : ""}`);
}

async function main() {
  // Distinctive native-language strings (very unlikely to appear in English):
  const samples = [
    { label: "Spanish content", needle: "necesito ayuda" },
    { label: "Turkish content", needle: "yardım eder" },
    { label: "German content", needle: "Schreibe einen" },
    { label: "Japanese content", needle: "日本語" },
    { label: "Russian content", needle: "помоги" },
    { label: "Arabic content", needle: "مساعدتي" },
  ];

  for (const s of samples) {
    const row = await pickByContains(s.needle);
    if (!row) {
      console.log(`\n--- ${s.label} --- (no row found containing "${s.needle}")`);
      continue;
    }
    await runOne(`${s.label} [${row.sourceId}, lang=${row.language}]`, row.prompt);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
