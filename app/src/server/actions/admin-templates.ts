"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { TemplateStatus } from "@prisma/client";
import { db } from "@/db/client";
import { requireAdmin, writeAudit } from "@/lib/audit";

const VAR_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const MODALITIES = ["text", "image", "code", "audio", "video", "music"] as const;

const VariableObjectSchema = z.object({
  key: z.string().trim().regex(VAR_NAME, "Invalid variable name"),
  label: z.string().trim().max(120).optional(),
  source: z.enum(["intent", "question", "ai-fill", "target"]).optional(),
  required: z.boolean().optional(),
});

const VariableEntrySchema = z.union([
  z.string().trim().regex(VAR_NAME, "Invalid variable name"),
  VariableObjectSchema,
]);

const TemplateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z
    .string()
    .trim()
    .max(500)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  category: z.string().trim().min(1, "Category is required").max(60),
  modality: z.enum(MODALITIES),
  engine: z
    .string()
    .trim()
    .max(80)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  template: z.string().min(1, "Template body is required").max(20000),
  variables: z.array(VariableEntrySchema).default([]),
  status: z.nativeEnum(TemplateStatus).default(TemplateStatus.DRAFT),
  version: z.string().trim().min(1).max(20).default("v1.0"),
  sortOrder: z.coerce.number().int().default(0),
});

export type TemplateInput = z.input<typeof TemplateSchema>;

type VariableEntry = z.infer<typeof VariableEntrySchema>;

function normalizeVariables(vars: VariableEntry[]): VariableEntry[] {
  const seen = new Set<string>();
  const out: VariableEntry[] = [];
  for (const v of vars) {
    const key = typeof v === "string" ? v.trim() : v.key.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(typeof v === "string" ? key : { ...v, key });
  }
  return out;
}

export async function createTemplate(data: TemplateInput): Promise<{ id: string }> {
  const admin = await requireAdmin();
  const parsed = TemplateSchema.parse(data);
  const created = await db.promptTemplate.create({
    data: {
      title: parsed.title,
      description: parsed.description,
      category: parsed.category,
      modality: parsed.modality,
      engine: parsed.engine,
      template: parsed.template,
      variables: normalizeVariables(parsed.variables),
      status: parsed.status,
      version: parsed.version,
      isActive: parsed.status === TemplateStatus.PUBLISHED,
      sortOrder: parsed.sortOrder,
    },
    select: { id: true },
  });
  await writeAudit({ actorId: admin.id, action: "template.create", targetType: "promptTemplate", targetId: created.id, meta: { title: parsed.title, modality: parsed.modality } });
  revalidatePath("/pr/yonet/templates");
  return created;
}

export async function updateTemplate(id: string, data: TemplateInput): Promise<void> {
  const admin = await requireAdmin();
  const parsed = TemplateSchema.parse(data);
  await db.promptTemplate.update({
    where: { id },
    data: {
      title: parsed.title,
      description: parsed.description,
      category: parsed.category,
      modality: parsed.modality,
      engine: parsed.engine,
      template: parsed.template,
      variables: normalizeVariables(parsed.variables),
      status: parsed.status,
      version: parsed.version,
      isActive: parsed.status === TemplateStatus.PUBLISHED,
      sortOrder: parsed.sortOrder,
    },
  });
  await writeAudit({ actorId: admin.id, action: "template.update", targetType: "promptTemplate", targetId: id, meta: { title: parsed.title } });
  revalidatePath("/pr/yonet/templates");
}

export async function setTemplateStatus(
  id: string,
  status: TemplateStatus,
): Promise<void> {
  const admin = await requireAdmin();
  await db.promptTemplate.update({
    where: { id },
    data: {
      status,
      isActive: status === TemplateStatus.PUBLISHED,
    },
  });
  await writeAudit({ actorId: admin.id, action: "template.setStatus", targetType: "promptTemplate", targetId: id, meta: { status } });
  revalidatePath("/pr/yonet/templates");
}

/**
 * Şablonu sil veya devre dışı bırak.
 *
 * Hiç kullanılmamışsa (Prompt referansı yoksa) → fiziksel sil.
 * Kullanılmışsa → status=DRAFT + isActive=false (yumuşak kapatma; FK SetNull olduğu için
 *   referans veriler korunur, ama generator artık bu şablonu seçmez).
 *
 * Plan deseni (admin-plans.deletePlan) ile birebir aynı.
 */
export async function deleteTemplate(
  id: string,
): Promise<{ action: "deleted" | "deactivated"; usageCount: number }> {
  const admin = await requireAdmin();
  const usageCount = await db.prompt.count({ where: { templateId: id } });

  if (usageCount > 0) {
    await db.promptTemplate.update({
      where: { id },
      data: { status: TemplateStatus.DRAFT, isActive: false },
    });
    await writeAudit({ actorId: admin.id, action: "template.deactivate", targetType: "promptTemplate", targetId: id, meta: { usageCount } });
    revalidatePath("/pr/yonet/templates");
    return { action: "deactivated", usageCount };
  }

  await db.promptTemplate.delete({ where: { id } });
  await writeAudit({ actorId: admin.id, action: "template.delete", targetType: "promptTemplate", targetId: id });
  revalidatePath("/pr/yonet/templates");
  return { action: "deleted", usageCount: 0 };
}

const ImportSchema = z.array(TemplateSchema).min(1).max(500);

export type ImportResult = {
  created: number;
  updated: number;
  failed: Array<{ index: number; title?: string; error: string }>;
};

/**
 * JSON array import. Aynı (title, modality) çifti varsa güncelle, yoksa oluştur.
 * Her satır bağımsız işlenir; bir satır hatası diğerlerini etkilemez.
 */
export async function importTemplates(items: unknown): Promise<ImportResult> {
  const admin = await requireAdmin();
  const parsed = ImportSchema.safeParse(items);
  if (!parsed.success) {
    throw new Error(`Invalid import payload: ${parsed.error.issues[0]?.message ?? "unknown"}`);
  }

  let created = 0;
  let updated = 0;
  const failed: ImportResult["failed"] = [];

  const maxOrder = await db.promptTemplate.aggregate({ _max: { sortOrder: true } });
  let nextOrder = (maxOrder._max.sortOrder ?? 0) + 1;

  for (let i = 0; i < parsed.data.length; i++) {
    const row = parsed.data[i];
    try {
      const existing = await db.promptTemplate.findFirst({
        where: { title: row.title, modality: row.modality },
        select: { id: true },
      });

      const payload = {
        title: row.title,
        description: row.description,
        category: row.category,
        modality: row.modality,
        engine: row.engine,
        template: row.template,
        variables: normalizeVariables(row.variables),
        status: row.status,
        version: row.version,
        isActive: row.status === TemplateStatus.PUBLISHED,
      };

      if (existing) {
        await db.promptTemplate.update({
          where: { id: existing.id },
          data: payload,
        });
        updated++;
      } else {
        await db.promptTemplate.create({
          data: { ...payload, sortOrder: row.sortOrder || nextOrder++ },
        });
        created++;
      }
    } catch (e) {
      failed.push({
        index: i,
        title: row.title,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  await writeAudit({ actorId: admin.id, action: "template.import", targetType: "promptTemplate", meta: { created, updated, failed: failed.length } });
  revalidatePath("/pr/yonet/templates");
  return { created, updated, failed };
}
