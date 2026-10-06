/**
 * Phase 5 — verify retrieveExemplars() returns useful results now that
 * status is promoted. Calls the same code path the live generator uses.
 */
import { PrismaClient } from "@prisma/client";
import { retrieveExemplars } from "../src/lib/pipeline/v2/rag";

const db = new PrismaClient();

const SAMPLE_INTENTS: Array<{ intent: string; modality: "text" | "code" | "image" | "video" | "audio" }> = [
  {
    intent: "Write a system prompt for an academic paper reviewer that checks methodology rigor",
    modality: "text",
  },
  {
    intent: "Generate a coding agent that refactors React components and writes tests",
    modality: "code",
  },
  {
    intent: "Create a cinematic landscape image generation prompt with dramatic lighting",
    modality: "image",
  },
  {
    intent: "Build a customer-support chatbot that handles refund requests politely",
    modality: "text",
  },
];

async function main() {
  for (const sample of SAMPLE_INTENTS) {
    console.log(`\n=== INTENT: "${sample.intent}" (${sample.modality}) ===`);
    const t0 = Date.now();
    const hits = await retrieveExemplars({
      intentText: sample.intent,
      modality: sample.modality,
      targetEngineId: null,
      k: 3,
    });
    const ms = Date.now() - t0;
    console.log(`  ${hits.length} hits in ${ms}ms`);
    for (const h of hits) {
      const similarity = typeof h.similarity === "number" ? h.similarity.toFixed(3) : "n/a";
      console.log(`  · sim=${similarity}  status=${h.status}  qS=${h.qualityScore}`);
      console.log(`    "${h.prompt.replace(/\s+/g, " ").slice(0, 100)}"`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
