/**
 * Phase 4 — strip the residual `## Q(user) ... ## A(<name>)` extraction
 * wrapper from rows that escaped the earlier sanitizer.
 *
 * Pattern target (verified against 2 surviving rows):
 *   ## Q(user)
 *   <single-line user question>
 *   ## A(<name>)
 *
 * Strip up to and including the `## A(...)` line, then re-hash and
 * re-compute contentLength. Reject the change if the cleaned text drops
 * below 50% of the original (over-edit guard).
 */
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const db = new PrismaClient();

const STRIP_RE = /^##\s+Q\(user\)\s*\n+[\s\S]*?##\s+A\([^)]+\)\s*\n+/;

async function main() {
  const rows = (await db.$queryRawUnsafe(`
    SELECT id, "sourceId", "promptHash", "contentLength", prompt
    FROM "PromptExemplar"
    WHERE prompt ~ '^##\\s+Q\\(user\\)'
  `)) as Array<{ id: string; sourceId: string | null; promptHash: string; contentLength: number; prompt: string }>;

  console.log(`Candidates with Q(user) wrapper: ${rows.length}`);

  for (const r of rows) {
    const cleaned = r.prompt.replace(STRIP_RE, "").trim();
    if (cleaned.length < r.prompt.length * 0.5) {
      console.log(`  ✗ REJECT ${r.sourceId}: cleaned ${cleaned.length}c < 50% of ${r.contentLength}c`);
      continue;
    }
    const newHash = createHash("sha256")
      .update(cleaned.toLowerCase().replace(/\s+/g, " "), "utf8")
      .digest("hex");

    if (newHash !== r.promptHash) {
      const collision = await db.promptExemplar.findUnique({
        where: { promptHash: newHash },
        select: { id: true },
      });
      if (collision && collision.id !== r.id) {
        console.log(`  ↳ ${r.sourceId}: cleaned form duplicates existing → DELETE`);
        await db.promptExemplar.delete({ where: { id: r.id } });
        continue;
      }
    }

    await db.promptExemplar.update({
      where: { id: r.id },
      data: { prompt: cleaned, contentLength: cleaned.length, promptHash: newHash },
    });
    console.log(`  ✓ ${r.sourceId}: ${r.contentLength}c → ${cleaned.length}c`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
