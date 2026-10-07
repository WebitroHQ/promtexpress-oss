# PromtExpress app

The web application behind [promtexpress.com](https://promtexpress.com): you describe what you want in plain language and it writes a prompt tuned for the AI model you are targeting.

It is free. There are no plans and no credits. Every user adds their own AI provider API key, and generations run on that key.

Licensed under the [GNU AGPL v3](LICENSE). The SDKs, CLI and template library in the rest of this repository stay MIT.

## How it works

1. A user signs up and adds a key in **Settings → AI keys**. Supported providers: OpenAI, Anthropic, Google Gemini, DeepSeek and OpenRouter. Several keys can be stored; one is active.
2. A generation runs through a pipeline: intent analysis, context assembly (role briefs, personas, anti-patterns and matching library examples), synthesis and validation. Every model call uses the user's active key.
3. Keys are encrypted at rest with AES-256-GCM (`AI_KEYS_ENCRYPTION_KEY`) and are never sent back to the browser.

Library examples are found with Postgres full-text search, so no embedding provider is needed. The interface and the library are English.

## Stack

Next.js 16 (App Router), Prisma with PostgreSQL 16 + pgvector, Redis + BullMQ for the optional background worker, NextAuth.

## Run it yourself

You need Node.js 22, pnpm, PostgreSQL 16 with the `vector` extension, and Redis if you enable the queue.

```bash
cd app
pnpm install
cp .env.example .env.local        # then fill it in
pnpm prisma db push             # creates the schema (see Known gaps)
psql "$DATABASE_URL" -f prisma/migrations/20261006130000_exemplar_lexical_search/migration.sql
pnpm db:seed
pnpm dev
```

Open http://localhost:3000, sign up, add an AI key in Settings, and generate.

For production:

```bash
pnpm build:prod
pnpm deploy:prepare
pnpm start:prod
```

With `GENERATION_QUEUE_ENABLED=true`, also build and run the worker:

```bash
pnpm worker:bundle
node scripts/worker.bundled.cjs
```

## Known gaps

This code was opened up from a private product in October 2026. Be aware of the following:

- **Migrations are incomplete** ([#24](https://github.com/WebitroHQ/promtexpress-oss/issues/24))**.** `prisma/migrations` holds only the most recent migrations, not the full history, so `pnpm db:migrate:deploy` on an empty database will not create every table. Until a baseline migration is added, create the schema with `pnpm prisma db push` and then run the SQL in `prisma/migrations/20261006130000_exemplar_lexical_search/migration.sql` once (it adds the search trigger, which `db push` does not; the file is safe to re-run).
- **The prompt library is not included.** The examples used on promtexpress.com are not in this repository. A fresh install generates without few-shot examples until you add your own in the admin panel (`/pr/yonet/library`).
- **Billing code is still present but unused** ([#27](https://github.com/WebitroHQ/promtexpress-oss/issues/27))**.** Paddle webhooks, plans and the credit ledger remain in the schema and the code. Generation costs zero credits.
- **Type checking is not clean** ([#23](https://github.com/WebitroHQ/promtexpress-oss/issues/23))**.** `next.config.ts` sets `typescript.ignoreBuildErrors`, mostly because of stale test files.

Help with any of these is welcome. Smaller starting points are labelled [`app` + `good first issue`](https://github.com/WebitroHQ/promtexpress-oss/issues?q=is%3Aissue+is%3Aopen+label%3Aapp). See [CONTRIBUTING.md](../CONTRIBUTING.md).
