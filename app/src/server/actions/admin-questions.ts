"use server";

import { db } from "@/db/client";
import { requireAdmin, writeAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function createQuestionTemplate(data: {
  modality: string;
  category?: string | null;
  question: string;
  options: string[];
  weight?: number;
}): Promise<void> {
  const admin = await requireAdmin();
  const modality = data.modality.trim();
  const question = data.question.trim();
  if (!modality || !question) throw new Error("Modality and question are required");
  const created = await db.questionTemplate.create({
    data: {
      modality,
      category: data.category?.trim() || null,
      question,
      options: data.options.filter((o) => o.trim().length > 0).slice(0, 8),
      weight: typeof data.weight === "number" ? data.weight : 0,
      isActive: true,
    },
  });
  await writeAudit({ actorId: admin.id, action: "question.create", targetType: "questionTemplate", targetId: created.id, meta: { modality } });
  revalidatePath("/pr/yonet/questions");
}

export async function updateQuestionTemplate(
  id: string,
  patch: {
    modality?: string;
    category?: string | null;
    question?: string;
    options?: string[];
    weight?: number;
    isActive?: boolean;
  },
): Promise<void> {
  const admin = await requireAdmin();
  await db.questionTemplate.update({
    where: { id },
    data: {
      ...(patch.modality !== undefined ? { modality: patch.modality.trim() } : {}),
      ...(patch.category !== undefined ? { category: patch.category?.trim() || null } : {}),
      ...(patch.question !== undefined ? { question: patch.question.trim() } : {}),
      ...(patch.options !== undefined
        ? { options: patch.options.filter((o) => o.trim().length > 0).slice(0, 8) }
        : {}),
      ...(patch.weight !== undefined ? { weight: patch.weight } : {}),
      ...(patch.isActive !== undefined ? { isActive: patch.isActive } : {}),
    },
  });
  await writeAudit({ actorId: admin.id, action: "question.update", targetType: "questionTemplate", targetId: id });
  revalidatePath("/pr/yonet/questions");
}

export async function deleteQuestionTemplate(id: string): Promise<void> {
  const admin = await requireAdmin();
  await db.questionTemplate.delete({ where: { id } });
  await writeAudit({ actorId: admin.id, action: "question.delete", targetType: "questionTemplate", targetId: id });
  revalidatePath("/pr/yonet/questions");
}
