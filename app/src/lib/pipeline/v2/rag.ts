/**
 * RAG — Top-3 GOLD/VERIFIED PromptExemplar retrieval.
 *
 * Direktif #1 + #8: Embedding modeli admin tarafından
 * /pr/yonet/embedding-engines sayfasından yönetilir (EmbeddingEngine.isDefault=true).
 * AgentRoleAssignment EMBEDDER role'ü kullanılmaz (embedding != generate).
 *
 * pgvector cosine similarity. Sunucuda extension yoksa fallback non-vector.
 *
 * Default since 2026-10: lexical search (Postgres full-text), which needs no embedding provider
 * and no API key. Set LIBRARY_SEARCH_MODE=embedding to use the pgvector path below instead.
 */
import { db } from "@/db/client";
import { Prisma } from "@prisma/client";
import type { Modality } from "./types";

export interface RagHit {
  id: string;
  prompt: string;
  qualityScore: number | null;
  similarity: number;
  status: string;
  targetEngineId: string | null;
}

const EMBEDDING_DIM = 1536;

/**
 * Embed text using the default EmbeddingEngine (admin manages via
 * /pr/yonet/embedding-engines, isDefault=true + isActive=true).
 * Returns null if no default embedder OR call fails (RAG falls back).
 */
async function embedText(text: string): Promise<number[] | null> {
  try {
    const embedder = await db.embeddingEngine.findFirst({
      where: { isDefault: true, isActive: true },
      select: { provider: true, modelId: true, encryptedKey: true, dimensions: true },
    });
    if (!embedder || !embedder.encryptedKey) return null;

    const { decrypt } = await import("@/lib/crypto");
    const apiKey = decrypt(embedder.encryptedKey);

    // Provider dispatch — model adı DB'den geliyor, hardcode YOK.
    if (embedder.provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ input: text, model: embedder.modelId }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { data: { embedding: number[] }[] };
      return json.data[0]?.embedding ?? null;
    }

    if (embedder.provider === "voyageai") {
      const res = await fetch("https://api.voyageai.com/v1/embeddings", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ input: [text], model: embedder.modelId }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { data: { embedding: number[] }[] };
      return json.data[0]?.embedding ?? null;
    }

    if (embedder.provider === "cohere") {
      const res = await fetch("https://api.cohere.com/v1/embed", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ texts: [text], model: embedder.modelId, input_type: "search_query" }),
      });
      if (!res.ok) return null;
      const json = (await res.json()) as { embeddings: number[][] };
      return json.embeddings[0] ?? null;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * pgvector cosine top-K with status + modality filter.
 * Falls back to deterministic non-vector search if embedding fails.
 *
 * 2026-05-12 confabulation fix — Plan §3.
 *   - minSimilarity: cosine sim. eşiği. Belirsiz intent'lerin embedding'i
 *     jenerik vektör üretir → top-K anlamsal yakın değil (örn. "Görsel
 *     iyileştirme" için Istanbul skyline + RED TEAM MODE + hospital dramedy
 *     döndü). Bu durumda BOŞ array döndür; synthesizer few-shot'sız çalışır,
 *     RoleBrief anti-fabrication kuralı devreye girer.
 *   - Fallback (embedding yoksa veya pgvector hatalıysa) jenerik exemplar
 *     dönmesin diye boş array döndürür (önceki davranış: top-K by recency,
 *     halüsinasyon riski).
 */
export const DEFAULT_RAG_MIN_SIMILARITY = 0.55;

/**
 * Lexical search thresholds, tuned against the live library (2026-10, ~1400 exemplars).
 * An exemplar is used only when rare query terms appear in its title, tags or sub-category:
 * a common word somewhere in a 5 KB prompt body says nothing about relevance.
 */
export const LEXICAL_MIN_HEAD_IDF = 3.0;
export const LEXICAL_MIN_SCORE = 0.25;
const LEXICAL_MAX_TERMS = 16;

/**
 * Distinct lowercase words of 3+ letters from the intent and the analyzer's English-leaning
 * fields. Stop words are dropped later by Postgres ('english' config), not here.
 */
export function lexicalTerms(texts: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  for (const text of texts) {
    for (const word of (text ?? "").toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
      if (word.length >= 3 && word.length <= 40) seen.add(word);
      if (seen.size >= LEXICAL_MAX_TERMS) return [...seen];
    }
  }
  return [...seen];
}

/**
 * Full-text retrieval without an embedding model.
 *
 * Every query term gets an IDF weight from how many exemplars of this modality contain it, so
 * "linkedin" counts for much more than "write". An exemplar's score is the IDF mass it matches,
 * 60% for matches in title/tags/sub-category ("head") and 40% for matches anywhere, as a share
 * of the query's total IDF. Vague intents and intents in a language the library does not cover
 * fall below the thresholds and return [], and the synthesizer then runs without few-shots:
 * an unrelated example is worse than none.
 */
async function retrieveLexical(args: {
  terms: string[];
  modality: Modality;
  targetEngineId: string | null;
  k: number;
}): Promise<RagHit[]> {
  if (args.terms.length === 0) return [];
  try {
    const rows = await db.$queryRaw<(RagHit & { head_idf: number })[]>(Prisma.sql`
      WITH pool AS (
        SELECT e.id, e.prompt, e."qualityScore", e.status::text AS status, e."targetEngineId", e."searchTsv" AS tsv
        FROM "PromptExemplar" e
        WHERE
          e."searchTsv" IS NOT NULL
          AND e.status IN ('GOLD', 'VERIFIED')
          AND e.modality = ${args.modality}
          AND (${args.targetEngineId}::text IS NULL OR e."targetEngineId" = ${args.targetEngineId}::text OR e."targetEngineId" IS NULL)
      ),
      n AS (SELECT count(*)::float AS n FROM pool),
      q AS (
        SELECT x.tq, ln(1 + (n.n - x.df + 0.5) / (x.df + 0.5)) AS idf
        FROM (
          SELECT d.tq, (SELECT count(*) FROM pool WHERE pool.tsv @@ d.tq)::float AS df
          FROM (
            SELECT DISTINCT plainto_tsquery('english', t) AS tq
            FROM unnest(${args.terms}::text[]) AS t
            WHERE numnode(plainto_tsquery('english', t)) > 0
          ) d
        ) x, n
      ),
      tot AS (SELECT coalesce(sum(idf), 0) AS total_idf FROM q),
      scored AS (
        SELECT
          pool.id, pool.prompt, pool."qualityScore", pool.status, pool."targetEngineId",
          (SELECT coalesce(sum(q.idf), 0) FROM q WHERE pool.tsv @@ q.tq) AS body_idf,
          (SELECT coalesce(sum(q.idf), 0) FROM q WHERE ts_filter(pool.tsv, '{a,b}') @@ q.tq) AS head_idf
        FROM pool
        WHERE EXISTS (SELECT 1 FROM q WHERE pool.tsv @@ q.tq)
      )
      SELECT
        id, prompt, "qualityScore", status, "targetEngineId", head_idf,
        (0.4 * body_idf + 0.6 * head_idf) / NULLIF(tot.total_idf, 0) AS similarity
      FROM scored, tot
      WHERE head_idf >= ${LEXICAL_MIN_HEAD_IDF}
      ORDER BY similarity DESC NULLS LAST, (status = 'GOLD') DESC, "qualityScore" DESC NULLS LAST
      LIMIT ${args.k};
    `);
    return rows
      .filter((r) => Number(r.similarity) >= LEXICAL_MIN_SCORE)
      .map((r) => ({
        id: r.id,
        prompt: r.prompt,
        qualityScore: r.qualityScore,
        status: r.status,
        targetEngineId: r.targetEngineId,
        similarity: Number(r.similarity),
      }));
  } catch (err) {
    console.warn("[rag] lexical search failed; continuing without exemplars:", err instanceof Error ? err.message : err);
    return [];
  }
}

export async function retrieveExemplars(args: {
  intentText: string;
  modality: Modality;
  targetEngineId: string | null;
  k?: number;
  minSimilarity?: number;
  /** Extra query text for lexical search, e.g. the analyzer's domain and entities. */
  extraTerms?: Array<string | null | undefined>;
}): Promise<RagHit[]> {
  const k = args.k ?? 3;
  const minSimilarity = args.minSimilarity ?? DEFAULT_RAG_MIN_SIMILARITY;

  if (process.env.LIBRARY_SEARCH_MODE !== "embedding") {
    return retrieveLexical({
      terms: lexicalTerms([args.intentText, ...(args.extraTerms ?? [])]),
      modality: args.modality,
      targetEngineId: args.targetEngineId,
      k,
    });
  }

  const embedding = await embedText(args.intentText);

  if (embedding && embedding.length === EMBEDDING_DIM) {
    // pgvector cosine similarity (1 - cosine_distance = similarity)
    const vectorLiteral = `[${embedding.join(",")}]`;
    try {
      const rows = await db.$queryRaw<RagHit[]>(Prisma.sql`
        SELECT
          id,
          prompt,
          "qualityScore",
          status::text AS status,
          "targetEngineId",
          1 - (embedding <=> ${vectorLiteral}::vector) AS similarity
        FROM "PromptExemplar"
        WHERE
          embedding IS NOT NULL
          AND status IN ('GOLD', 'VERIFIED')
          AND modality = ${args.modality}
          AND (${args.targetEngineId}::text IS NULL OR "targetEngineId" = ${args.targetEngineId}::text OR "targetEngineId" IS NULL)
        ORDER BY embedding <=> ${vectorLiteral}::vector
        LIMIT ${k};
      `);
      // Plan §3: eşik altındaki exemplar'lar enjekte edilmez. Az iyidir.
      return rows.filter((r) => typeof r.similarity === "number" && r.similarity >= minSimilarity);
    } catch {
      // pgvector hata verirse fallback (aşağıda)
    }
  }

  // 2026-05-12 confabulation fix — Plan §3. Eski fallback (modality+recency)
  // alakasız top-K döndürerek synthesizer'a yanlış few-shot enjekte ediyordu.
  // Embedding mevcut değilse / pgvector hata verirse: BOŞ döndür. Synthesizer
  // few-shot'sız çalışacak, anti-fabrication RoleBrief kuralı devreye girecek.
  return [];
}
