"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { requireAdmin, writeAudit } from "@/lib/audit";

const SLUG_RE = /^[a-z0-9-]+$/;
const MODALITIES = ["text", "image", "code", "audio", "video", "music", "math", "slides", "diagram", "3d", "document"] as const;

const CategorySchema = z.object({
  modality: z.enum(MODALITIES),
  slug: z.string().trim().min(1).max(60).regex(SLUG_RE, "Slug yalnızca [a-z0-9-]"),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().nullable().transform((v) => (v && v.length > 0 ? v : null)),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export async function createCategory(input: z.input<typeof CategorySchema>) {
  const admin = await requireAdmin();
  const parsed = CategorySchema.parse(input);

  if (parsed.parentId) {
    const parent = await db.taxonomyCategory.findUnique({ where: { id: parsed.parentId }, select: { parentId: true, modality: true } });
    if (!parent) throw new Error("Parent category not found");
    if (parent.parentId) throw new Error("Max 1 level nesting (parent already has a parent)");
    if (parent.modality !== parsed.modality) throw new Error("Parent must be in the same modality");
  }

  const max = await db.taxonomyCategory.aggregate({
    where: { modality: parsed.modality, parentId: parsed.parentId ?? null },
    _max: { sortOrder: true },
  });

  try {
    const created = await db.taxonomyCategory.create({
      data: {
        modality: parsed.modality,
        slug: parsed.slug,
        name: parsed.name,
        description: parsed.description,
        parentId: parsed.parentId ?? null,
        isActive: parsed.isActive,
        sortOrder: (max._max.sortOrder ?? 0) + 1,
      },
    });
    await writeAudit({ actorId: admin.id, action: "taxonomy.create", targetType: "taxonomyCategory", targetId: created.id, meta: { modality: parsed.modality, slug: parsed.slug } });
    revalidatePath("/pr/yonet/taxonomy");
    return { ok: true, id: created.id };
  } catch (e) {
    if ((e as { code?: string }).code === "P2002") {
      throw new Error(`"${parsed.slug}" slug already exists for ${parsed.modality}`);
    }
    throw e;
  }
}

const UpdateSchema = CategorySchema.partial().extend({ id: z.string().min(1) });

export async function updateCategory(input: z.input<typeof UpdateSchema>) {
  const admin = await requireAdmin();
  const parsed = UpdateSchema.parse(input);
  const { id, ...patch } = parsed;

  await db.taxonomyCategory.update({
    where: { id },
    data: {
      ...(patch.modality !== undefined && { modality: patch.modality }),
      ...(patch.slug !== undefined && { slug: patch.slug }),
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.parentId !== undefined && { parentId: patch.parentId }),
      ...(patch.isActive !== undefined && { isActive: patch.isActive }),
    },
  });
  await writeAudit({ actorId: admin.id, action: "taxonomy.update", targetType: "taxonomyCategory", targetId: id });
  revalidatePath("/pr/yonet/taxonomy");
  return { ok: true };
}

export async function deleteCategory(id: string) {
  const admin = await requireAdmin();
  const usage = await db.promptTemplate.count({ where: { categoryId: id } });
  const childCount = await db.taxonomyCategory.count({ where: { parentId: id } });

  if (childCount > 0) {
    throw new Error(`Cannot delete: has ${childCount} sub-categor(ies). Delete children first.`);
  }

  if (usage > 0) {
    // Soft delete: deactivate
    await db.taxonomyCategory.update({ where: { id }, data: { isActive: false } });
    await writeAudit({ actorId: admin.id, action: "taxonomy.deactivate", targetType: "taxonomyCategory", targetId: id, meta: { usage } });
    revalidatePath("/pr/yonet/taxonomy");
    return { ok: true, action: "deactivated" as const, usage };
  }

  await db.taxonomyCategory.delete({ where: { id } });
  await writeAudit({ actorId: admin.id, action: "taxonomy.delete", targetType: "taxonomyCategory", targetId: id });
  revalidatePath("/pr/yonet/taxonomy");
  return { ok: true, action: "deleted" as const, usage: 0 };
}

export async function reorderCategories(modality: string, parentId: string | null, orderedIds: string[]) {
  const admin = await requireAdmin();
  z.array(z.string().min(1)).min(1).parse(orderedIds);

  await db.$transaction(
    orderedIds.map((id, idx) =>
      db.taxonomyCategory.update({
        where: { id },
        data: { sortOrder: idx + 1 },
      }),
    ),
  );
  await writeAudit({ actorId: admin.id, action: "taxonomy.reorder", targetType: "taxonomyCategory", meta: { modality, parentId, count: orderedIds.length } });
  revalidatePath("/pr/yonet/taxonomy");
  return { ok: true };
}
