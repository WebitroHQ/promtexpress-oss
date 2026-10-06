import path from "node:path";
import { existsSync } from "node:fs";
import { config as loadDotenv } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 6.7+ stops auto-loading .env files when prisma.config.ts is present.
// Replicate Next.js precedence so every CLI invocation (generate / migrate /
// studio) sees DATABASE_URL + DIRECT_URL without manual `source`.
//   .env.<NODE_ENV>.local  >  .env.local  >  .env.<NODE_ENV>  >  .env
// `.env.local` is skipped when NODE_ENV=test (Next.js convention).
// `override: false` so first-loaded value wins — preserves precedence and
// keeps CI-injected env vars (workflow `env:` blocks) authoritative.
const NODE_ENV = process.env.NODE_ENV || "development";
const envFiles = [
  `.env.${NODE_ENV}.local`,
  ...(NODE_ENV === "test" ? [] : [".env.local"]),
  `.env.${NODE_ENV}`,
  ".env",
  // Final fallback: production servers may have only `.env.production` and no
  // explicit NODE_ENV at admin shell time. With `override: false` this never
  // wins on dev (where `.env.local` loads first).
  ".env.production",
];
for (const file of envFiles) {
  const abs = path.resolve(process.cwd(), file);
  if (existsSync(abs)) loadDotenv({ path: abs, override: false });
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
