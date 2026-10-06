/**
 * Apply EXPERT cleanup: delete every PromptExemplar row that does NOT
 * survive the engineered-prompt rule set. Wrapped in a transaction so
 * partial failure rolls back. Backup must already exist on server.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const KEEP_WHERE = `
  -- (1) Not in the base-purge set
  NOT (
    "contentLength" < 40
    OR source ILIKE 'huggingface.co/datasets/%'
    OR source ILIKE '%oasst1%' OR source ILIKE '%oasst2%'
    OR title ILIKE 'oasst1%' OR title ILIKE 'oasst2%'
    OR prompt LIKE 'GPT URL: %'
    OR source ILIKE '%stanford_alpaca%'
  )
  AND (
    -- (2) Engineered-prompt signals (any one suffices)
    source ILIKE '%awesome-chatgpt-prompts%'
    OR "contentLength" >= 500
    OR (prompt ~ '\\{\\{\\{[A-Za-z]' OR prompt ~ '\\{\\{[A-Za-z]')
    OR (
      prompt ~* '^(You are|You will|You''ll|Act as|Imagine you are|Pretend (you are|to be)|SİSTEM:|System:|System Prompt:)'
      OR prompt ~* E'\\nYou are a '
      OR prompt ~* E'^# Role'
    )
  )
`;

async function main() {
  const before = await db.promptExemplar.count();
  console.log(`Rows before: ${before.toLocaleString()}`);

  const willKeep = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM "PromptExemplar" WHERE ${KEEP_WHERE}`,
  );
  console.log(`Will keep   : ${Number(willKeep[0].count).toLocaleString()}`);
  console.log(`Will delete : ${(before - Number(willKeep[0].count)).toLocaleString()}\n`);

  console.log("Running DELETE in single transaction…");
  const t0 = Date.now();
  const deleted = await db.$transaction(async (tx) => {
    const r = await tx.$executeRawUnsafe(
      `DELETE FROM "PromptExemplar" WHERE NOT (${KEEP_WHERE})`,
    );
    return r;
  }, { timeout: 600000 });
  const ms = Date.now() - t0;
  console.log(`  deleted ${deleted.toLocaleString()} rows in ${ms}ms`);

  const after = await db.promptExemplar.count();
  console.log(`\nRows after  : ${after.toLocaleString()}`);
  console.log(`Reduction   : ${(((before - after) / before) * 100).toFixed(1)}%`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
