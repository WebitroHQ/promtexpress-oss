#!/usr/bin/env tsx
/**
 * Prime unfetched training resources through the full pipeline.
 * Çalıştırma: pnpm tsx scripts/seed-and-prime.ts [--limit N] [--type URL|RSS|SITEMAP]
 *
 * Önkoşul: seed-priority-resources.ts çalıştırılmış olmalı.
 * Idempotent: lastFetchedAt set olanlar atlanır.
 */

import { db } from "../src/db/client";
import { runResourcePipeline } from "../src/lib/training/orchestrator";
import type { ResourceType } from "@prisma/client";

const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1] ?? "10", 10) : Infinity;
const typeIdx = args.indexOf("--type");
const typeFilter = typeIdx >= 0 ? (args[typeIdx + 1] as ResourceType) : undefined;

async function main() {
  const where = {
    status: "ACTIVE" as const,
    lastFetchedAt: null,
    ...(typeFilter ? { type: typeFilter } : {}),
  };

  const all = await db.trainingResource.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: isFinite(limit) ? limit : undefined,
  });

  console.log(`Priming ${all.length} resources (limit=${limit}, type=${typeFilter ?? "all"})...`);

  const results: Array<{ id: string; title: string; ok: boolean; details?: unknown; error?: string }> = [];

  for (const r of all) {
    try {
      const res = await runResourcePipeline(r.id);
      results.push({ id: r.id, title: r.title, ok: true, details: res });
      console.log(`✓ ${r.title} — snapshots:${res.snapshotsNew} dist:${res.distillationsCreated} (${res.durationMs}ms)`);
    } catch (e) {
      const msg = (e as Error).message;
      results.push({ id: r.id, title: r.title, ok: false, error: msg });
      console.error(`✗ ${r.title}: ${msg}`);
    }
  }

  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  console.log(JSON.stringify({ summary: { total: all.length, ok, failed } }, null, 2));

  await db.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
