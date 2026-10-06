"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { db } from "@/db/client";

/**
 * Toggle the isFavorited flag on a prompt the caller owns.
 * Returns the new isFavorited state.
 */
export async function toggleFavorite(promptId: string): Promise<{ isFavorited: boolean }> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const prompt = await db.prompt.findUnique({
    where: { id: promptId },
    select: { userId: true, isFavorited: true },
  });

  if (!prompt) throw new Error("Prompt not found");
  if (prompt.userId !== session.user.id) throw new Error("Forbidden");

  const updated = await db.prompt.update({
    where: { id: promptId },
    data: { isFavorited: !prompt.isFavorited },
    select: { isFavorited: true },
  });

  revalidatePath("/dashboard");
  revalidatePath("/favorites");
  return { isFavorited: updated.isFavorited };
}
