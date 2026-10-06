/**
 * Lokal-only: Seed verilerini idempotent INSERT/UPDATE SQL'e çevir.
 * Üretilen sql sunucuya gönderilip psql ile uygulanır.
 *
 * Kullanım: pnpm tsx prisma/seeds/_export-sql.ts > prisma/seeds/v4-seed.sql
 */
import { CONSTITUTION_V1 } from "./constitution-v1";
import { ROLE_BRIEFS } from "./role-briefs";
import { EXPERT_PERSONAS } from "./expert-personas";
import { PROVIDER_PROFILES } from "./provider-profiles";
import { ANTI_PATTERN_RULES } from "./antipatterns";

function escSql(s: string): string {
  return s.replace(/'/g, "''");
}

function jsonLit(obj: unknown): string {
  return `'${escSql(JSON.stringify(obj))}'::jsonb`;
}

function arrayLit(arr: string[]): string {
  if (arr.length === 0) return "ARRAY[]::text[]";
  return `ARRAY[${arr.map((s) => `'${escSql(s)}'`).join(",")}]::text[]`;
}

const out: string[] = [];
out.push("-- v4 Seeds — Constitution + RoleBriefs + ExpertPersonas");
out.push("-- Idempotent (UPSERT). Run once or repeatedly safely.");
out.push("BEGIN;");

// ── Constitution ─────────────────────────────────────────
const c = CONSTITUTION_V1;
out.push(`-- Constitution v${c.version}`);
out.push(`INSERT INTO "Constitution" (id, version, content, changelog, "isActive", "activatedAt", "createdAt") VALUES`);
out.push(`  (gen_random_uuid()::text, '${escSql(c.version)}', '${escSql(c.content)}', '${escSql(c.changelog)}', TRUE, NOW(), NOW())`);
out.push(`ON CONFLICT (version) DO UPDATE SET content = EXCLUDED.content, changelog = EXCLUDED.changelog;`);
out.push(`UPDATE "Constitution" SET "isActive" = FALSE WHERE "isActive" = TRUE AND version <> '${escSql(c.version)}';`);
out.push(`UPDATE "Constitution" SET "isActive" = TRUE, "activatedAt" = COALESCE("activatedAt", NOW()) WHERE version = '${escSql(c.version)}';`);
out.push("");

// ── RoleBriefs ────────────────────────────────────────────
out.push(`-- 5 RoleBriefs`);
for (const rb of ROLE_BRIEFS) {
  out.push(`INSERT INTO "RoleBrief" (id, "roleSlug", version, "systemPrompt", "outputSchema", exemplars, "isActive", "updatedAt") VALUES`);
  out.push(`  (gen_random_uuid()::text, '${rb.roleSlug}'::"AgentRoleSlug", '${escSql(rb.version)}', '${escSql(rb.systemPrompt)}', ${jsonLit(rb.outputSchema)}, ${jsonLit(rb.exemplars)}, TRUE, NOW())`);
  out.push(`ON CONFLICT ("roleSlug") DO UPDATE SET version = EXCLUDED.version, "systemPrompt" = EXCLUDED."systemPrompt", "outputSchema" = EXCLUDED."outputSchema", exemplars = EXCLUDED.exemplars, "updatedAt" = NOW();`);
}
out.push("");

// ── ExpertPersonas ────────────────────────────────────────
out.push(`-- 30 ExpertPersonas`);
for (const p of EXPERT_PERSONAS) {
  out.push(`INSERT INTO "ExpertPersona" (id, "domainSlug", name, body, jargon, frameworks, "antiPatterns", "isActive", "sortOrder", "createdAt", "updatedAt") VALUES`);
  out.push(`  (gen_random_uuid()::text, '${escSql(p.domainSlug)}', '${escSql(p.name)}', '${escSql(p.body)}', ${arrayLit(p.jargon)}, ${arrayLit(p.frameworks)}, ${arrayLit(p.antiPatterns)}, TRUE, ${p.sortOrder}, NOW(), NOW())`);
  out.push(`ON CONFLICT ("domainSlug") DO UPDATE SET name = EXCLUDED.name, body = EXCLUDED.body, jargon = EXCLUDED.jargon, frameworks = EXCLUDED.frameworks, "antiPatterns" = EXCLUDED."antiPatterns", "sortOrder" = EXCLUDED."sortOrder", "updatedAt" = NOW();`);
}
out.push("");

// ── ProviderProfiles ─────────────────────────────────────
out.push(`-- ${PROVIDER_PROFILES.length} ProviderProfiles`);
for (const pp of PROVIDER_PROFILES) {
  out.push(`INSERT INTO "ProviderProfile" (id, provider, "styleHint", hyperparams, "isActive", "updatedAt") VALUES`);
  out.push(`  (gen_random_uuid()::text, '${escSql(pp.provider)}', '${escSql(pp.styleHint)}', ${jsonLit(pp.hyperparams)}, TRUE, NOW())`);
  out.push(`ON CONFLICT (provider) DO UPDATE SET "styleHint" = EXCLUDED."styleHint", hyperparams = EXCLUDED.hyperparams, "updatedAt" = NOW();`);
}
out.push("");

// ── AntiPatternRules ─────────────────────────────────────
// pattern+domainSlug için unique constraint yok; idempotency: WHERE NOT EXISTS pattern.
out.push(`-- ${ANTI_PATTERN_RULES.length} AntiPatternRules`);
out.push(`-- Idempotency: domainSlug+pattern eşleşmesi varsa update, yoksa insert.`);
for (const r of ANTI_PATTERN_RULES) {
  const domSql = r.domainSlug === null ? "NULL" : `'${escSql(r.domainSlug)}'`;
  out.push(`INSERT INTO "AntiPatternRule" (id, "domainSlug", pattern, "isRegex", severity, rationale, "isActive", "createdAt", "updatedAt")`);
  out.push(`SELECT gen_random_uuid()::text, ${domSql}, '${escSql(r.pattern)}', ${r.isRegex}, '${escSql(r.severity)}', '${escSql(r.rationale)}', TRUE, NOW(), NOW()`);
  out.push(`WHERE NOT EXISTS (SELECT 1 FROM "AntiPatternRule" WHERE "domainSlug" IS NOT DISTINCT FROM ${domSql} AND pattern = '${escSql(r.pattern)}');`);
  out.push(`UPDATE "AntiPatternRule" SET "isRegex" = ${r.isRegex}, severity = '${escSql(r.severity)}', rationale = '${escSql(r.rationale)}', "isActive" = TRUE, "updatedAt" = NOW()`);
  out.push(`WHERE "domainSlug" IS NOT DISTINCT FROM ${domSql} AND pattern = '${escSql(r.pattern)}';`);
}
out.push("");

out.push("COMMIT;");
out.push("");
out.push(`-- Verify`);
out.push(`SELECT 'Constitution' AS tbl, count(*) FROM "Constitution" WHERE "isActive" = TRUE`);
out.push(`UNION ALL SELECT 'RoleBrief', count(*) FROM "RoleBrief"`);
out.push(`UNION ALL SELECT 'ExpertPersona', count(*) FROM "ExpertPersona"`);
out.push(`UNION ALL SELECT 'ProviderProfile', count(*) FROM "ProviderProfile"`);
out.push(`UNION ALL SELECT 'AntiPatternRule', count(*) FROM "AntiPatternRule";`);

console.log(out.join("\n"));
