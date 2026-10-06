#!/usr/bin/env tsx
/**
 * Training pipeline scheduler tick.
 * Çalıştırma: pnpm tsx scripts/training-tick.ts [--limit N]
 *
 * Cron örneği (sistem crontab):
 *   30 * * * * cd /var/www/promtexpress && pnpm tsx scripts/training-tick.ts >> /var/log/promtexpress/training-tick.log 2>&1
 */

import { tickScheduler } from "../src/lib/training/orchestrator";

const limitArg = process.argv.findIndex((a) => a === "--limit");
const limit = limitArg >= 0 ? parseInt(process.argv[limitArg + 1] ?? "5", 10) : 5;

(async () => {
  const start = Date.now();
  const results = await tickScheduler({ limit });
  console.log(
    JSON.stringify({
      tickAt: new Date().toISOString(),
      durationMs: Date.now() - start,
      count: results.length,
      results,
    }),
  );
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
