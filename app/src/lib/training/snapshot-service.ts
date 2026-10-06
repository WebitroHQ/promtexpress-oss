import crypto from "crypto";
import { db } from "@/db/client";
import type { TrainingSnapshot } from "@prisma/client";
import type { FetchedItem, FetchResult } from "./fetchers/types";

export type SnapshotResult = {
  snapshot: TrainingSnapshot;
  isNew: boolean;
  diffSummary?: { added: number; removed: number; changedSample: string[] };
};

function sha256Hex(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function paragraphDiff(
  prev: string,
  next: string,
): { added: number; removed: number; changedSample: string[] } {
  const toSet = (s: string) => new Set(s.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean));
  const prevSet = toSet(prev);
  const nextSet = toSet(next);

  const addedParas = [...nextSet].filter((p) => !prevSet.has(p));
  const removedCount = [...prevSet].filter((p) => !nextSet.has(p)).length;

  return {
    added: addedParas.length,
    removed: removedCount,
    changedSample: addedParas.slice(0, 5),
  };
}

export async function ingestItem(
  resourceId: string,
  item: FetchedItem,
): Promise<SnapshotResult> {
  if (!item.rawText || item.rawText.length === 0) {
    throw new Error("empty rawText, refusing to snapshot");
  }

  const contentHash = sha256Hex(item.rawText);

  // Idempotent check
  const existing = await db.trainingSnapshot.findUnique({
    where: { resourceId_contentHash: { resourceId, contentHash } },
  });
  if (existing) {
    return { snapshot: existing, isNew: false };
  }

  // Previous snapshot for diff
  const prev = await db.trainingSnapshot.findFirst({
    where: { resourceId },
    orderBy: { fetchedAt: "desc" },
    select: { rawText: true },
  });

  const diffSummary = prev ? paragraphDiff(prev.rawText, item.rawText) : undefined;

  try {
    const snapshot = await db.trainingSnapshot.create({
      data: {
        resourceId,
        contentHash,
        rawHtml: item.rawHtml ?? null,
        rawText: item.rawText,
        contentLength: item.rawText.length,
        diffFromPrev: diffSummary
          ? { added: diffSummary.added, removed: diffSummary.removed, changedSample: diffSummary.changedSample }
          : undefined,
        metadata: {
          sourceUrl: item.sourceUrl,
          title: item.title,
          publishedAt: item.publishedAt,
          ...(item.metadata ?? {}),
        },
      },
    });
    return { snapshot, isNew: true, diffSummary };
  } catch (err: unknown) {
    // Race condition: another process already inserted same hash
    if ((err as { code?: string }).code === "P2002") {
      const fallback = await db.trainingSnapshot.findUniqueOrThrow({
        where: { resourceId_contentHash: { resourceId, contentHash } },
      });
      return { snapshot: fallback, isNew: false };
    }
    throw err;
  }
}

export async function ingestFetchResult(
  resourceId: string,
  result: FetchResult,
): Promise<SnapshotResult[]> {
  const results: SnapshotResult[] = [];
  for (const item of result.items) {
    results.push(await ingestItem(resourceId, item));
  }
  return results;
}
