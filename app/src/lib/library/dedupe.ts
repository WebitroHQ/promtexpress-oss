/**
 * Duplicate detection for prompt library.
 * SHA-256 of normalized prompt text → checked against DB unique index.
 */

import { createHash } from "node:crypto";
import { db } from "@/db/client";

export function computePromptHash(text: string): string {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, " ");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

export async function isDuplicate(hash: string): Promise<boolean> {
  const existing = await db.promptExemplar.findUnique({
    where: { promptHash: hash },
    select: { id: true },
  });
  return existing !== null;
}

export async function findExistingByHash(hash: string) {
  return db.promptExemplar.findUnique({
    where: { promptHash: hash },
    select: { id: true, status: true, title: true, modality: true },
  });
}
