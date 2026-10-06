import { db } from "@/db/client";
import type { ResourceRefresh } from "@prisma/client";
import { fetchResource } from "./fetchers";
import { ingestItem, type SnapshotResult } from "./snapshot-service";
import { embedSnapshot } from "./document-embedder";
import { distillSnapshot } from "./distiller";

export type RunResult = {
  resourceId: string;
  fetched: number;
  snapshotsNew: number;
  snapshotsExisting: number;
  documentsCreated: number;
  documentsEmbedded: number;
  distillationsCreated: number;
  errors: string[];
  durationMs: number;
};

function computeNext(policy: ResourceRefresh, base: Date): Date | null {
  switch (policy) {
    case "MANUAL":
      return null;
    case "DAILY":
      return new Date(base.getTime() + 24 * 60 * 60 * 1000);
    case "WEEKLY":
      return new Date(base.getTime() + 7 * 24 * 60 * 60 * 1000);
    case "MONTHLY":
      return new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
  }
}

export async function runResourcePipeline(resourceId: string): Promise<RunResult> {
  const start = Date.now();
  const errors: string[] = [];
  let fetched = 0;
  let snapshotsNew = 0;
  let snapshotsExisting = 0;
  let documentsCreated = 0;
  let documentsEmbedded = 0;
  let distillationsCreated = 0;

  const resource = await db.trainingResource.findUnique({ where: { id: resourceId } });
  if (!resource) throw new Error(`TrainingResource not found: ${resourceId}`);

  try {
    const fetchResult = await fetchResource({ resource });
    fetched = fetchResult.items.length;

    for (const item of fetchResult.items) {
      let snapResult: SnapshotResult;
      try {
        snapResult = await ingestItem(resourceId, item);
      } catch (ingestErr) {
        errors.push(`ingest: ${(ingestErr as Error).message.slice(0, 200)}`);
        continue;
      }

      if (snapResult.isNew) {
        snapshotsNew++;

        const embedResult = await embedSnapshot(snapResult.snapshot.id);
        documentsCreated += embedResult.created;
        documentsEmbedded += embedResult.embedded;
        errors.push(...embedResult.errors);

        try {
          const distResult = await distillSnapshot(snapResult.snapshot.id);
          distillationsCreated += distResult.distillationsCreated;
          errors.push(...distResult.errors);
        } catch (distErr) {
          errors.push(`distill: ${(distErr as Error).message.slice(0, 300)}`);
        }
      } else {
        snapshotsExisting++;
        // If existing snapshot has no distillation yet, run distiller now
        const distCount = await db.trainingDistillation.count({
          where: { snapshotIds: { has: snapResult.snapshot.id } },
        });
        if (distCount === 0) {
          try {
            const distResult = await distillSnapshot(snapResult.snapshot.id);
            distillationsCreated += distResult.distillationsCreated;
            errors.push(...distResult.errors);
          } catch (distErr) {
            errors.push(`distill: ${(distErr as Error).message.slice(0, 300)}`);
          }
        }
      }
    }

    const now = new Date();
    await db.trainingResource.update({
      where: { id: resourceId },
      data: {
        lastFetchedAt: now,
        nextFetchAt: computeNext(resource.refreshPolicy, now),
        errorCount: 0,
        lastError: null,
        status: "ACTIVE",
      },
    });
  } catch (err) {
    const msg = (err as Error).message.slice(0, 500);
    errors.push(msg);
    const newErrorCount = (resource.errorCount ?? 0) + 1;
    const now = new Date();
    const backoffMs = Math.min(newErrorCount * 15 * 60 * 1000, 6 * 60 * 60 * 1000);
    await db.trainingResource.update({
      where: { id: resourceId },
      data: {
        errorCount: newErrorCount,
        lastError: msg,
        nextFetchAt: new Date(now.getTime() + backoffMs),
        status: newErrorCount >= 3 ? "ERROR" : resource.status,
      },
    });
    throw err;
  }

  return {
    resourceId,
    fetched,
    snapshotsNew,
    snapshotsExisting,
    documentsCreated,
    documentsEmbedded,
    distillationsCreated,
    errors,
    durationMs: Date.now() - start,
  };
}

export async function tickScheduler(opts?: { limit?: number }): Promise<RunResult[]> {
  const now = new Date();
  const due = await db.trainingResource.findMany({
    where: {
      status: "ACTIVE",
      refreshPolicy: { not: "MANUAL" },
      OR: [{ nextFetchAt: null }, { nextFetchAt: { lte: now } }],
    },
    orderBy: { nextFetchAt: "asc" },
    take: opts?.limit ?? 5,
  });

  const results: RunResult[] = [];
  for (const r of due) {
    try {
      results.push(await runResourcePipeline(r.id));
    } catch (e) {
      results.push({
        resourceId: r.id,
        fetched: 0,
        snapshotsNew: 0,
        snapshotsExisting: 0,
        documentsCreated: 0,
        documentsEmbedded: 0,
        distillationsCreated: 0,
        errors: [(e as Error).message],
        durationMs: 0,
      });
    }
  }
  return results;
}
