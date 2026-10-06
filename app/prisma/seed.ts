/**
 * promtexpress seed
 * Run with: pnpm db:seed
 *
 * Idempotent — uses upsert by unique fields. Safe to re-run.
 *
 * Seeds:
 *   - 4 Plan rows (Free, Starter, Pro, Enterprise)
 *   - 7 AiEngine rows (text+code+image+audio+video) — all isActive=false
 *     until admin enters real API keys via /pr/yonet/engines
 *   - 7 PromptTemplate rows (matching prototype examples)
 *   - 1 admin User: ADMIN_EMAIL from the environment (role=ADMIN)
 */
import { PrismaClient, UserRole, Prisma } from "@prisma/client";
import { CONSTITUTION_V1 } from "./seeds/constitution-v1";
import { CONSTITUTION_V1_2 } from "./seeds/constitution-v1-2";
import { ROLE_BRIEFS } from "./seeds/role-briefs";
import { EXPERT_PERSONAS } from "./seeds/expert-personas";
import { PROVIDER_PROFILES } from "./seeds/provider-profiles";
import { ANTI_PATTERN_RULES } from "./seeds/antipatterns";
import { seedTargetEngineHints, seedTargetEngineAuthoringCriteria } from "./seeds/target-engines";
import { seedIntentClarifiers } from "./seeds/intent-clarifiers";
import { seedGptImage2Exemplars } from "./seeds/seed-gpt-image-2-exemplars";

const db = new PrismaClient();

async function main() {
  // ── Plans + Extra Credit Packs (REMOVED 2026-05-08) ───
  //
  // Plan and ExtraCreditPack rows are managed EXCLUSIVELY through the admin
  // panel at /pr/yonet/plans (and the corresponding extra-pack admin UI).
  // The seed file no longer touches these tables — re-running `pnpm db:seed`
  // will not overwrite or create plan/pack rows.
  //
  // Single source of truth: Plan / ExtraCreditPack tables, edited via
  // /pr/yonet/plans. To bootstrap a brand-new database, use that admin UI
  // (or the create-plan / create-pack server actions).
  //
  // Historical seed bodies are removed in this commit (plan rule from
  // 2026-05-08 user directive). For reference, see git history of this file.
  const planSeeds: never[] = [];
  void planSeeds;

  // ── AI Engines ────────────────────────────────────────
  // encryptedKey is empty placeholder; admin sets real keys via UI.
  const engineSeeds = [
    { name: "Claude Sonnet 4", provider: "anthropic", modelId: "claude-sonnet-4-20250514", costPerUnit: 0.012, sortOrder: 1 },
    { name: "GPT-4o", provider: "openai", modelId: "gpt-4o-2024-11-20", costPerUnit: 0.014, sortOrder: 2 },
    { name: "Gemini 2.0 Pro", provider: "google", modelId: "gemini-2.0-pro-exp", costPerUnit: 0.009, sortOrder: 3 },
    { name: "Deepseek V3", provider: "deepseek", modelId: "deepseek-chat", costPerUnit: 0.0003, sortOrder: 4 },
    { name: "Deepseek R1", provider: "deepseek", modelId: "deepseek-reasoner", costPerUnit: 0.0014, sortOrder: 5 },
    { name: "Deepseek V4", provider: "deepseek", modelId: "deepseek-v4", costPerUnit: 0.0005, sortOrder: 6 },
    { name: "Midjourney v6", provider: "midjourney", modelId: "v6", costPerUnit: 0.06, unitType: "image", sortOrder: 7 },
    { name: "DALL·E 3", provider: "openai", modelId: "dall-e-3", costPerUnit: 0.04, unitType: "image", sortOrder: 8 },
    { name: "ElevenLabs v2", provider: "elevenlabs", modelId: "eleven_multilingual_v2", costPerUnit: 0.03, unitType: "minute", sortOrder: 9 },
    { name: "Runway Gen-3", provider: "runway", modelId: "gen3", costPerUnit: 0.18, unitType: "clip", sortOrder: 10 },
  ];

  for (const e of engineSeeds) {
    await db.aiEngine.upsert({
      where: { name: e.name },
      update: {
        provider: e.provider,
        modelId: e.modelId,
        costPerUnit: e.costPerUnit,
        unitType: e.unitType ?? "1k_tokens",
        sortOrder: e.sortOrder,
      },
      create: {
        ...e,
        unitType: e.unitType ?? "1k_tokens",
        encryptedKey: "",
        isActive: false, // admin must add key + flip switch
      },
    });
  }
  console.log(`✓ Engines: ${engineSeeds.length}`);

  // ── Prompt Templates ──────────────────────────────────
  const templateSeeds = [
    {
      title: "LinkedIn launch post — series B",
      category: "Social",
      modality: "text",
      engine: "Claude Sonnet 4",
      template: `# Role: Senior brand writer
# Audience: {{audience}}
# Tone: {{tone}}
# Constraints:
  - {{word_count}} words
  - Open with a single line of context
  - Close with a soft CTA referencing {{cta_link}}
# Output: Plain text post`,
      variables: ["audience", "tone", "word_count", "cta_link"],
    },
    {
      title: "Hero image — sustainable fashion",
      category: "Image",
      modality: "image",
      engine: "Midjourney v6",
      template: `Editorial product still: {{product_name}}, {{lighting}} lighting, {{mood}} mood, no text overlay. {{style_notes}}`,
      variables: ["product_name", "lighting", "mood", "style_notes"],
    },
    {
      title: "Spec → Jest tests",
      category: "Code",
      modality: "code",
      engine: "GPT-4o",
      template: `# Task: Generate failing Jest tests from this spec, then minimum implementation.
# Spec:
{{spec}}
# Output: Two code blocks: 1) tests.spec.ts, 2) implementation.ts`,
      variables: ["spec"],
    },
    {
      title: "30s product VO",
      category: "Audio",
      modality: "audio",
      engine: "ElevenLabs v2",
      template: `Voice: {{voice_id}}. Style: {{style}}. Speed: ~150 wpm. Script:
{{script}}`,
      variables: ["voice_id", "style", "script"],
    },
    {
      title: "Onboarding email — day 3",
      category: "Lifecycle",
      modality: "text",
      engine: "Claude Sonnet 4",
      template: `# Role: Lifecycle email writer
# Audience: New user, day 3 since signup
# Goal: Re-engagement; reference one feature ({{feature}}) and one CTA ({{cta}})
# Tone: Warm, brief
# Length: 80–120 words
# Output: Subject line + body`,
      variables: ["feature", "cta"],
    },
    {
      title: "Ad storyboard",
      category: "Video",
      modality: "video",
      engine: "Runway Gen-3",
      template: `Storyboard for {{duration}}s ad: {{product_name}}.
Frame-by-frame description (5 frames). Audience: {{audience}}. Style: {{style}}.`,
      variables: ["duration", "product_name", "audience", "style"],
    },
    {
      title: "Twitter thread — AI ethics",
      category: "Social",
      modality: "text",
      engine: "Claude Sonnet 4",
      template: `# Format: Twitter thread, {{tweet_count}} tweets, ≤280 chars each
# Topic: {{topic}}
# Stance: {{stance}}
# Output: JSON {tweets: [{n, text, chars}]}`,
      variables: ["tweet_count", "topic", "stance"],
    },
  ];

  for (const t of templateSeeds) {
    // PromptTemplate has no unique field other than id; use title+modality for idempotent re-runs
    const existing = await db.promptTemplate.findFirst({
      where: { title: t.title, modality: t.modality },
    });
    if (existing) {
      await db.promptTemplate.update({
        where: { id: existing.id },
        data: { ...t, variables: t.variables },
      });
    } else {
      await db.promptTemplate.create({
        data: { ...t, variables: t.variables },
      });
    }
  }
  console.log(`✓ Templates: ${templateSeeds.length}`);

  // ── Admin user ────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@example.com";
  await db.user.upsert({
    where: { email: adminEmail },
    update: { role: UserRole.ADMIN },
    create: {
      email: adminEmail,
      role: UserRole.ADMIN,
      name: "Hakan Güven",
      locale: "tr",
    },
  });
  console.log(`✓ Admin user: ${adminEmail}`);

  // ════════════════════════════════════════════════════════════════════
  // v4 PROMPT ENGINE SEEDS (Constitution + RoleBrief + ExpertPersona)
  // Direktif #1: AI motor atama YOK — admin /pr/yonet/agent-roles'tan atar
  // ════════════════════════════════════════════════════════════════════

  // ── Constitution v1.0 (geçmiş kayıt, isActive=false) ──
  await db.constitution.upsert({
    where: { version: CONSTITUTION_V1.version },
    update: { content: CONSTITUTION_V1.content, changelog: CONSTITUTION_V1.changelog, isActive: false },
    create: {
      version: CONSTITUTION_V1.version,
      content: CONSTITUTION_V1.content,
      changelog: CONSTITUTION_V1.changelog,
      isActive: false,
      activatedAt: new Date(),
    },
  });

  // ── Constitution v1.2 (AKTİF) ─────────────────────────
  // Modality-specific output discipline + reasoning preamble yasağı
  await db.constitution.upsert({
    where: { version: CONSTITUTION_V1_2.version },
    update: { content: CONSTITUTION_V1_2.content, changelog: CONSTITUTION_V1_2.changelog, isActive: true, activatedAt: new Date() },
    create: {
      version: CONSTITUTION_V1_2.version,
      content: CONSTITUTION_V1_2.content,
      changelog: CONSTITUTION_V1_2.changelog,
      isActive: true,
      activatedAt: new Date(),
    },
  });
  // Sadece tek satır isActive=true olabilir — v1.2 dışındakiler pasif
  await db.constitution.updateMany({
    where: { isActive: true, version: { not: CONSTITUTION_V1_2.version } },
    data: { isActive: false },
  });
  console.log(`✓ Constitution: ${CONSTITUTION_V1_2.version} (active), ${CONSTITUTION_V1.version} (archived)`);

  // ── RoleBriefs (5 rol) ────────────────────────────────
  // 2026-05-05 — outputSchema may be null (SYNTHESIZER plain-text mode).
  // Prisma requires Prisma.JsonNull for explicit JSON-null in JSON columns.
  for (const rb of ROLE_BRIEFS) {
    const outputSchemaValue =
      rb.outputSchema === null ? Prisma.JsonNull : rb.outputSchema;
    await db.roleBrief.upsert({
      where: { roleSlug: rb.roleSlug },
      update: {
        version: rb.version,
        systemPrompt: rb.systemPrompt,
        outputSchema: outputSchemaValue,
        exemplars: rb.exemplars,
      },
      create: {
        roleSlug: rb.roleSlug,
        version: rb.version,
        systemPrompt: rb.systemPrompt,
        outputSchema: outputSchemaValue,
        exemplars: rb.exemplars,
      },
    });
  }
  console.log(`✓ Role briefs: ${ROLE_BRIEFS.length}`);

  // ── ExpertPersonas (30 domain) ────────────────────────
  for (const p of EXPERT_PERSONAS) {
    await db.expertPersona.upsert({
      where: { domainSlug: p.domainSlug },
      update: {
        name: p.name,
        body: p.body,
        jargon: p.jargon,
        frameworks: p.frameworks,
        antiPatterns: p.antiPatterns,
        sortOrder: p.sortOrder,
      },
      create: {
        domainSlug: p.domainSlug,
        name: p.name,
        body: p.body,
        jargon: p.jargon,
        frameworks: p.frameworks,
        antiPatterns: p.antiPatterns,
        sortOrder: p.sortOrder,
      },
    });
  }
  console.log(`✓ Expert personas: ${EXPERT_PERSONAS.length}`);

  // ── ProviderProfiles (5 provider) ─────────────────────
  for (const pp of PROVIDER_PROFILES) {
    await db.providerProfile.upsert({
      where: { provider: pp.provider },
      update: {
        styleHint: pp.styleHint,
        hyperparams: pp.hyperparams as unknown as Prisma.InputJsonValue,
      },
      create: {
        provider: pp.provider,
        styleHint: pp.styleHint,
        hyperparams: pp.hyperparams as unknown as Prisma.InputJsonValue,
      },
    });
  }
  console.log(`✓ Provider profiles: ${PROVIDER_PROFILES.length}`);

  // ── AntiPatternRule (~40 kural) ───────────────────────
  for (const r of ANTI_PATTERN_RULES) {
    // pattern + domainSlug benzersizliği için unique constraint yok; o yüzden
    // findFirst + create/update mantığı.
    const existing = await db.antiPatternRule.findFirst({
      where: { pattern: r.pattern, domainSlug: r.domainSlug },
      select: { id: true },
    });
    if (existing) {
      await db.antiPatternRule.update({
        where: { id: existing.id },
        data: { isRegex: r.isRegex, severity: r.severity, rationale: r.rationale, isActive: true },
      });
    } else {
      await db.antiPatternRule.create({
        data: {
          domainSlug: r.domainSlug,
          pattern: r.pattern,
          isRegex: r.isRegex,
          severity: r.severity,
          rationale: r.rationale,
          isActive: true,
        },
      });
    }
  }
  console.log(`✓ Anti-pattern rules: ${ANTI_PATTERN_RULES.length}`);

  // ── TargetEngine.promptStyleHint zenginleştirme (Faz 5 / entity-aware-synthesis)
  const teResult = await seedTargetEngineHints(db);
  console.log(`✓ TargetEngine hints: ${teResult.updated} updated, ${teResult.skipped} skipped`);

  // ── TargetEngine authoring criteria (FAZ 1, 2026-05-03 — charLimit, format, structuredFieldSpec, …)
  const criResult = await seedTargetEngineAuthoringCriteria(db);
  console.log(`✓ TargetEngine authoring criteria: ${criResult.updated} updated, ${criResult.skipped} skipped`);

  // ── IntentClarifierRule (FAZ 3, 2026-05-03 — modality-spesifik clarifying questions)
  const clarifierResult = await seedIntentClarifiers(db);
  console.log(
    `✓ Intent clarifier rules: ${clarifierResult.inserted} inserted, ${clarifierResult.updated} updated, ${clarifierResult.skipped} skipped`,
  );

  // ── GPT Image 2 GOLD exemplarları (RAG'ın doğru format öğretmesi için)
  const gptImg2Result = await seedGptImage2Exemplars(db);
  console.log(
    `✓ GPT Image 2 exemplars: ${gptImg2Result.inserted} inserted, ${gptImg2Result.skipped} skipped`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
