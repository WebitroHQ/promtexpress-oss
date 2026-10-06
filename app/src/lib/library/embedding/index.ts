/**
 * Embedding adapters for vector generation.
 * Supports: openai, voyageai, cohere, custom (OpenAI-compatible)
 * Returns float[] for storage in pgvector column.
 */

import { db } from "@/db/client";
import { decrypt } from "@/lib/crypto";

export type EmbeddingResult = {
  vector: number[];
  model: string;
  dimensions: number;
};

export async function embedText(text: string, engineId?: string): Promise<EmbeddingResult | null> {
  const engine = await resolveEngine(engineId);
  if (!engine) return null;
  if (!engine.encryptedKey) return null;

  const apiKey = decrypt(engine.encryptedKey);
  const input = text.slice(0, 8000); // safe truncation before API call

  try {
    switch (engine.provider) {
      case "openai":
        return embedOpenAI(apiKey, engine.modelId, input, engine.dimensions);
      case "google":
        return embedGoogle(apiKey, engine.modelId, input, engine.dimensions);
      case "voyageai":
        return embedVoyage(apiKey, engine.modelId, input, engine.dimensions);
      case "cohere":
        return embedCohere(apiKey, engine.modelId, input, engine.dimensions);
      case "mistral":
        return embedOpenAI(apiKey, engine.modelId, input, engine.dimensions, "mistral");
      default:
        return embedOpenAI(apiKey, engine.modelId, input, engine.dimensions, engine.provider);
    }
  } catch {
    return null;
  }
}

async function resolveEngine(engineId?: string) {
  if (engineId) {
    return db.embeddingEngine.findUnique({ where: { id: engineId, isActive: true } });
  }
  return db.embeddingEngine.findFirst({ where: { isDefault: true, isActive: true } })
    ?? db.embeddingEngine.findFirst({ where: { isActive: true } });
}

async function embedOpenAI(
  apiKey: string,
  model: string,
  text: string,
  expectedDims: number,
  provider = "openai",
): Promise<EmbeddingResult> {
  const BASE_URLS: Record<string, string> = {
    openai: "https://api.openai.com/v1",
    mistral: "https://api.mistral.ai/v1",
    deepseek: "https://api.deepseek.com/v1",
  };
  const baseUrl = BASE_URLS[provider] ?? "https://api.openai.com/v1";

  const res = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ input: text, model, encoding_format: "float" }),
  });
  if (!res.ok) throw new Error(`${provider} embeddings ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const vector: number[] = data.data?.[0]?.embedding;
  if (!vector) throw new Error("No embedding returned");
  return { vector, model, dimensions: vector.length || expectedDims };
}

async function embedGoogle(apiKey: string, model: string, text: string, expectedDims: number): Promise<EmbeddingResult> {
  const modelName = model.startsWith("models/") ? model : `models/${model}`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${modelName}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    },
  );
  if (!res.ok) throw new Error(`Google embeddings ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const vector: number[] = data.embedding?.values;
  if (!vector) throw new Error("No embedding returned");
  return { vector, model, dimensions: vector.length || expectedDims };
}

async function embedVoyage(apiKey: string, model: string, text: string, expectedDims: number): Promise<EmbeddingResult> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ input: [text], model }),
  });
  if (!res.ok) throw new Error(`VoyageAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const vector: number[] = data.data?.[0]?.embedding;
  if (!vector) throw new Error("No embedding returned");
  return { vector, model, dimensions: vector.length || expectedDims };
}

async function embedCohere(apiKey: string, model: string, text: string, expectedDims: number): Promise<EmbeddingResult> {
  const res = await fetch("https://api.cohere.com/v2/embed", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ texts: [text], model, input_type: "search_document", embedding_types: ["float"] }),
  });
  if (!res.ok) throw new Error(`Cohere ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const vector: number[] = data.embeddings?.float?.[0];
  if (!vector) throw new Error("No embedding returned");
  return { vector, model, dimensions: vector.length || expectedDims };
}

/**
 * Upsert embedding result into PromptExemplar record.
 * Uses raw SQL since Prisma doesn't support vector type directly.
 */
export async function saveEmbedding(exemplarId: string, result: EmbeddingResult): Promise<void> {
  const vectorStr = `[${result.vector.join(",")}]`;
  await db.$executeRawUnsafe(
    `UPDATE "PromptExemplar"
     SET embedding = $1::vector, "embeddingDim" = $2, "embeddingModel" = $3, "embeddedAt" = NOW()
     WHERE id = $4`,
    vectorStr,
    result.dimensions,
    result.model,
    exemplarId,
  );
}
