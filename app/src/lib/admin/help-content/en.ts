import type { HelpContent } from "@/components/feature/admin/help-dialog-button";
import type { AdminHelpKey } from "./index";

const S = {
  when: "When to use",
  fields: "Fields & controls",
  flows: "Common workflows",
  pitfalls: "Pitfalls & cautions",
  related: "Related pages",
};

export const HELP_EN: Partial<Record<AdminHelpKey, HelpContent>> = {
  dashboard: {
    title: "Overview (Dashboard)",
    purpose:
      "Live snapshot of platform health: revenue, user activity, generation volume, and system status — all on one screen. Open this first for morning checks and incident triage.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Morning briefing: today's first generations and current MRR.",
          "Incident triage: is the AI gateway healthy / degraded / down?",
          "Growth tracking: active users last 30 days vs prior period.",
          "Plan distribution: free/paid balance changing?",
          "Quarterly review: 12-month revenue + generations chart.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "MRR — Sum of priceMonthly across active subscriptions (live). Excludes manual adjustments and discounts.",
          "Active users (30d) — Distinct users with at least one generation in 30 days; delta vs prior 30d.",
          "Generations / day — GenerationTrace count since today 00:00; delta vs yesterday.",
          "Avg credit cost (30d) — Mean of negative CreditLedger entries (credits/call). Lower trend is 'good'.",
          "Revenue & generations chart — 12-month revenue (blue) + generation count (orange).",
          "System health — API and DB are static 'Healthy'; AI gateway is healthy/degraded/down based on last 5-minute error rate.",
          "Plan distribution — Free + each active plan, with user count and % share.",
          "Recent activity — Last 6 admin actions from AuditLog (who, what, how long ago).",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Open page → scan MRR + today's generations + AI gateway → if red, jump to traces.",
          "If active users delta is dropping, check recent suspensions in /pr/yonet/users.",
          "If avg credit cost is rising, review the cost-rules table on /pr/yonet/plans.",
          "If AI gateway is 'Degraded', open /pr/yonet/traces and inspect recent failures.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "AI gateway health uses only a 5-minute window; transient errors can flip the badge.",
          "MRR is computed from list prices; manual credit adjustments are not included.",
          "Plan distribution 'Free' = all users without an active subscription (including suspended).",
          "No auto-refresh — reload the page for fresh numbers.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/users — user counts and plan changes feed this.",
          "/pr/yonet/plans — pricing/credit edits affect MRR.",
          "/pr/yonet/traces — AI gateway error details.",
          "/pr/yonet/audit — full admin action log.",
        ],
      },
    ],
  },

  users: {
    title: "Users",
    purpose:
      "Manage all user accounts: invite, suspend, change plan, delete, export CSV. Includes search and status filtering.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Invite a new admin or user (Invite).",
          "Abuse handling: suspend a user with a reason (sessions are killed immediately).",
          "Plan upgrade/downgrade requests (billing period restarts).",
          "GDPR/delete requests: permanently remove user + cascading data.",
          "Compliance export: download CSV of current users.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "User — Initials avatar + name (or email prefix) + email.",
          "Plan — Active subscription's plan name; 'Free' if none.",
          "Credits — Sum of CreditLedger.delta across all reasons; can be negative.",
          "Country — user.country (ISO-2); falls back to user.locale.",
          "Joined — user.createdAt as 'MMM D, YYYY'.",
          "Status — Active or Suspended (red); suspended row also shows reason.",
          "Filter bar — Status (All/Active/Suspended) + name/email search.",
          "Row menu — Change plan / Suspend (asks reason) / Unsuspend / Delete (double-confirm).",
          "Invite modal — Email required, role User|Admin (Admin gets /pr/yonet access).",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Invite admin: Invite → email + role Admin → save (email send depends on auth flow).",
          "Suspend: search → ⋯ → Suspend → reason (≤500) → confirm. All sessions deleted.",
          "Change plan: ⋯ → Change plan → pick number. Period resets; no proration.",
          "Export CSV: Export → users-YYYY-MM-DD.csv.",
          "Delete: ⋯ → Delete → confirm twice. Irreversible cascade.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Delete is IRREVERSIBLE — all prompts, subscriptions, ledger entries gone.",
          "Suspend kills sessions instantly; user is logged out within seconds.",
          "Plan change resets the current period; no proration.",
          "If country is empty, locale is shown (you may see invalid codes like 'EN').",
          "Page shows 50 users; search runs over that page only (not server-side full-text).",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/plans — source of plans available for assignment.",
          "/pr/yonet/audit — user.suspend/unsuspend/changePlan/delete events.",
          "/pr/yonet/ — plan distribution and active-user KPI feed from here.",
        ],
      },
    ],
  },

  plans: {
    title: "Plans & Pricing",
    purpose:
      "Define billing plans (Free, Starter, Pro, Enterprise…): price, monthly credits, visibility. The credit cost-rules reference table is also read here.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Add a new tier (e.g. Teams, Advanced).",
          "Change pricing or credit allowance.",
          "Take a plan off sale (existing subscribers keep access until period end).",
          "Deactivate or permanently delete a plan.",
          "Review credit cost per operation across plans.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Plan name — Unique; max 60.",
          "Slug — URL-safe lowercase + digits + hyphens; unique.",
          "Monthly price ($) and Yearly price ($) — Decimals, includes 0.",
          "Monthly credits — Credits granted at each renewal (SUBSCRIPTION_RENEWAL).",
          "Sort order — Lower comes first.",
          "Active (publish) — When off, hidden from pricing page; no new sales; existing subs unaffected.",
          "Status badge — Live / Hidden.",
          "Price — 0 → 'Free'; for 'enterprise' slug → 'Custom'.",
          "User count — All Subscription rows on this plan (including canceled).",
          "Credit cost rules table — Per-operation credit cost (read-only here; managed in code).",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Create plan: + New plan → name/slug/price/credits/sort → Active → save.",
          "Publish: Edit → check Active → save. Visible on pricing page immediately.",
          "Pause sales: Edit → uncheck Active → save. Existing subscribers not affected.",
          "Delete: Edit → 'Delete plan'. If no active subs, hard delete is irreversible; otherwise it auto-deactivates.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Existing subscribers keep the old price until renewal.",
          "Changing the slug breaks pricing URLs; no auto-redirect.",
          "Cost rules table is not editable here; lives in code.",
          "Hard delete (no subscribers) is irreversible.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/users — assignable plans come from here.",
          "/pr/yonet/ — plan distribution + MRR.",
          "Public /pricing — your live/hidden flag is reflected immediately.",
        ],
      },
    ],
  },

  "agent-roles": {
    title: "Agent Roles (v4 Engine)",
    purpose:
      "Assign AI engines to the 5 core pipeline roles (Intent Analyzer, Synthesizer, Safety Checker, Embedder, Distiller). NO hardcoded models — assignments live entirely here. RoleBrief few-shot exemplars keep even small models performant.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Initial setup: INTENT_ANALYZER and SYNTHESIZER are mandatory.",
          "Switching providers (e.g. Anthropic Haiku → OpenAI GPT-4o-mini).",
          "Temporarily disabling a role (skip Safety Checker).",
          "Tuning role behavior by editing the RoleBrief system prompt.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Intent Analyzer — Parses user request into structured intent JSON. Use a fast/cheap model.",
          "Synthesizer — Pipeline heart: combines Constitution + Persona + RAG + intent into the final prompt. Use a quality model.",
          "Safety Checker — Scans for PII / jailbreak / ethics; only invoked on high risk.",
          "Embedder — Generates RAG embeddings. NOTE: do NOT assign here — managed via /pr/yonet/embedding-engines (isDefault flag).",
          "Distiller — Produces Constitution/Persona/AntiPattern proposals from Training Resources.",
          "RoleBrief system prompt editor — Modal; min 50, max 20000 chars; cache invalidates on save.",
          "isActive toggle — Disables the role without losing its assignment.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "First setup: create engine + API key in /pr/yonet/engines → here, assign INTENT_ANALYZER and SYNTHESIZER → Save.",
          "Switch provider: pick new engine from dropdown → Save. Few-shot exemplars adapt the new model.",
          "Tune role: Edit prompt… → modify text → Save prompt. Cache invalidates immediately.",
          "Disable validation: toggle Safety Checker off. Faster but riskier.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Without INTENT_ANALYZER or SYNTHESIZER assigned, the pipeline silently fails.",
          "Engines marked ⚠ (inactive or no API key) cannot be assigned.",
          "Missing RoleBrief seed (fresh DB) → assignment fails with 'RoleBrief seed missing'. Run pnpm db:seed.",
          "EMBEDDER is not assigned here — use embedding-engines.",
          "Disabling SYNTHESIZER halts all prompt generation.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/engines — create engines + API keys here first.",
          "/pr/yonet/embedding-engines — manage EMBEDDER role.",
          "/pr/yonet/personas — Personas are injected into SYNTHESIZER's system prompt.",
          "/pr/yonet/constitution — Active Constitution is auto-injected.",
          "/pr/yonet/training/distillations — DISTILLER proposals land here.",
        ],
      },
    ],
  },

  constitution: {
    title: "Constitution",
    purpose:
      "All versions of the system-rules document the Synthesizer injects into every generation. Versions are immutable; only one is active at a time. Read-only — changes flow from approved Training Distillations.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Review history and evolution of the system rules.",
          "Confirm which Constitution version is currently live.",
          "Verify that an approved distillation actually became active.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Version label — Unique slug (v1, v2.1).",
          "Content — Full system prompt injected into Synthesizer (collapsible block).",
          "isActive — Only one card carries the 'Active' badge.",
          "Changelog — Notes describing what changed.",
          "createdAt / activatedAt — Timestamps.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Find live version: card with 'Active' badge → expand 'Show content'.",
          "Inspect history: cards sorted newest activation first.",
          "Track changes: read changelog notes.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Cannot edit here — new Constitution comes from approved CONSTITUTION_UPDATE distillations.",
          "If no Constitution is active, Synthesizer runs with empty system prompt (quality drops).",
          "Fresh DB without seed → page shows 'pnpm db:seed' hint.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/training/distillations — approve Constitution updates.",
          "/pr/yonet/personas — injected alongside Constitution.",
          "/pr/yonet/agent-roles — SYNTHESIZER uses the active Constitution.",
        ],
      },
    ],
  },

  personas: {
    title: "Expert Personas",
    purpose:
      "Domain experts (SEO, copywriting, email, etc.) the Synthesizer injects when intent.domain matches a persona's domainSlug. Includes CRUD, reorder, export/import, usage stats, and soft-delete protection.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Add a domain expert (e.g. 'Senior SEO Strategist', domainSlug=seo-content).",
          "Update body, jargon, frameworks, or anti-patterns.",
          "Soft-deactivate a persona (history preserved).",
          "Backup or batch-setup via JSON export/import.",
          "'Orphan domain' warning: intent analyzer produced a domain with no persona.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "domainSlug — Required, unique, IMMUTABLE; matches intent.domain; pattern [a-z0-9-]+.",
          "name — Display name.",
          "body — 50–4000 chars; injected verbatim into Synthesizer.",
          "jargon — Up to 30 terms.",
          "frameworks — Up to 30 (AIDA, RICE, STAR…).",
          "antiPatterns — Up to 30 (domain-specific don'ts).",
          "notes — Internal memo.",
          "isActive — Inactive excluded from new generations; preserved in traces.",
          "sortOrder — Reorder via ↑/↓.",
          "usageCount (30d) — From Trace.contextJson->>'personaSlug'.",
          "avgQuality (30d) — Average trace quality score.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Create: 'New persona' → domainSlug + name + body (≥50) + jargon/frameworks/antiPatterns → Create.",
          "Edit: card → Edit. Everything except domainSlug; cache invalidates immediately.",
          "Soft delete (used): Delete → 'Deactivate' default keeps traces; 'Hard delete' removes history.",
          "Reorder: ↑/↓ updates sortOrder.",
          "Export: Export → JSON. Import: paste JSON → upsert / skip-existing.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "domainSlug cannot change; delete + recreate to fix.",
          "body shorter than 50 chars rejected.",
          "Very long jargon/framework lists bloat the Synthesizer prompt.",
          "Import JSON must match schema; otherwise parse error.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/training/distillations — PERSONA_UPDATE proposals.",
          "/pr/yonet/antipatterns — global anti-patterns (separate from per-persona ones).",
          "/pr/yonet/agent-roles — SYNTHESIZER injects active personas.",
          "/pr/yonet/traces — source of usage and quality stats.",
        ],
      },
    ],
  },

  antipatterns: {
    title: "Anti-Patterns",
    purpose:
      "Catalog of banned behaviors / patterns the Synthesizer output is validated against. Each rule is domain-specific or global, regex or literal. Read-only — new rules come from approved Training Distillations.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Review active rules (which 'block', which 'warn').",
          "Verify per-domain rules (email rules differ from SEO).",
          "Track rule growth as distillations are approved.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Pattern — Literal string or regex (per isRegex).",
          "isRegex — When true, pattern is interpreted as regex.",
          "domainSlug — When set, applies only to that domain; null = GLOBAL.",
          "Severity — 'warn' (log) or 'block' (reject synthesis).",
          "Rationale — Why this pattern is banned.",
          "isActive — Inactive rules are skipped during validation.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Scan active rules: sort by severity, read rationale.",
          "Find domain-specific rules: domainSlug column null = global.",
          "Strictness = total + block-severity count.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Cannot create/edit here — only via approved ANTIPATTERN distillations.",
          "Invalid regex breaks generation immediately on validation.",
          "Overly broad block rules can make synthesis impossible.",
          "Unanchored regex (no ^$) catches unintended substrings.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/training/distillations — source of rules.",
          "/pr/yonet/personas — each persona has its own antiPatterns array (different).",
          "/pr/yonet/agent-roles — SYNTHESIZER output is validated against these.",
        ],
      },
    ],
  },

  "training-resources": {
    title: "Training Resources",
    purpose:
      "Admin-curated feeds the Distiller processes (URL, RSS, sitemap, manual text, upload). Each resource declares which personas it serves, refresh policy, and status.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Add new sources (brand guides, style guides, blog posts).",
          "Set refresh frequency for RSS/sitemap.",
          "Target a resource at specific personas.",
          "Pause without deleting.",
          "Track snapshot/distillation counts produced.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Type — URL | RSS | SITEMAP | MANUAL_TEXT | UPLOAD.",
          "URL — Required for URL/RSS/SITEMAP.",
          "Title / Description — Display name + short summary.",
          "targetPersonaSlugs — Comma list; must match existing ExpertPersona.domainSlug.",
          "targetTags — Categorical tags.",
          "refreshPolicy — MANUAL | DAILY | WEEKLY | MONTHLY.",
          "Status — ACTIVE (in queue) | PAUSED | ERROR | ARCHIVED.",
          "lastFetchedAt / snapshotCount / distillationCount — Read-only metrics.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "New: New resource → Type → title/URL/personas/refresh → Save.",
          "RSS: Type=RSS, URL=feed.xml, refresh=DAILY → each article auto-snapshots.",
          "Manual text: Type=MANUAL_TEXT, no URL, refresh=MANUAL.",
          "Pause: Status → PAUSED, Distiller skips it.",
          "Delete: cascades snapshots + distillations (irreversible).",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Bad URL → 'url validation failed'.",
          "URL/RSS/SITEMAP type with empty URL is rejected.",
          "Persona slugs that don't exist are silently ignored by Distiller.",
          "Delete cascade is permanent.",
          "STATUS=ERROR has no UI retry; cron or pnpm script needed.",
          "MANUAL_TEXT does not auto-refresh; re-edit to update.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/training/distillations — generated proposals.",
          "/pr/yonet/personas — targets point here.",
          "/pr/yonet/agent-roles — DISTILLER processes these.",
        ],
      },
    ],
  },

  "training-distillations": {
    title: "Distillation Queue",
    purpose:
      "Review queue for AI-generated proposals (Constitution / Persona / AntiPattern / Exemplar) produced by the Distiller from Training Resources. Approved items are written to target tables by a background job.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Review and approve Distiller proposals.",
          "Reject low-quality or off-topic proposals with a reason.",
          "Track approval rate and source.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Type — CONSTITUTION_UPDATE | PERSONA_UPDATE | ANTIPATTERN | EXEMPLAR.",
          "Status — PENDING | APPROVED | REJECTED | APPLIED.",
          "targetSlug — domainSlug for PERSONA_UPDATE; null for CONSTITUTION_UPDATE.",
          "proposalJson — Full structured proposal (collapsible).",
          "Rationale — Distiller's explanation.",
          "reviewNotes — Admin's note.",
          "resourceTitle — Source training resource.",
          "createdAt — When generated.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Filter PENDING → read proposal → expand JSON.",
          "Approve: optional note → APPROVED → background job writes target → APPLIED.",
          "Reject: required reason → REJECTED.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "PERSONA_UPDATE with invalid domainSlug stays APPROVED but never APPLIED (orphan).",
          "ANTIPATTERN with invalid regex breaks generation when applied.",
          "APPLIED is final; no undo — manually fix the target if wrong.",
          "Bulk-approving without review degrades Constitution/Persona quality.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/training/resources — sources.",
          "/pr/yonet/personas — PERSONA_UPDATE writes here.",
          "/pr/yonet/constitution — CONSTITUTION_UPDATE writes a new version.",
          "/pr/yonet/antipatterns — ANTIPATTERN writes here.",
          "/pr/yonet/agent-roles — DISTILLER role generates these.",
        ],
      },
    ],
  },

  traces: {
    title: "Generation Traces",
    purpose:
      "Real-time audit log of the last 50 AI generations. Each trace stores input/output of all 6 pipeline stages (preprocessing, intent, context, synthesis, validation, finalize). Read-only — for debugging and monitoring.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Investigate pipeline failures (status=error).",
          "Monitor per-generation latency (totalLatencyMs).",
          "Verify which persona/engine was used.",
          "Check whether Safety validation caught anything.",
          "Trace a prompt's retry history (iterationOf).",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Time — createdAt timestamp.",
          "Status — ok | error.",
          "Modality — text | image | video etc.",
          "Latency — totalLatencyMs.",
          "Iteration — When iterationOf is set, this is a retry pointing to the original.",
          "Trace ID — First 12 chars (truncated).",
          "Also stored in DB: promptId, userId, intentJson, contextJson, synthesisJson, validationJson, finalJson.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Scan recent generations: flag errors or >10s latency.",
          "Persona usage: contextJson->>'personaSlug' (feeds Personas page stats).",
          "Latency spike: sort by totalLatencyMs to spot upstream API delays.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Only the last 50 traces are visible; older data needs a DB query.",
          "No filter UI (status, userId, modality).",
          "Detail page not implemented yet; clicking does nothing.",
          "status=error doesn't tell you the failing stage; check finalJson.errorMessage.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/personas — usage stats fed from here.",
          "/pr/yonet/agent-roles — assignments determine which engine appears in traces.",
        ],
      },
    ],
  },

  templates: {
    title: "Templates",
    purpose:
      "System-wide prompt templates: reusable structures with {{variable}} placeholders, scoped by modality and routed to AI engines via mapping.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Add or edit templates for a new workflow.",
          "Move through DRAFT → REVIEW → PUBLISHED.",
          "Bulk import from JSON.",
          "Track high-value templates by 30-day usage.",
          "Delete a template that has live usage (soft delete kicks in).",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Title — Required, max 120; unique per modality on import.",
          "Description — Max 500.",
          "Category — Required, max 60; matches taxonomy.",
          "Modality — text|image|code|audio|video.",
          "Engine — Recommended engine name (informational, not enforced at runtime).",
          "Template body — Max 20000; {{var}} regex /[a-zA-Z_][a-zA-Z0-9_]*/.",
          "Variables — Auto-detected from body + manual additions.",
          "Version — Max 20, default v1.0.",
          "Status — DRAFT | REVIEW | PUBLISHED (drives isActive).",
          "Sort order — Lower first.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Create: New template → Title/Category/Modality + body → Create.",
          "Publish: Status badge → PUBLISHED.",
          "Bulk import: Import → JSON → upsert by (title, modality).",
          "Retire used template: Delete → if has usage, dropped to DRAFT (soft); else hard delete.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "{{Var}} matching is case-sensitive.",
          "Switching modality does not migrate category bindings.",
          "Bulk import does not roll back on per-row errors.",
          "Auto-detected variables can't be manually removed; remove them from body.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/taxonomy — categories.",
          "/pr/yonet/engines — engine names.",
          "/pr/yonet/mapping — modality → engine routing.",
          "/pr/yonet/target-engines — downstream AIs that consume these prompts.",
          "/pr/yonet/questions — fills template variables.",
        ],
      },
    ],
  },

  engines: {
    title: "AI Engines",
    purpose:
      "Database registry of LLM and media engines (Anthropic, OpenAI, Google…): provider, model ID, unit cost, encrypted API key. NO HARDCODED MODELS in code — all engine choices live here.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Register a new LLM/media provider before templates or mapping reference it.",
          "Rotate an expired/rotated API key.",
          "Disable an engine without deleting it.",
          "Track unit cost.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Name — Display name, max 80.",
          "Provider — anthropic | openai | google | deepseek | openrouter | elevenlabs | runway | midjourney | other.",
          "Model ID — Exact ID used in API calls, max 60.",
          "costPerUnit — USD; default 0.001.",
          "Unit type — 1k_tokens | image | audio_minute | video_second.",
          "Encrypted API key — AES-256-GCM; never shown plaintext.",
          "Active toggle — New engines default to OFF.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Register LLM: Connect engine → name/provider/modelId → add → Add key → paste API key.",
          "Rotate key: Update key → new key → save.",
          "Disable: toggle Active off (stays in DB, hidden from dropdowns).",
          "Compare cost: scan Cost column under provider accordion.",
          "Verify connectivity: in /pr/yonet/mapping, click 'Test'.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Engines start INACTIVE; remember to enable them.",
          "Without an API key, the engine cannot run.",
          "Deleting an engine referenced by mapping/templates breaks those references (no cascade).",
          "Provider is immutable after creation.",
          "Model ID is stored verbatim; not validated against the provider — Mapping test reveals typos.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/agent-roles — engines here are assigned to v4 roles.",
          "/pr/yonet/mapping — modality → engine routing.",
          "/pr/yonet/embedding-engines — embedding engines are managed separately.",
          "/pr/yonet/library/settings — translation engine selection picks from here.",
        ],
      },
    ],
  },

  mapping: {
    title: "Modality Mapping",
    purpose:
      "Backward-compatibility routing layer: per modality (text, image, audio…) assign primary engine, fallback, questioner, and validator. Newer workflows can override at template level.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Assign the primary generation engine per modality.",
          "Define a fallback for primary failures.",
          "Set a questioner (gathers context) and validator (quality check).",
          "Test the engine before going live.",
          "Disable a modality entirely.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Modality — text|code|image|audio|video|music; immutable.",
          "Primary ID — Generation engine (required).",
          "Fallback ID — Auto-used if primary fails; must differ from primary.",
          "Questioner ID — Context gathering; defaults to primary if empty.",
          "Validator ID — Output quality check; skipped if empty.",
          "Active — When off, templates of this modality cannot run.",
          "Test — Sends a test prompt to primary; returns latency + preview.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Set up pipeline: per modality, choose Primary + (Fallback) → Save.",
          "Verify: Test → success + latency; on error, check API key in Engines.",
          "Failover: Primary=Anthropic, Fallback=OpenAI → automatic switchover.",
          "Disable modality: Active off → save (all dependent templates stop).",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Disabling an engine in Engines does not clear mapping references; calls will fail.",
          "Fallback should not equal primary; only visual check exists.",
          "Test only exercises primary, not the fallback/validator chain.",
          "Changes apply immediately — try outside production hours.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/engines — source engines.",
          "/pr/yonet/templates — templates inherit primary from mapping.",
          "/pr/yonet/target-engines — different concept (downstream AIs).",
        ],
      },
    ],
  },

  "target-engines": {
    title: "Target AIs",
    purpose:
      "Downstream AI destinations (ChatGPT, Midjourney, Sora, etc.) that receive generated prompts. Each target has a modality, slug, name, style hint, and optional icon. The system shapes prompts to that AI's format.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Add a new downstream service (new Midjourney version).",
          "Temporarily disable a target.",
          "Update style hint (e.g. 'Use JSON format for GPT-4').",
          "Add or change brand icon.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Slug — [a-z0-9-], IMMUTABLE after creation.",
          "Name — Display, max 120.",
          "Modality — text|code|image|video|audio|music.",
          "Prompt style hint — Max 2000; format guidance for this AI (not user-visible).",
          "Icon URL — Public URL.",
          "Active — Off = hidden from user dropdowns.",
          "Sort order — Auto-incremented; no manual reorder UI.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Add: fill the form → Add.",
          "Pause: uncheck Active (auto-saves).",
          "Permanent delete: Delete → confirm (no soft delete).",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "No inline edit — for slug/name/style hint, delete + recreate.",
          "No soft delete — deleting orphans user history.",
          "Broken icon URLs silently fail to load.",
          "Modality list is hardcoded; new modalities require a code change.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/templates — template prompts go to these targets.",
          "/pr/yonet/engines — production engines (different concept).",
          "/pr/yonet/library/[id] — assign Target AI per library prompt.",
        ],
      },
    ],
  },

  questions: {
    title: "Questions",
    purpose:
      "User-facing question catalog that fills template {{variables}}. Multiple choice (options) or free text; filtered by modality.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Gather new context variables for templates.",
          "Add multiple-choice options.",
          "Raise weight on important questions.",
          "Temporarily disable a question without deleting.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Modality — text|code|image|video|audio|music.",
          "Category — Grouping label (e.g. 'Audience', 'Tone'); free text.",
          "Question — User-visible text (max 500).",
          "Options — Comma-separated (max 8, each max 100). Empty = free text.",
          "Weight — Integer, default 0; higher = priority.",
          "Active — Off = not shown to users.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Multiple choice: modality + question + 'Short, Medium, Long' → Add.",
          "Free text: leave options empty → Add.",
          "Prioritize: weight=10 (others 0) → asked first.",
          "Disable: uncheck Active.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Options split on commas without trim — ' Short' ≠ 'Short'.",
          "Backend caps at 8 options; UI lets you enter more (silently truncated).",
          "Deletion is irreversible; no usage tracking.",
          "Weight is unbounded; negatives can destabilize downstream sort.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/templates — answers flow into {{var}}.",
          "/pr/yonet/mapping — questioner engine asks these.",
        ],
      },
    ],
  },

  taxonomy: {
    title: "Taxonomy",
    purpose:
      "Two-level hierarchical category tree per modality. Each category has slug, name, template count. Includes reorder, hide, and soft-delete protection.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Group templates by use case (Social, Code, Brand).",
          "Add sub-categories (Social → LinkedIn, Twitter…).",
          "Hide a category without breaking templates.",
          "Reorder via ↑/↓.",
          "Delete an empty category.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Modality — Immutable after creation.",
          "Slug — [a-z0-9-], unique within modality, max 60, IMMUTABLE.",
          "Name — Max 100.",
          "Description — Max 500.",
          "Parent ID — Max 1 level of nesting (no grandchildren).",
          "Active — Off = hidden from template selectors.",
          "Sort order — Changes via ↑/↓.",
          "Template count — Templates referencing this slug (read-only).",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Parent: Add → name → save.",
          "Sub: '+' button auto-binds parent.",
          "Reorder: ↑/↓.",
          "Hide without breaking templates: Active off.",
          "Delete: empty → hard delete; with templates → auto-deactivates (soft).",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Slug and modality are immutable; delete + recreate to fix.",
          "Maximum 1 level of nesting.",
          "Soft-deleted parents leave orphan templates with stale categoryId.",
          "Reorder only works among siblings under the same parent.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/templates — templates' category field points at these slugs.",
        ],
      },
    ],
  },

  "library-list": {
    title: "Prompt Library (List)",
    purpose:
      "Browse the entire prompt library: filter, search, single and bulk operations (embed/translate). Live progress (2s poll) for long-running jobs.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Review newly imported REVIEW prompts.",
          "Watch bulk embed/translate jobs.",
          "Filter by modality or status; search title/content.",
          "Bulk-embed unembedded prompts.",
          "Bulk-translate non-English prompts.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Table: Prompt (title + source), Modality, Status, Score (0-100), Len, Vec.",
          "Status: REVIEW (blue) | VERIFIED | GOLD (yellow) | ARCHIVED | REJECTED.",
          "Search — Substring across title + content (case-insensitive).",
          "Modality filter — text|image|video|audio|code.",
          "Status buttons — show counts; click to filter.",
          "50 rows per page.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Import: 'Import prompts' → upload → parse/translate/embed summary.",
          "Review: filter status=REVIEW → click title.",
          "Embed unembedded: 'Embed unembedded' → live done/failed/total/scanned counters.",
          "Start translation: auto language-detect + translate (idempotent — safe to restart).",
          "Change status: in detail, click button (no save needed — instant).",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Without a default embedding/translation engine, bulk jobs spin forever — set Settings → Library AI and embedding-engines first.",
          "No pause; only stop + restart (idempotent).",
          "Content search is slow on large libraries.",
          "Delete from detail is irreversible.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/library/[id] — single edit.",
          "/pr/yonet/library/import — upload files.",
          "/pr/yonet/library/settings — translation engine.",
          "/pr/yonet/embedding-engines — embedding engines.",
        ],
      },
    ],
  },

  "library-detail": {
    title: "Library — Single Prompt",
    purpose:
      "Edit a single library prompt's metadata (title, content, tags, target AI, quality score), translate or embed it individually, or delete it.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Fix title/content.",
          "Add intent tags.",
          "Bind a Target AI.",
          "Set a quality score.",
          "Change status (REVIEW/VERIFIED/GOLD/ARCHIVED/REJECTED).",
          "Delete the prompt (irreversible).",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Title — Optional; empty shows as 'Untitled'.",
          "Prompt * — The actual prompt text; contentLength updates on save.",
          "Expected output — Sample / success criteria.",
          "Modality — text|image|video|audio|code.",
          "Sub-category — Tag.",
          "Target AI — TargetEngine selection; empty = (generic).",
          "Quality score — 0-100 or null.",
          "Intent tags — Comma-separated.",
          "Notes — Internal.",
          "Status buttons — Instant, no save.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Polish: title/tags/score → Save.",
          "Status change: click button → instant.",
          "Re-embed: edit prompt text → Save → Embed.",
          "Translate: auto language-detect; English → 'Already English'.",
          "Ship: status=VERIFIED/GOLD + Target AI + tags.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Trash is IRREVERSIBLE.",
          "Status change skips save; double-clicks apply twice.",
          "Editing prompt text does not auto-re-embed.",
          "No embedding engine → Embed silently fails.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/library — list.",
          "/pr/yonet/library/settings — translation AI.",
          "/pr/yonet/embedding-engines — embedding engines.",
        ],
      },
    ],
  },

  "library-import": {
    title: "Library — Import",
    purpose:
      "Bulk upload prompt files (.md, .json, .jsonl, .csv, .yaml, .txt): parse, dedupe, auto-translate, optionally auto-embed, then save in REVIEW status.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "One-time seed: upload a curated dataset.",
          "Regular updates from external sources.",
          "Use Dry run to validate parse + dedup.",
          "Preview impact: parsed/translated/saved/embedded counts.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "File picker — .md, .json, .jsonl, .csv, .yaml, .yml, .txt.",
          "Source label — Stored in prompt.source.",
          "Default modality — Applied when missing in file (default text).",
          "Auto-embed — Enabled when an embedding engine exists.",
          "Dry run — Parse + validate, no save.",
          "Stats card — Total, verified/gold, in-review, modality breakdown.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Quick import: pick file → auto-embed on → Import.",
          "Dry run: see errors + dedup → disable dry run → real import.",
          "Translated corpus: configure Settings → Library AI → import (non-EN auto-translated).",
          "Large dataset: turn off auto-embed, then 'Embed unembedded' from list.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Without translation engine, non-EN prompts are imported as-is.",
          "Dedup is SHA-256 hash — only EXACT matches.",
          "Auto-embed only uses the DEFAULT embedding engine.",
          "Parse errors are per-row; successful rows still save.",
          "Very large files (>10k) may time out; split.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/library — results land here.",
          "/pr/yonet/library/settings — translation engine.",
          "/pr/yonet/embedding-engines — default embedding engine.",
        ],
      },
    ],
  },

  "library-settings": {
    title: "Library AI (Translation Engine)",
    purpose:
      "Pick the AI engine used during library import for automatic translation. Active AI engines listed as radio options; '(not set)' disables translation.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Enable non-EN library import.",
          "Switch translation models (GPT-4 → Claude).",
          "Disable translation entirely.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Translation Engine selector — All active AIEngines (provider/model).",
          "(not set) — Translation disabled.",
          "Save — Writes appSetting key 'translation_engine_id'.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "First time: add API key in Engines → return → pick engine → Save.",
          "Switch: pick another radio → Save (applies to FUTURE imports only).",
          "Disable: pick '(not set)' → Save.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "No active engines → page warns 'go to Engines and add an API key first'.",
          "Switching does not retranslate already-imported prompts.",
          "Engine must be isActive=true.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/engines — AI engines + API keys.",
          "/pr/yonet/library/import — uses this setting.",
          "/pr/yonet/embedding-engines — separate (for embeddings).",
        ],
      },
    ],
  },

  "embedding-engines": {
    title: "Embedding Engines",
    purpose:
      "Manage vector embedding models (OpenAI, Voyage, Cohere…) used for semantic search and similarity in the library: API keys, default selection, active/inactive, add wizard.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "First setup: add an embedding engine to enable search/similarity.",
          "Keep multiple providers (cost/perf trade-off).",
          "Set the default (used by auto-embed and bulk operations).",
          "Update keys; toggle active/inactive; delete.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Engine cards — Provider badge (color-coded), name, status dot, default badge, modelId, dim, cost.",
          "API key field — Password input + 'Save key' / 'Replace key'.",
          "Get key link — Direct link to provider's key page.",
          "Wizard (3 steps) — Provider → Model → API key + optional name/notes.",
          "Star (⭐) — Set as default.",
          "Active/Inactive toggle — Status dot.",
          "Delete — For non-default engines.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "First engine: Add → OpenAI → text-embedding-3-small → API key → Add.",
          "Set default: Star → automatically isActive=true.",
          "Update key: expand card → Replace key.",
          "Add backup: Voyage alongside OpenAI; switch default later.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Single default at a time; new default unsets the old.",
          "Can't delete the default — set another first.",
          "API keys are AES-256-GCM encrypted; never plaintext in UI.",
          "No active embedding engine → import auto-embed disabled.",
          "Switching default does not affect existing embeddings.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/library — bulk embed uses default.",
          "/pr/yonet/library/import — auto-embed uses default.",
          "/pr/yonet/agent-roles — EMBEDDER role is fed from here (no separate assignment).",
        ],
      },
    ],
  },

  blog: {
    title: "Blog",
    purpose:
      "CRUD for blog posts. Lifecycle: DRAFT → REVIEW → PUBLISHED → ARCHIVED. Tracks author, view count, publish date.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Create a new post (title, slug, excerpt, markdown body).",
          "Move between statuses.",
          "Update content while preserving the slug.",
          "Permanently delete a post (no soft delete).",
          "Track views and author attribution.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Title — 1–200, required; slug auto-generated on create.",
          "Slug — 1–120, [a-z0-9-]; unique, manually editable.",
          "Excerpt — 0–500; shown in lists.",
          "Body — 1–50000 markdown.",
          "Status — DRAFT | REVIEW | PUBLISHED | ARCHIVED.",
          "Author — Auto-set to creating admin's email.",
          "Views — Read-only counter.",
          "Published At — Set NOW on first PUBLISHED transition.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Publish: New post → fill → Status=Published → Save (publishedAt stamped).",
          "Draft → Review → Publish loop: Edit to advance status.",
          "Update published: Edit → modify → Save (don't change slug!).",
          "Archive: Status=Archived → not visible to public.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Changing the slug after publish breaks external links; no redirect.",
          "Markdown is not validated; broken syntax shows on the public page.",
          "Delete is permanent; no soft delete.",
          "No status transition gating; ARCHIVED → PUBLISHED is allowed.",
          "Re-PUBLISHing updates publishedAt to NOW (not idempotent).",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/i18n — translations if posts use i18n keys.",
          "/pr/yonet/emails — similar modal-edit pattern.",
        ],
      },
    ],
  },

  i18n: {
    title: "Languages (i18n)",
    purpose:
      "Manage translation messages for 21+ locales. Coverage % shows completion vs the English base. Bulk import via Gettext .po files.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Add a new language variant (e.g. 'pt-BR').",
          "Bulk-import translations from external tools (.po).",
          "Track coverage % to find incomplete locales.",
          "Delete a locale (cannot delete 'en').",
          "Preview an import with dry-run, then commit.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Code — 'xx' or 'xx-XX'; regex /^[a-z]{2}(-[A-Z]{2})?$/.",
          "Name — Looked up from NAMES (e.g. en→English); unknown codes shown uppercase.",
          "Coverage — (strings/baseStrings)*100, capped at 100.",
          "Strings — Translated keys in this locale.",
          "Base Strings — Keys in en.json (reference).",
          "RTL — True for ar/he/fa/ur.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "New language: 'Add language' → enter code → en.json copied, coverage 0%.",
          "Import .po: 'Import .po' → file → dry-run preview (added/updated/skipped) → confirm.",
          "Track completion: green bar = 100%.",
          "Delete locale: 'Delete locale' (not 'en') → confirm.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "'en' cannot be deleted (it's the base).",
          "Atomic write via temp+rename; a crash mid-import may leave temp files.",
          "Coverage counts only leaf strings; structural mismatches skew results.",
          "PO content is not validated; bad translations propagate verbatim.",
          "RTL flag is code-based (he/ar/fa/ur).",
          "Dry-run does not write; on connection loss, user must retry.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/blog — coordinate when posts use i18n keys.",
          "/pr/yonet/emails — templates are locale-specific; missing locale fails send.",
        ],
      },
    ],
  },

  emails: {
    title: "Email Templates",
    purpose:
      "Create, edit, and test transactional email templates. Grouped by slug; each (slug, locale) is unique. HTML + optional plain-text + sentCount tracking.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Define a new email type (e.g. 'password-reset-email').",
          "Edit subject / HTML / plain-text.",
          "Toggle a template active/inactive.",
          "Send a test preview email with sample variables.",
          "Track usage via Sent count.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Slug — [a-z0-9-], 1–60; (slug, locale) unique.",
          "Locale — 'xx' / 'xx-XX', default 'en'.",
          "Subject — 1–200, supports {{var}}.",
          "Body HTML — 1–50000, supports {{var}}, rendered via dangerouslySetInnerHTML.",
          "Body Text — 0–50000 optional fallback.",
          "Active — Off = not sent.",
          "Sent Count — Read-only counter.",
          "Updated At — Last edit timestamp.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Localized welcome: slug=welcome, locale=en → subject + HTML + active → Save. Repeat per locale.",
          "Send test: Edit → Send test → recipient email → fired with default sample variables.",
          "Disable per locale: Edit → isActive=false.",
          "Update content: Edit → Subject + HTML → Save (sync plain-text manually).",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "(slug, locale) is unique — duplicate fails with P2002.",
          "HTML rendered as-is; bad HTML can break email clients.",
          "{{var}} is naive string.replaceAll; nested or escaped braces fail.",
          "Unknown variable leaves the literal '{{x}}'.",
          "Plain-text is not auto-generated; sync it yourself.",
          "Delete is permanent; archive via isActive=false instead.",
          "Missing locale fails the send.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/i18n — locale management.",
          "/pr/yonet/blog — i18n keys can be shared.",
        ],
      },
    ],
  },

  analytics: {
    title: "Analytics",
    purpose:
      "Platform usage metrics over a rolling 30-day window: visitor trend, signup conversion, trial→paid, churn, geographic distribution. Computed from real DB sources (PageView, User, Subscription, GenerationTrace, AnalyticsEvent).",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Weekly/monthly growth check.",
          "Quarterly funnel-health review.",
          "Geographic expansion analysis (which countries are growing).",
          "Compare conversion before/after pricing or marketing changes.",
          "Churn pattern: identify retention risk.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "Visitors — Distinct sessions in 30d; delta vs prior 30d.",
          "Sign-up rate — (new users / visitors) %.",
          "Trial → paid — (new paid subs / new users) %.",
          "Churn (30d) — (cancellations / starting active) %.",
          "Funnel (5 steps) — Visit landing → Click 'Try free' → Created account → First generation → Paid upgrade. Each % is of visitors.",
          "Top countries — Locale→country mapping (12 shown), each with count + %.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Weekly snapshot: scan KPI deltas; visitors +10% = healthy.",
          "If trial→paid drops, check recent pricing or API breakages via audit/api logs.",
          "Geo growth: spikes in Top Countries → verify localization.",
          "Churn alarm: >8% → pull cancellation reasons from abuse.",
          "Funnel leakage: 'Click try-free' high but 'Created account' low → inspect signup UX/email verification.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Visitor data is batch-loaded overnight; today's live numbers appear tomorrow.",
          "Funnel %s are not cumulative; each step is % of visitors.",
          "Locale→country is approximate; not IP geolocation.",
          "Churn counts only status=CANCELED; trial expiries are excluded.",
          "No cohort/segment filter; use a DB query.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/system-settings — free tier impacts conversion.",
          "/pr/yonet/api — verify API uptime during conversion dips.",
          "/pr/yonet/audit — track config changes.",
          "/pr/yonet/abuse — policy violations may correlate with churn.",
        ],
      },
    ],
  },

  abuse: {
    title: "Abuse & Reports",
    purpose:
      "Centralized triage queue for user reports (spam, policy violation, rate-limit, bug, other). Tracks status (OPEN, INVESTIGATING, RESOLVED, DISMISSED) and resolver. Last 100 reports loaded; each action audit-logged.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Triage incoming user reports.",
          "Bug or feature complaint.",
          "Rate-limit exemption request.",
          "Post-resolution audit verification.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "ID — UUID; first 8 chars shown.",
          "Type — SPAM | POLICY_VIOLATION | RATE_LIMIT | BUG | OTHER (immutable).",
          "Severity — LOW | MED | HIGH | CRITICAL (color badge).",
          "Target — 'targetType:targetId' (e.g. 'user:abc123').",
          "Reporter — Reporter's email; null if admin-created.",
          "When — Relative time ('3h ago').",
          "Status — OPEN/INVESTIGATING/RESOLVED/DISMISSED. RESOLVED/DISMISSED auto-stamps resolvedAt + resolvedBy.",
          "Description — Max 2000.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Triage: OPEN → read → DISMISSED (invalid) or INVESTIGATING.",
          "Escalate: update record, route to abuse team off-platform → RESOLVED.",
          "Rate-limit exemption: check api logs → whitelist in /pr/yonet/system-settings → RESOLVED.",
          "Bug: reproduce → if fixed, RESOLVED; if not, DISMISSED.",
          "Delete: confirm → audit 'abuse.delete' written, report gone forever.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Type/Severity/Target/Description are immutable; delete + recreate to fix.",
          "Reporter is null when admin-created; table shows '—'.",
          "Delete is irreversible; audit persists but details are lost.",
          "Page is capped at 100; older reports drop off.",
          "Reverting status clears resolvedAt/By; old timestamp lost.",
          "targetType/Id is free text; recommend standardizing.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/api — match RATE_LIMIT reports against traffic.",
          "/pr/yonet/audit — cross-reference resolvedBy with admin actions.",
          "/pr/yonet/analytics — POLICY_VIOLATION spikes may correlate with churn.",
        ],
      },
    ],
  },

  api: {
    title: "API Logs",
    purpose:
      "Live tail of last 100 API calls (5s poll, pause/resume): method, path, status, latency, caller. 24-hour aggregate KPIs and hourly histogram surface error spikes.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "User says 'my API call failed' → filter by email to find recent calls.",
          "Performance: slow endpoint or cascading failure.",
          "Rate-limit verification: count 429s.",
          "Identify caller (email or key prefix).",
          "Operational alert: rising error24h indicates infrastructure issue.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "24h calls / 24h errors — Window KPIs (5s refresh); errors >0 turn red.",
          "Hourly histogram — 24 bars; blue=total, red segment=errors.",
          "Status filter — all | 2xx | 3xx | 4xx | 5xx.",
          "Path filter — Case-sensitive substring.",
          "User filter — Case-insensitive (email or key prefix).",
          "Table: Time, Method, Path, Caller (email or 'sk-abc…'), Status, Latency.",
          "Pause/Resume + manual Refresh.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "User report: User filter = email → Refresh → check Status (401/403?).",
          "Error spike: 24h errors rising → find histogram hour → Status=5xx → scan Path.",
          "Latency: filter by user → sort latency desc → measure median.",
          "Rate-limit test: Pause → load test → count 4xx.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "Only last 100 rows; older calls age out.",
          "5s staleness; for high-frequency, Pause + manual Refresh.",
          "Broad substring filters can be slow; be specific.",
          "Histogram likely UTC; table is local TZ — confusion possible.",
          "Caller email shown openly (GDPR-sensitive — consider RBAC).",
          "No body/response, just metadata.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/system-settings — Limits (rate-limit thresholds).",
          "/pr/yonet/audit — cross-reference apiKey.* events.",
          "/pr/yonet/abuse — RATE_LIMIT reports.",
        ],
      },
    ],
  },

  "system-settings": {
    title: "System Settings",
    purpose:
      "Platform-wide configuration: free-tier quotas, per-plan rate limits, branding colors, webhook endpoints. Changes apply instantly; audit-logged.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Tune free trial experience (limit + teaser blur %).",
          "Add a new plan-tier rate limit.",
          "Change branding colors.",
          "Add a new webhook partner / event subscription.",
          "Emergency feature gate: free limit=0 to halt self-service.",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "General — Site URL, Support email (UI-only, no real persistence), Allow signups, Require email verification.",
          "Branding — Primary color (default #3b3a6e), Accent color (default #c98a3a).",
          "Limits — Free prompt limit (≥0 int), Counting scope (lifetime|monthly), Teaser % (1–100).",
          "Limits → Rate limits table — UI preview; persistence not yet wired.",
          "Webhooks — Endpoint list (mock data); 'Add webhook' implementation pending.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Launch free tier: limit=2, lifetime, teaser=10% → monitor → if conversion low, raise teaser to 30%.",
          "Adapt to market: TR=monthly+10, US=lifetime+2.",
          "Emergency stop: limit=0 → all free requests get 403 + uncheck Allow signups.",
          "Branding A/B: change Primary color → audit 'appSetting.set' record.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "No transactional consistency: one of three fields might fail mid-save; verify in audit.",
          "Switching counting scope does not retroactively reset prior counts.",
          "Teaser blur is frontend (CSS); users can inspect & remove — server-side enforcement needed.",
          "Rate-limit Save is not wired yet; edits are lost on refresh.",
          "Branding color changes may appear delayed due to cache.",
          "No webhook delivery monitoring.",
          "Email-verification toggle does not re-verify already-verified users.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/analytics — observe teaser/limit impact on conversion.",
          "/pr/yonet/abuse — abuse spikes after limit=0.",
          "/pr/yonet/audit — 'appSetting.set*' actions.",
        ],
      },
    ],
  },

  audit: {
    title: "Audit Log",
    purpose:
      "Immutable append-only ledger of all admin and system actions. Every state change is logged with actor, timestamp, target, and IP. For compliance, post-mortems, and accountability.",
    sections: [
      {
        heading: S.when,
        bullets: [
          "Post-incident: 'When and by whom was user X deleted?'",
          "Compliance audit: 'All actions on user data in the last 90 days'.",
          "Forensic: 'Who created this API key?'",
          "Access control: did an unauthorized account perform a delete?",
          "Accountability: actor made 100 changes in an hour — was it sanctioned?",
        ],
      },
      {
        heading: S.fields,
        bullets: [
          "When — createdAt (local TZ).",
          "Actor — Admin email; system actions show 'system'.",
          "Action — namespace.verb (e.g. 'user.delete', 'appSetting.setFreePromptConfig').",
          "Target — 'targetType:targetId' (UUID truncated 16 + …).",
          "IP — Source IP (depends on proxy validation; spoofing risk).",
          "Filters — Action prefix (case-sensitive), Actor email contains (case-insensitive); written to URL query.",
        ],
      },
      {
        heading: S.flows,
        bullets: [
          "Post-mortem: Actor=alice → scan timeline → find Target='user:X'.",
          "Compliance: action='plan.' → manually scope to date range (no UI date filter).",
          "API key forensics: action='apiKey.' → find key prefix in Target.",
          "Access audit: action='user.delete' → flag any non-admin email.",
        ],
      },
      {
        heading: S.pitfalls,
        bullets: [
          "No audit-of-audit; all admins see everything (consider RBAC for PII-sensitive roles).",
          "IP comes from X-Forwarded-For; unreliable without validated proxy chain.",
          "Only last 100 rows visible; full compliance needs DB export.",
          "Action filter is case-sensitive prefix; 'abort' won't match 'abuse.create'.",
          "targetId truncated; full UUID requires DB.",
          "Meta JSON not shown in table (old/new value via DB).",
          "createdAt stored UTC, rendered local — can confuse.",
        ],
      },
      {
        heading: S.related,
        bullets: [
          "/pr/yonet/abuse — cross-reference 'abuse.*' actions.",
          "/pr/yonet/system-settings — 'appSetting.*' records.",
          "/pr/yonet/api — IP correlation with API logs.",
        ],
      },
    ],
  },
};
