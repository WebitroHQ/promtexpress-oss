/**
 * Diagnose translation system state.
 * Run: pnpm tsx prisma/check-translation-config.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  // 1. AppSetting: translation_engine_id
  const setting = await db.appSetting.findUnique({
    where: { key: "translation_engine_id" },
  });
  console.log("=== AppSetting: translation_engine_id ===");
  if (!setting) {
    console.log("  ❌ NOT SET — translation pipeline will skip all rows");
  } else {
    console.log(`  value: ${setting.value}`);
    console.log(`  notes: ${setting.notes ?? "(none)"}`);
    console.log(`  updated: ${setting.updatedAt.toISOString()}`);
  }

  // 2. All AppSettings (just keys for context)
  const all = await db.appSetting.findMany({ select: { key: true, value: true } });
  console.log("\n=== All AppSettings ===");
  for (const s of all) {
    const preview = s.value.length > 60 ? s.value.slice(0, 60) + "…" : s.value;
    console.log(`  ${s.key.padEnd(30)} ${preview}`);
  }

  // 3. AiEngines
  const engines = await db.aiEngine.findMany({
    select: {
      id: true,
      name: true,
      provider: true,
      modelId: true,
      isActive: true,
      encryptedKey: true,
    },
    orderBy: { sortOrder: "asc" },
  });
  console.log("\n=== AiEngines ===");
  for (const e of engines) {
    const hasKey = e.encryptedKey && e.encryptedKey.length > 0 ? "✓ key" : "✗ NO KEY";
    const active = e.isActive ? "active" : "inactive";
    console.log(`  ${e.id.slice(0, 8)} | ${e.name.padEnd(28)} | ${e.provider.padEnd(12)} | ${e.modelId.padEnd(35)} | ${active} | ${hasKey}`);
  }

  // 4. Resolve current translation engine
  if (setting?.value) {
    console.log("\n=== Resolved translation engine ===");
    const engine = await db.aiEngine.findUnique({ where: { id: setting.value } });
    if (!engine) {
      console.log(`  ❌ Engine id ${setting.value} not found in AiEngine table`);
    } else {
      console.log(`  name      : ${engine.name}`);
      console.log(`  provider  : ${engine.provider}`);
      console.log(`  modelId   : ${engine.modelId}`);
      console.log(`  isActive  : ${engine.isActive}`);
      console.log(`  has key   : ${engine.encryptedKey && engine.encryptedKey.length > 0 ? "yes" : "NO"}`);
      if (!engine.isActive) console.log("  ⚠️  Engine is INACTIVE — translateExemplar will fail because findUnique filters by isActive:true");
      if (!engine.encryptedKey || engine.encryptedKey.length === 0) console.log("  ⚠️  Engine has NO API KEY — translation will skip with 'engine_no_key'");
    }
  }

  // 5. Sample of non-English exemplars to confirm content actually has non-English
  console.log("\n=== Sample non-en exemplars (first 5 by language) ===");
  const samples = await db.promptExemplar.findMany({
    where: { language: { not: "en" } },
    select: { id: true, sourceId: true, language: true, prompt: true },
    take: 5,
  });
  for (const s of samples) {
    const head = s.prompt.replace(/\s+/g, " ").slice(0, 80);
    console.log(`  [${s.sourceId}] ${s.language} — ${head}`);
  }
  const nonEnCount = await db.promptExemplar.count({ where: { language: { not: "en" } } });
  console.log(`\n  Total non-en exemplars: ${nonEnCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
