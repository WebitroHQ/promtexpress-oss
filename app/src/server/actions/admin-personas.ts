"use server";

/**
 * Server actions for /pr/yonet/personas
 *
 * ExpertPersona CRUD + reorder + export/import.
 * Her yazma işlemi sonunda invalidateContextCache() çağrılır — Synthesizer'ın
 * 5dk in-memory cache'i (3-context-assembly.ts) anında temizlensin.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { Prisma } from "@prisma/client";
import { invalidateContextCache } from "@/lib/pipeline/v2/3-context-assembly";
import { requireAdmin as requireAdminBase, writeAudit } from "@/lib/audit";

const SLUG_RE = /^[a-z0-9-]+$/;

const personaInputSchema = z.object({
  domainSlug: z
    .string()
    .min(2)
    .max(50)
    .regex(SLUG_RE, "domainSlug yalnızca [a-z0-9-] içerebilir"),
  name: z.string().min(1).max(100),
  body: z.string().min(50).max(4000),
  jargon: z.array(z.string().min(1).max(100)).max(30).default([]),
  frameworks: z.array(z.string().min(1).max(100)).max(30).default([]),
  antiPatterns: z.array(z.string().min(1).max(200)).max(30).default([]),
  notes: z.string().max(1000).nullable().optional(),
  isActive: z.boolean().default(true),
});

export type PersonaInput = z.infer<typeof personaInputSchema>;

async function requireAdmin() {
  return requireAdminBase();
}

function bumpCachesAndRevalidate() {
  invalidateContextCache();
  revalidatePath("/pr/yonet/personas");
}

export async function createPersona(input: PersonaInput) {
  const user = await requireAdmin();
  const parsed = personaInputSchema.parse(input);

  const maxOrder = await db.expertPersona.aggregate({ _max: { sortOrder: true } });

  try {
    const created = await db.expertPersona.create({
      data: {
        domainSlug: parsed.domainSlug,
        name: parsed.name,
        body: parsed.body,
        jargon: parsed.jargon,
        frameworks: parsed.frameworks,
        antiPatterns: parsed.antiPatterns,
        notes: parsed.notes ?? null,
        isActive: parsed.isActive,
        sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
        updatedBy: user.id,
      },
    });
    await writeAudit({ actorId: user.id, action: "persona.create", targetType: "expertPersona", targetId: created.id, meta: { domainSlug: parsed.domainSlug, name: parsed.name } });
    bumpCachesAndRevalidate();
    return { ok: true as const, id: created.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error(`'${parsed.domainSlug}' slug zaten kullanılıyor`);
    }
    throw e;
  }
}

export async function updatePersona(id: string, input: PersonaInput) {
  const user = await requireAdmin();
  const parsed = personaInputSchema.parse(input);

  try {
    await db.expertPersona.update({
      where: { id },
      data: {
        domainSlug: parsed.domainSlug,
        name: parsed.name,
        body: parsed.body,
        jargon: parsed.jargon,
        frameworks: parsed.frameworks,
        antiPatterns: parsed.antiPatterns,
        notes: parsed.notes ?? null,
        isActive: parsed.isActive,
        updatedBy: user.id,
      },
    });
    await writeAudit({ actorId: user.id, action: "persona.update", targetType: "expertPersona", targetId: id, meta: { domainSlug: parsed.domainSlug } });
    bumpCachesAndRevalidate();
    return { ok: true as const };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error(`'${parsed.domainSlug}' slug zaten kullanılıyor`);
    }
    throw e;
  }
}

export async function togglePersonaActive(id: string, isActive: boolean) {
  const user = await requireAdmin();
  await db.expertPersona.update({
    where: { id },
    data: { isActive, updatedBy: user.id },
  });
  await writeAudit({ actorId: user.id, action: "persona.toggleActive", targetType: "expertPersona", targetId: id, meta: { isActive } });
  bumpCachesAndRevalidate();
  return { ok: true as const };
}

/**
 * Persona'nın geçmiş kullanım sayımı — JSONB contextJson->>'personaSlug' eşleşmesi.
 */
async function personaUsageCount(domainSlug: string): Promise<number> {
  const rows = await db.$queryRaw<{ c: bigint }[]>`
    SELECT COUNT(*)::bigint AS c
    FROM "GenerationTrace"
    WHERE "contextJson"->>'personaSlug' = ${domainSlug}
  `;
  return Number(rows[0]?.c ?? 0);
}

/**
 * Sil. Eğer persona daha önce GenerationTrace'te kullanılmışsa: force=false ise soft delete (isActive=false),
 * force=true ise hard delete. Kullanılmamışsa direkt hard delete.
 */
export async function deletePersona(id: string, force = false) {
  const user = await requireAdmin();
  const persona = await db.expertPersona.findUnique({
    where: { id },
    select: { id: true, domainSlug: true },
  });
  if (!persona) throw new Error("Persona bulunamadı");

  const used = await personaUsageCount(persona.domainSlug);

  if (used > 0 && !force) {
    await db.expertPersona.update({
      where: { id },
      data: { isActive: false, updatedBy: user.id },
    });
    await writeAudit({ actorId: user.id, action: "persona.softDelete", targetType: "expertPersona", targetId: id, meta: { used } });
    bumpCachesAndRevalidate();
    return { ok: true as const, mode: "soft" as const, used };
  }

  await db.expertPersona.delete({ where: { id } });
  await writeAudit({ actorId: user.id, action: "persona.delete", targetType: "expertPersona", targetId: id, meta: { used } });
  bumpCachesAndRevalidate();
  return { ok: true as const, mode: "hard" as const, used };
}

export async function reorderPersonas(orderedIds: string[]) {
  const user = await requireAdmin();
  z.array(z.string().min(1)).min(1).parse(orderedIds);

  await db.$transaction(
    orderedIds.map((id, idx) =>
      db.expertPersona.update({
        where: { id },
        data: { sortOrder: idx + 1, updatedBy: user.id },
      }),
    ),
  );
  await writeAudit({ actorId: user.id, action: "persona.reorder", targetType: "expertPersona", meta: { count: orderedIds.length } });
  bumpCachesAndRevalidate();
  return { ok: true as const };
}

// ── Export / Import ─────────────────────────────────────────

export async function exportPersonas() {
  await requireAdmin();
  const rows = await db.expertPersona.findMany({ orderBy: { sortOrder: "asc" } });
  return rows.map((p) => ({
    domainSlug: p.domainSlug,
    name: p.name,
    body: p.body,
    jargon: p.jargon,
    frameworks: p.frameworks,
    antiPatterns: p.antiPatterns,
    notes: p.notes,
    isActive: p.isActive,
    sortOrder: p.sortOrder,
  }));
}

const importSchema = z.object({
  mode: z.enum(["upsert", "skip-existing"]),
  items: z.array(personaInputSchema.extend({ sortOrder: z.number().int().optional() })).min(1).max(500),
});

export async function importPersonas(input: z.infer<typeof importSchema>) {
  const user = await requireAdmin();
  const parsed = importSchema.parse(input);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of parsed.items) {
    const existing = await db.expertPersona.findUnique({
      where: { domainSlug: item.domainSlug },
      select: { id: true },
    });

    if (existing) {
      if (parsed.mode === "skip-existing") {
        skipped++;
        continue;
      }
      await db.expertPersona.update({
        where: { id: existing.id },
        data: {
          name: item.name,
          body: item.body,
          jargon: item.jargon,
          frameworks: item.frameworks,
          antiPatterns: item.antiPatterns,
          notes: item.notes ?? null,
          isActive: item.isActive,
          ...(item.sortOrder !== undefined ? { sortOrder: item.sortOrder } : {}),
          updatedBy: user.id,
        },
      });
      updated++;
    } else {
      const maxOrder = await db.expertPersona.aggregate({ _max: { sortOrder: true } });
      await db.expertPersona.create({
        data: {
          domainSlug: item.domainSlug,
          name: item.name,
          body: item.body,
          jargon: item.jargon,
          frameworks: item.frameworks,
          antiPatterns: item.antiPatterns,
          notes: item.notes ?? null,
          isActive: item.isActive,
          sortOrder: item.sortOrder ?? (maxOrder._max.sortOrder ?? 0) + 1,
          updatedBy: user.id,
        },
      });
      created++;
    }
  }

  await writeAudit({ actorId: user.id, action: "persona.import", targetType: "expertPersona", meta: { mode: parsed.mode, created, updated, skipped } });
  bumpCachesAndRevalidate();
  return { ok: true as const, created, updated, skipped };
}
