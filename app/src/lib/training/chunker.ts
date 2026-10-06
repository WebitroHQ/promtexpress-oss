import { encode } from "gpt-tokenizer";

export type Chunk = {
  index: number;
  text: string;
  tokens: number;
};

export type ChunkOptions = {
  maxTokens?: number;
  minTokens?: number;
  overlapTokens?: number;
};

export function countTokens(text: string): number {
  return encode(text).length;
}

function splitLongParagraph(para: string, maxTokens: number): string[] {
  // Try sentence split first
  const sentences = para.split(/(?<=[.!?])\s+/);
  const parts: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current ? `${current} ${sentence}` : sentence;
    if (countTokens(candidate) > maxTokens) {
      if (current) parts.push(current);
      // If single sentence is too long, fall back to char chunking
      if (countTokens(sentence) > maxTokens) {
        const chunkSize = 3000;
        for (let i = 0; i < sentence.length; i += chunkSize) {
          parts.push(sentence.slice(i, i + chunkSize));
        }
        current = "";
      } else {
        current = sentence;
      }
    } else {
      current = candidate;
    }
  }
  if (current) parts.push(current);
  return parts.filter(Boolean);
}

export function chunkText(text: string, opts?: ChunkOptions): Chunk[] {
  const maxTokens = opts?.maxTokens ?? 800;
  const minTokens = opts?.minTokens ?? 80;
  const overlapTokens = opts?.overlapTokens ?? 0;

  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const flushed: string[] = [];
  let current: string[] = [];
  let currentTokens = 0;

  const flush = () => {
    if (current.length > 0) {
      flushed.push(current.join("\n\n"));
      current = [];
      currentTokens = 0;
    }
  };

  for (const para of paragraphs) {
    const tokens = countTokens(para);

    if (tokens > maxTokens) {
      flush();
      const subParts = splitLongParagraph(para, maxTokens);
      for (const part of subParts) {
        const partTokens = countTokens(part);
        if (currentTokens + partTokens > maxTokens) flush();
        current.push(part);
        currentTokens += partTokens;
      }
    } else if (currentTokens + tokens > maxTokens) {
      flush();
      current.push(para);
      currentTokens = tokens;
    } else {
      current.push(para);
      currentTokens += tokens;
    }
  }
  flush();

  // Merge tiny trailing chunk into previous
  if (flushed.length > 1) {
    const last = flushed[flushed.length - 1];
    if (countTokens(last) < minTokens) {
      flushed[flushed.length - 2] += "\n\n" + last;
      flushed.pop();
    }
  }

  const chunks: Chunk[] = flushed.map((t, i) => ({
    index: i,
    text: t,
    tokens: countTokens(t),
  }));

  if (overlapTokens <= 0) return chunks;

  // Apply overlap
  return chunks.map((chunk, i) => {
    if (i === 0) return chunk;
    const prev = chunks[i - 1];
    const prevEncoded = encode(prev.text);
    const overlapText = new TextDecoder().decode(
      new TextEncoder().encode(prev.text).slice(
        Math.max(0, prevEncoded.length - overlapTokens) * 4, // approx byte offset
      ),
    );
    const text = overlapText.trim() + "\n\n" + chunk.text;
    return { index: chunk.index, text, tokens: countTokens(text) };
  });
}
