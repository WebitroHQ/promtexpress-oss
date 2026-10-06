import { db } from "@/db/client";
import { embedText } from "@/lib/library/embedding";
import { chunkText } from "./chunker";

export type EmbedOptions = {
  embeddingEngineId?: string;
  partial?: boolean;
};

export type EmbedDocumentResult = {
  created: number;
  embedded: number;
  failed: number;
  errors: string[];
};

export async function embedSnapshot(
  snapshotId: string,
  opts?: EmbedOptions,
): Promise<EmbedDocumentResult> {
  const partial = opts?.partial ?? true;

  const snapshot = await db.trainingSnapshot.findUnique({
    where: { id: snapshotId },
  });
  if (!snapshot) throw new Error(`TrainingSnapshot not found: ${snapshotId}`);

  // Idempotency
  const existingCount = await db.trainingDocument.count({
    where: { snapshotId },
  });
  if (existingCount > 0) {
    return { created: 0, embedded: existingCount, failed: 0, errors: [] };
  }

  const chunks = chunkText(snapshot.rawText);
  let created = 0;
  let embedded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const chunk of chunks) {
    const doc = await db.trainingDocument.create({
      data: {
        resourceId: snapshot.resourceId,
        snapshotId,
        chunkIndex: chunk.index,
        chunkText: chunk.text,
        chunkTokens: chunk.tokens,
      },
    });
    created++;

    const result = await embedText(chunk.text, opts?.embeddingEngineId);
    if (!result) {
      failed++;
      errors.push(`Chunk ${chunk.index}: embedding engine unavailable`);
      if (!partial) throw new Error(errors[errors.length - 1]);
      continue;
    }

    await db.$executeRawUnsafe(
      `UPDATE "TrainingDocument"
         SET embedding = $1::vector,
             "embeddingDim" = $2,
             "embeddingModel" = $3,
             "embeddedAt" = NOW()
       WHERE id = $4`,
      `[${result.vector.join(",")}]`,
      result.dimensions,
      result.model,
      doc.id,
    );
    embedded++;
  }

  return { created, embedded, failed, errors };
}
