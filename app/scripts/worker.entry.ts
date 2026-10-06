/**
 * scripts/worker.entry.ts — esbuild entry point for the bundled generation worker.
 *
 * Build:
 *   pnpm worker:bundle  →  scripts/worker.bundled.cjs
 *
 * Runtime:
 *   PM2 launches scripts/worker.bundled.cjs (single self-contained file).
 *   No tsx, no src/ on the production server (CLAUDE.md §7.1 — standalone deploy
 *   does not include src/). External deps (Prisma, BullMQ, ioredis, provider
 *   SDKs) are resolved from the standalone node_modules tree.
 */
import * as fs from "node:fs";
import * as path from "node:path";

// Manually load .env.production from /var/www/promtexpress (no dotenv dep).
function loadEnv(file: string): void {
  if (!fs.existsSync(file)) return;
  const content = fs.readFileSync(file, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
// __dirname after esbuild CJS bundle = directory of worker.bundled.cjs.
loadEnv(path.join(__dirname, "..", ".env.production"));

// Boot the worker explicitly so we own the lifecycle (SIGTERM-driven graceful
// shutdown, plan 2026-05-08 step 8). The `if (require.main === module)` guard
// inside generation-worker.ts cannot fire after esbuild bundling because that
// file is not the bundle's entry point — only THIS file is.
import { startGenerationWorker } from "../src/server/workers/generation-worker";

const worker = startGenerationWorker();

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[gen-worker] ${signal} received — closing gracefully`);
  try {
    // BullMQ Worker.close() stops accepting new jobs and waits for active
    // ones to settle. ecosystem.config.js sets kill_timeout=30000 which
    // matches the upper bound of in-flight LLM calls (Layer 4 timeout 90s
    // is internally clamped, so 30s grace is enough for the synthesizer
    // step that's already in progress).
    await worker.close();
    console.log("[gen-worker] worker closed cleanly");
  } catch (err) {
    console.error("[gen-worker] worker.close error:", err);
  }
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
