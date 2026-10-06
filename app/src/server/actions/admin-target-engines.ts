"use server";

import { db } from "@/db/client";
import { requireAdmin, writeAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const TIER_VALUES = new Set(["flagship", "standard", "legacy"]);
const CAPABILITY_VALUES = new Set([
  "multimodal",
  "reasoning",
  "long-context",
  "cheap",
  "open-weights",
  "fast",
]);
const FORMAT_VALUES = new Set(["plain", "json", "markdown", "structured", "parameterized"]);

function normalizeFormat(v?: string | null): string | null {
  if (v === undefined || v === null || v === "") return null;
  const f = v.trim().toLowerCase();
  if (!FORMAT_VALUES.has(f)) throw new Error(`Invalid preferredFormat: ${v}`);
  return f;
}

function normalizeCharLimit(v?: number | string | null): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) {
    throw new Error(`Invalid charLimit (1..1000000): ${v}`);
  }
  return Math.floor(n);
}

function normalizeJson(v: unknown): unknown {
  if (v === undefined || v === null) return null;
  if (typeof v === "string") {
    const t = v.trim();
    if (!t) return null;
    try {
      return JSON.parse(t);
    } catch {
      throw new Error("Invalid JSON value");
    }
  }
  return v;
}

function normalizeTier(v?: string | null): string | null {
  if (v === undefined || v === null || v === "") return null;
  const t = v.trim().toLowerCase();
  if (!TIER_VALUES.has(t)) throw new Error(`Invalid tier: ${v}`);
  return t;
}

function normalizeCapabilities(arr?: string[] | null): string[] {
  if (!arr || arr.length === 0) return [];
  const cleaned = Array.from(new Set(arr.map((c) => c.trim().toLowerCase())));
  for (const c of cleaned) {
    if (!CAPABILITY_VALUES.has(c)) throw new Error(`Invalid capability: ${c}`);
  }
  return cleaned;
}

function normalizePreferredLanguage(v?: string | null): string | null {
  if (v === undefined || v === null || v === "") return null;
  const lang = v.trim().toLowerCase();
  if (lang === "multilingual") return "multilingual";
  if (/^[a-z]{2}$/.test(lang)) return lang;
  throw new Error(`Invalid preferredLanguage (use ISO 639-1 or "multilingual"): ${v}`);
}

function normalizeBrandColor(v?: string | null): string | null {
  if (v === undefined || v === null || v === "") return null;
  const c = v.trim();
  if (!HEX_RE.test(c)) throw new Error(`Invalid brandColor (need #RRGGBB): ${v}`);
  return c.toLowerCase();
}

/**
 * 2026-05-12 (Garantili Teslimat v2) — preferredFormat × structuredFieldSpec coherence.
 *
 * Kanıt K13 (Plan v2): Synthesizer shape gate (4-synthesizer.ts L168-207) doğal-dil
 * target'larda anyOf bypass'i için `preferredFormat === "plain" || structuredFieldSpec == null`
 * kombinasyonunu arar. Admin yarın "structured + spec=NULL" veya "plain + spec=dolu"
 * tutarsız bir kombinasyon kaydettiğinde gate yanlış karar verir → Sora-tipi timeout
 * yeniden ortaya çıkar. Form seviyesinde kalıcı koruma.
 */
function isNonEmptyObjectSpec(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v !== "object") return false;
  if (Array.isArray(v)) return v.length > 0;
  return Object.keys(v as Record<string, unknown>).length > 0;
}

function validateFormatCoherence(
  preferredFormat: string | null,
  structuredFieldSpec: unknown,
): void {
  const hasSpec = isNonEmptyObjectSpec(structuredFieldSpec);
  if (preferredFormat === "structured" && !hasSpec) {
    throw new Error(
      "When preferredFormat='structured', structuredFieldSpec must be a non-empty object describing the required fields.",
    );
  }
  if (preferredFormat === "plain" && hasSpec) {
    throw new Error(
      "When preferredFormat='plain', structuredFieldSpec must be null (move template fields into authoringTipsMd as guidance).",
    );
  }
}

function normalizeReleasedAt(v?: string | Date | null): Date | null {
  if (v === undefined || v === null || v === "") return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid releasedAt: ${v}`);
  return d;
}

export async function createTargetEngine(data: {
  slug: string;
  name: string;
  modality: string;
  promptStyleHint: string;
  provider?: string | null;
  iconUrl?: string | null;
  tier?: string | null;
  capabilities?: string[] | null;
  releasedAt?: string | Date | null;
  brandColor?: string | null;
  preferredLanguage?: string | null;
  charLimit?: number | string | null;
  preferredFormat?: string | null;
  requiresEnglish?: boolean;
  negativePromptSupport?: boolean;
  structuredFieldSpec?: unknown;
  parameterHints?: unknown;
  authoringTipsMd?: string | null;
}): Promise<void> {
  const admin = await requireAdmin();
  const slug = data.slug.trim().toLowerCase();
  const name = data.name.trim();
  const modality = data.modality.trim();
  const hint = data.promptStyleHint.trim();
  if (!SLUG_RE.test(slug)) throw new Error("Invalid slug (a-z, 0-9, hyphen)");
  if (!name || !modality || !hint) {
    throw new Error("Name, modality and prompt style hint are required");
  }
  const normalizedFormat = normalizeFormat(data.preferredFormat);
  const normalizedSpec = normalizeJson(data.structuredFieldSpec);
  validateFormatCoherence(normalizedFormat, normalizedSpec);
  const max = await db.targetEngine.aggregate({ _max: { sortOrder: true } });
  const created = await db.targetEngine.create({
    data: {
      slug,
      name,
      modality,
      promptStyleHint: hint,
      provider: data.provider?.trim() || null,
      iconUrl: data.iconUrl?.trim() || null,
      tier: normalizeTier(data.tier),
      capabilities: normalizeCapabilities(data.capabilities),
      releasedAt: normalizeReleasedAt(data.releasedAt),
      brandColor: normalizeBrandColor(data.brandColor),
      preferredLanguage: normalizePreferredLanguage(data.preferredLanguage),
      charLimit: normalizeCharLimit(data.charLimit),
      preferredFormat: normalizedFormat,
      requiresEnglish: data.requiresEnglish ?? false,
      // 2026-05-05 Pass 2 — wantsAssumptions field deprecated (Hybrid v5 plain-text
      // mode never emits an assumptions block). DB column kept for backward
      // compatibility; default true preserved on create.
      wantsAssumptions: true,
      negativePromptSupport: data.negativePromptSupport ?? false,
      structuredFieldSpec: normalizedSpec as never,
      parameterHints: normalizeJson(data.parameterHints) as never,
      authoringTipsMd: data.authoringTipsMd?.trim() || null,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
      isActive: true,
    },
  });
  await writeAudit({ actorId: admin.id, action: "targetEngine.create", targetType: "targetEngine", targetId: created.id, meta: { slug, name, modality } });
  revalidatePath("/pr/yonet/target-engines");
}

export async function updateTargetEngine(
  id: string,
  patch: {
    name?: string;
    modality?: string;
    promptStyleHint?: string;
    provider?: string | null;
    iconUrl?: string | null;
    isActive?: boolean;
    sortOrder?: number;
    tier?: string | null;
    capabilities?: string[] | null;
    releasedAt?: string | Date | null;
    brandColor?: string | null;
    preferredLanguage?: string | null;
    charLimit?: number | string | null;
    preferredFormat?: string | null;
    requiresEnglish?: boolean;
    negativePromptSupport?: boolean;
    structuredFieldSpec?: unknown;
    parameterHints?: unknown;
    authoringTipsMd?: string | null;
  },
): Promise<void> {
  const admin = await requireAdmin();

  // 2026-05-12 (Garantili Teslimat v2) — coherence kontrolü. Patch'te en az
  // birini (preferredFormat veya structuredFieldSpec) değiştiriyorsa, post-
  // update state'i validate et. Eksik tarafı mevcut DB değerinden oku.
  let patchedFormat: string | null | undefined;
  let patchedSpec: unknown;
  if (patch.preferredFormat !== undefined || patch.structuredFieldSpec !== undefined) {
    const existing = await db.targetEngine.findUniqueOrThrow({
      where: { id },
      select: { preferredFormat: true, structuredFieldSpec: true },
    });
    patchedFormat =
      patch.preferredFormat !== undefined
        ? normalizeFormat(patch.preferredFormat)
        : existing.preferredFormat;
    patchedSpec =
      patch.structuredFieldSpec !== undefined
        ? normalizeJson(patch.structuredFieldSpec)
        : existing.structuredFieldSpec;
    validateFormatCoherence(patchedFormat, patchedSpec);
  }

  await db.targetEngine.update({
    where: { id },
    data: {
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.modality !== undefined ? { modality: patch.modality.trim() } : {}),
      ...(patch.promptStyleHint !== undefined
        ? { promptStyleHint: patch.promptStyleHint.trim() }
        : {}),
      ...(patch.provider !== undefined ? { provider: patch.provider?.trim() || null } : {}),
      ...(patch.iconUrl !== undefined ? { iconUrl: patch.iconUrl?.trim() || null } : {}),
      ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
      ...(patch.sortOrder !== undefined ? { sortOrder: patch.sortOrder } : {}),
      ...(patch.tier !== undefined ? { tier: normalizeTier(patch.tier) } : {}),
      ...(patch.capabilities !== undefined
        ? { capabilities: normalizeCapabilities(patch.capabilities) }
        : {}),
      ...(patch.releasedAt !== undefined
        ? { releasedAt: normalizeReleasedAt(patch.releasedAt) }
        : {}),
      ...(patch.brandColor !== undefined
        ? { brandColor: normalizeBrandColor(patch.brandColor) }
        : {}),
      ...(patch.preferredLanguage !== undefined
        ? { preferredLanguage: normalizePreferredLanguage(patch.preferredLanguage) }
        : {}),
      ...(patch.charLimit !== undefined ? { charLimit: normalizeCharLimit(patch.charLimit) } : {}),
      ...(patch.preferredFormat !== undefined
        ? { preferredFormat: patchedFormat as string | null }
        : {}),
      ...(patch.requiresEnglish !== undefined ? { requiresEnglish: patch.requiresEnglish } : {}),
      ...(patch.negativePromptSupport !== undefined
        ? { negativePromptSupport: patch.negativePromptSupport }
        : {}),
      ...(patch.structuredFieldSpec !== undefined
        ? { structuredFieldSpec: patchedSpec as never }
        : {}),
      ...(patch.parameterHints !== undefined
        ? { parameterHints: normalizeJson(patch.parameterHints) as never }
        : {}),
      ...(patch.authoringTipsMd !== undefined
        ? { authoringTipsMd: patch.authoringTipsMd?.trim() || null }
        : {}),
    },
  });
  await writeAudit({ actorId: admin.id, action: "targetEngine.update", targetType: "targetEngine", targetId: id });
  revalidatePath("/pr/yonet/target-engines");
}

export async function deleteTargetEngine(id: string): Promise<void> {
  const admin = await requireAdmin();
  await db.targetEngine.delete({ where: { id } });
  await writeAudit({ actorId: admin.id, action: "targetEngine.delete", targetType: "targetEngine", targetId: id });
  revalidatePath("/pr/yonet/target-engines");
}
