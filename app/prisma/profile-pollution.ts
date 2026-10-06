/**
 * Profile the curated 1,377 prompts for "pollution" — anything tying a
 * prompt to a brand / URL / person / file path that doesn't belong in a
 * generic, reusable template.
 *
 * Read-only. Output is grouped sample evidence so the admin can decide
 * the cleanup rule per pollution class.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

type PollutionPattern = {
  label: string;
  // SQL regex against the prompt column (Postgres SIMILAR TO / ~)
  expr: string;
};

const PATTERNS: PollutionPattern[] = [
  { label: "URLs (http/https/www)",        expr: `prompt ~* '(https?://|\\bwww\\.[a-z0-9])'` },
  { label: "Email addresses",              expr: `prompt ~* '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}'` },
  { label: "HTML tags (<img>, <a>, <div>)", expr: `prompt ~ '<(img|a|div|span|p|h[1-6])\\b'` },
  { label: "Markdown links [text](url)",   expr: `prompt ~ '\\[[^\\]]+\\]\\([^)]+\\)'` },
  { label: "Author attribution 'by X'",    expr: `prompt ~* '\\b[Bb]y\\s+[A-Z][a-zA-Z]+(?:\\s+[A-Z][a-zA-Z]+)?\\s*$'` },
  { label: "GitHub-style file refs (foo.py, /src/)", expr: `prompt ~ '/(src|app|lib|components|pages)/[a-zA-Z0-9_./-]+\\.(py|ts|js|tsx|jsx|md|json)'` },
  { label: "GPT URL meta",                 expr: `prompt LIKE 'GPT URL:%' OR prompt ~ 'GPT URL: https'` },
  { label: "Brand: ChatGPT/GPT-4/Claude/Gemini", expr: `prompt ~* '\\b(ChatGPT|GPT-4|GPT-3|Claude|Gemini|Copilot|Anthropic|OpenAI)\\b'` },
  { label: "Brand: Cursor/Bolt/v0/Devin/Lovable/Junie/Augment/Manus/Comet", expr: `prompt ~* '\\b(Cursor|Bolt\\.new|v0\\.dev|Devin|Lovable|Junie|Augment Code|Manus|Comet|Windsurf|Codeium|Antigravity|Leap\\.new|Emergent|Kiro|Augment)\\b'` },
  { label: "Personal names in 'I am X' / 'My name is X'", expr: `prompt ~* '(my name is|I am|I''m)\\s+[A-Z][a-zA-Z]{2,}\\s+[A-Z][a-zA-Z]{2,}'` },
  { label: "Twitter/X handles (@username)", expr: `prompt ~ '\\s@[a-zA-Z0-9_]{3,}\\b'` },
  { label: "Hashtags (#tag)",              expr: `prompt ~ '\\s#[a-zA-Z][a-zA-Z0-9_]{2,}'` },
  { label: "Phone numbers",                expr: `prompt ~ '(\\+?\\d{1,3}[-.\\s]?)?\\(?\\d{3}\\)?[-.\\s]\\d{3}[-.\\s]\\d{4}'` },
  { label: "Dates like 2024-XX-XX or 'Jan 2024'", expr: `prompt ~ '202[0-9]-[01][0-9]-[0-3][0-9]'` },
];


async function main() {
  const total = await db.promptExemplar.count();
  console.log(`Total surviving prompts: ${total}\n`);

  console.log("=== Pollution prevalence (overlapping counts) ===");
  const matches: { label: string; count: number; expr: string }[] = [];
  for (const p of PATTERNS) {
    const r = await db.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint AS count FROM "PromptExemplar" WHERE ${p.expr}`,
    );
    const c = Number(r[0].count);
    matches.push({ label: p.label, count: c, expr: p.expr });
    console.log(`  ${String(c).padStart(4)}  ${p.label}`);
  }

  // Aggregate: any pollution
  const anyPattern = PATTERNS.map((p) => `(${p.expr})`).join(" OR ");
  const anyR = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM "PromptExemplar" WHERE ${anyPattern}`,
  );
  console.log(`\n>>> Any pollution: ${Number(anyR[0].count)} of ${total} (${(Number(anyR[0].count)/total*100).toFixed(1)}%)`);

  // Show 4 examples per pattern (truncated)
  console.log("\n=== Sample examples per class ===");
  for (const p of PATTERNS) {
    if (matches.find((m) => m.label === p.label)?.count === 0) continue;
    console.log(`\n--- ${p.label} ---`);
    const samples = await db.$queryRawUnsafe<{ sourceId: string; len: number; preview: string }[]>(
      `SELECT "sourceId", "contentLength" AS len, LEFT(prompt, 200) AS preview
       FROM "PromptExemplar" WHERE ${p.expr}
       ORDER BY random() LIMIT 3`,
    );
    for (const s of samples) {
      console.log(`  [${(s.sourceId ?? "no-id").slice(0, 30)}] ${s.len}c`);
      console.log(`    "${s.preview.replace(/\s+/g, " ").slice(0, 160)}"`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
