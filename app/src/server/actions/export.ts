"use server";

import { auth } from "@/lib/auth";
import { db } from "@/db/client";

export async function exportUserData(): Promise<{ data: string; filename: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const EXPORT_LIMIT = 10000;
  const prompts = await db.prompt.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: EXPORT_LIMIT,
    select: {
      id: true,
      title: true,
      userInput: true,
      result: true,
      modality: true,
      engine: true,
      creditsUsed: true,
      isFavorited: true,
      tags: true,
      createdAt: true,
    },
  });

  if (prompts.length === EXPORT_LIMIT) {
    console.warn(`[export] User ${session.user.id} export capped at ${EXPORT_LIMIT} prompts`);
  }

  const payload = {
    exportedAt: new Date().toISOString(),
    userId: session.user.id,
    email: session.user.email,
    totalPrompts: prompts.length,
    truncated: prompts.length === EXPORT_LIMIT,
    prompts: prompts.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
    })),
  };

  const date = new Date().toISOString().slice(0, 10);
  return {
    data: JSON.stringify(payload, null, 2),
    filename: `promtexpress-export-${date}.json`,
  };
}
