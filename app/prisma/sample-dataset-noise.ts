import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function sampleSource(label: string, pattern: string, n = 6) {
  console.log(`\n--- ${label} ---`);
  const rows = await db.$queryRawUnsafe<
    { sourceId: string; len: number; prompt: string }[]
  >(
    `SELECT "sourceId", "contentLength" AS len, prompt
     FROM "PromptExemplar"
     WHERE source ILIKE $1
     ORDER BY random() LIMIT ${n}`,
    pattern,
  );
  for (const r of rows) {
    const head = r.prompt.replace(/\s+/g, " ").slice(0, 150);
    console.log(`  [${r.sourceId}] ${r.len}c  ${head}${r.prompt.length > 150 ? "…" : ""}`);
  }
}

async function main() {
  await sampleSource("aya_dataset", "%aya_dataset%");
  await sampleSource("alpaca-gpt4 (any lang)", "%alpaca-gpt4%");
  await sampleSource("Magpie", "%Magpie%");
  await sampleSource("evol-instruct / WizardLM", "%evol_instruct%");
  await sampleSource("kullm-v2", "%kullm-v2%");
  await sampleSource("Turkish-Alpaca", "%Turkish-Alpaca%");
  await sampleSource("samvaad-hi-v1", "%samvaad-hi%");
  await sampleSource("arbml/CIDAR", "%CIDAR%");
  await sampleSource("PartiPrompts", "%parti%");
  await sampleSource("awesome-chatgpt-prompts (canonical, KEEP)", "%awesome-chatgpt-prompts%");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
