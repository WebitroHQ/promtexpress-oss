/**
 * Tighter quality tiering. Goal: keep only prompts that are
 *   - genuinely engineered (length, role definition, parameters)
 *   - NOT something an average user could easily write themselves
 *
 * Computes counts for several "expert prompt" signals so the admin can
 * pick a survival rule set.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

// Base purge applied first: remove dataset noise / metadata blocks.
const BASE_DELETE = `
  "contentLength" < 40
  OR source ILIKE 'huggingface.co/datasets/%'
  OR source ILIKE '%oasst1%' OR source ILIKE '%oasst2%'
  OR title ILIKE 'oasst1%' OR title ILIKE 'oasst2%'
  OR prompt LIKE 'GPT URL: %'
  OR source ILIKE '%stanford_alpaca%'
`;

const SIGNALS: Array<{ label: string; expr: string }> = [
  {
    label: "S1. Canonical: awesome-chatgpt-prompts source",
    expr: `source ILIKE '%awesome-chatgpt-prompts%'`,
  },
  {
    label: "S2. Long & detailed: contentLength >= 500",
    expr: `"contentLength" >= 500`,
  },
  {
    label: "S3. Long & detailed: contentLength >= 1000",
    expr: `"contentLength" >= 1000`,
  },
  {
    label: "S4. Has template variables ({{{var}}} or {{var}})",
    expr: `(prompt ~ '\\{\\{\\{[A-Za-z]' OR prompt ~ '\\{\\{[A-Za-z]')`,
  },
  {
    label: "S5. Strong role marker (You are / Act as / SİSTEM: / Imagine / Pretend)",
    expr: `(
      prompt ~* '^(You are|You will|You''ll|Act as|Imagine you are|Pretend (you are|to be)|SİSTEM:|System:|System Prompt:)' OR
      prompt ~* E'\\nYou are a ' OR
      prompt ~* E'^# Role'
    )`,
  },
  {
    label: "S6. Structured-output instruction (JSON/markdown sections/lists)",
    expr: `(prompt ~* '(return only.*JSON|return.*JSON object|format:.*JSON|## Output|## Format|^Steps?:|^Rules?:|^Constraints?:|^Output:|return ONLY)')`,
  },
];

async function main() {
  const total = await db.promptExemplar.count();
  console.log(`Total: ${total.toLocaleString()}`);

  const baseDel = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM "PromptExemplar" WHERE ${BASE_DELETE}`,
  );
  const survivor = total - Number(baseDel[0].count);
  console.log(
    `After base purge (${Number(baseDel[0].count).toLocaleString()} removed): ${survivor.toLocaleString()} survive\n`,
  );

  console.log("=== Expert-prompt signals among the survivors ===");
  for (const s of SIGNALS) {
    const r = await db.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint AS count FROM "PromptExemplar" WHERE NOT (${BASE_DELETE}) AND (${s.expr})`,
    );
    console.log(`  ${String(r[0].count).padStart(5)}  ${s.label}`);
  }

  // Combined keep set: any of S1, S2, S4, S5
  const keepRule = `(${SIGNALS[0].expr} OR ${SIGNALS[1].expr} OR ${SIGNALS[3].expr} OR ${SIGNALS[4].expr})`;
  const keepCount = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM "PromptExemplar" WHERE NOT (${BASE_DELETE}) AND (${keepRule})`,
  );
  console.log(
    `\n>>> EXPERT KEEP set (S1 ∪ S2 ∪ S4 ∪ S5): ${Number(keepCount[0].count).toLocaleString()} rows survive (rest deleted)`,
  );

  // Even tighter: S1 ∪ S3 ∪ S4 ∪ S5
  const tighterRule = `(${SIGNALS[0].expr} OR ${SIGNALS[2].expr} OR ${SIGNALS[3].expr} OR ${SIGNALS[4].expr})`;
  const tighterCount = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM "PromptExemplar" WHERE NOT (${BASE_DELETE}) AND (${tighterRule})`,
  );
  console.log(
    `>>> ELITE KEEP set (S1 ∪ S3 ∪ S4 ∪ S5):    ${Number(tighterCount[0].count).toLocaleString()} rows survive`,
  );

  // Show 5 random samples that would be DELETED under EXPERT rule (sanity)
  console.log("\n=== Random sample that EXPERT rule WOULD DELETE (must look trivial) ===");
  const trash = await db.$queryRawUnsafe<
    { sourceId: string; len: number; prompt: string; source: string }[]
  >(
    `SELECT "sourceId", "contentLength" AS len, prompt, source
     FROM "PromptExemplar"
     WHERE NOT (${BASE_DELETE}) AND NOT (${keepRule})
     ORDER BY random() LIMIT 8`,
  );
  for (const r of trash) {
    const head = r.prompt.replace(/\s+/g, " ").slice(0, 130);
    console.log(`  [${r.sourceId}] ${r.len}c (${r.source.slice(0, 50)})  ${head}`);
  }

  // Show 5 random samples that EXPERT rule WOULD KEEP (must look elite)
  console.log("\n=== Random sample that EXPERT rule WOULD KEEP (must look engineered) ===");
  const keep = await db.$queryRawUnsafe<
    { sourceId: string; len: number; prompt: string; source: string }[]
  >(
    `SELECT "sourceId", "contentLength" AS len, prompt, source
     FROM "PromptExemplar"
     WHERE NOT (${BASE_DELETE}) AND (${keepRule})
     ORDER BY random() LIMIT 8`,
  );
  for (const r of keep) {
    const head = r.prompt.replace(/\s+/g, " ").slice(0, 130);
    console.log(`  [${r.sourceId}] ${r.len}c (${r.source.slice(0, 50)})  ${head}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
