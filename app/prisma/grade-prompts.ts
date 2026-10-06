/**
 * AI grader for the prompt library.
 *
 * Goal: score each PromptExemplar 1–10 on real prompt-engineering quality.
 * Uses the active Deepseek V3 engine (deepseek-chat) — fast, no reasoning
 * tokens, ~1–2 s per call. Resumable: rows that already have qualityScore
 * are skipped.
 *
 * Run:
 *   pnpm tsx prisma/grade-prompts.ts             # full library
 *   pnpm tsx prisma/grade-prompts.ts --sample 50 # 50 random rows for spot-check
 *
 * Score rubric:
 *   1–3  trivial / noise / fragment / generic / dataset Q&A
 *   4–6  some structure but generic, average user could write it
 *   7–8  real engineering — role + constraints + output spec
 *   9–10 sophisticated production-grade, multi-faceted
 */

import { PrismaClient } from "@prisma/client";
import { decrypt } from "../src/lib/crypto";

const db = new PrismaClient();

const SYSTEM_PROMPT = [
  "You are a strict prompt-engineering quality grader.",
  "INPUT FORMAT: the user message is a single prompt wrapped in <prompt>...</prompt> tags.",
  "Evaluate the prompt on a 1-10 scale of REAL professional engineering quality:",
  " 1-3: Trivial / noise / fragment / generic single-line / code snippet without structure / dataset Q&A / tutorial excerpt.",
  " 4-6: Has some structure but generic — an average ChatGPT user could write it.",
  " 7-8: Real engineering — clear role definition + constraints + structured output spec; useful production prompt.",
  " 9-10: Sophisticated production-grade — multi-faceted, embedded domain expertise, hard to author.",
  "Be strict. Most prompts are NOT engineered. Default to lower scores unless engineering is clear.",
  "Output ONLY a JSON object on one line: {\"s\":N,\"k\":true|false,\"r\":\"<8 word reason>\"}",
  "where s = integer score 1-10, k = true if you would KEEP it in a curated library (score >= 7), false otherwise.",
].join(" ");

async function getEngine() {
  const engine = await db.aiEngine.findFirst({
    where: { provider: "deepseek", isActive: true, modelId: "deepseek-chat" },
  });
  if (!engine) throw new Error("No active deepseek-chat engine");
  if (!engine.encryptedKey) throw new Error("Engine has no key");
  return { ...engine, apiKey: decrypt(engine.encryptedKey) };
}

type GradeResult = { s: number; k: boolean; r: string };

async function gradeOne(apiKey: string, model: string, text: string): Promise<GradeResult | null> {
  const userMsg = `<prompt>\n${text.slice(0, 8000)}\n</prompt>`; // cap input at 8K chars for speed
  const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      max_tokens: 128,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  const content: string = data.choices?.[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(content);
    if (typeof parsed.s !== "number" || parsed.s < 1 || parsed.s > 10) return null;
    return {
      s: Math.round(parsed.s),
      k: !!parsed.k,
      r: String(parsed.r ?? "").slice(0, 100),
    };
  } catch {
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const sampleArgIdx = args.indexOf("--sample");
  const sampleSize = sampleArgIdx >= 0 ? parseInt(args[sampleArgIdx + 1] ?? "50", 10) : null;

  const engine = await getEngine();
  console.log(`Engine: ${engine.name} (${engine.modelId})`);

  let rows: { id: string; prompt: string; sourceId: string | null; contentLength: number }[];

  if (sampleSize) {
    console.log(`Sample mode — picking ${sampleSize} random rows (UN-graded only)\n`);
    rows = await db.$queryRawUnsafe(`
      SELECT id, prompt, "sourceId", "contentLength"
      FROM "PromptExemplar"
      WHERE "qualityScore" IS NULL
      ORDER BY random()
      LIMIT ${sampleSize}
    `);
  } else {
    rows = await db.promptExemplar.findMany({
      where: { qualityScore: null },
      select: { id: true, prompt: true, sourceId: true, contentLength: true },
      orderBy: { id: "asc" },
    });
    console.log(`Grading ${rows.length} rows that have no qualityScore yet\n`);
  }

  const startedAt = Date.now();
  let graded = 0;
  let kept = 0;
  let dropped = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const result = await gradeOne(engine.apiKey, engine.modelId, row.prompt);
      if (!result) {
        errors++;
        continue;
      }
      await db.promptExemplar.update({
        where: { id: row.id },
        data: {
          qualityScore: result.s,
          qualityBreakdown: { decision: result.k ? "keep" : "drop", reason: result.r, gradedAt: new Date().toISOString() },
        },
      });
      graded++;
      if (result.k) kept++;
      else dropped++;

      if (graded % 25 === 0 || sampleSize) {
        const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
        const rate = graded / Math.max(elapsedSec, 1);
        const remaining = rows.length - graded;
        const etaMin = Math.round(remaining / rate / 60);
        if (sampleSize) {
          console.log(
            `  [${row.sourceId ?? row.id.slice(0, 8)}] s=${result.s} ${result.k ? "✓" : "✗"} (${row.contentLength}c) — ${result.r}`,
          );
        } else {
          console.log(
            `  ${graded}/${rows.length}  keep ${kept} drop ${dropped} err ${errors}  rate ${rate.toFixed(1)}/s  ETA ${etaMin}m`,
          );
        }
      }
    } catch (e) {
      errors++;
      if (errors <= 3) console.error(`  error on ${row.id}: ${(e as Error).message}`);
    }
  }

  const totalSec = Math.round((Date.now() - startedAt) / 1000);
  console.log(`\nDone in ${totalSec}s.`);
  console.log(`  graded : ${graded}`);
  console.log(`  keep   : ${kept}`);
  console.log(`  drop   : ${dropped}`);
  console.log(`  errors : ${errors}`);

  if (sampleSize) {
    const dist = await db.$queryRawUnsafe<{ s: number; count: bigint }[]>(`
      SELECT "qualityScore" AS s, COUNT(*)::bigint AS count
      FROM "PromptExemplar"
      WHERE "qualityScore" IS NOT NULL
      GROUP BY "qualityScore"
      ORDER BY "qualityScore" DESC
    `);
    console.log("\nScore distribution (so far):");
    for (const r of dist) console.log(`  ${r.s}: ${r.count}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
