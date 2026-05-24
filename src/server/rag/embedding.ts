import crypto from "crypto";
import type { EmbeddedChunk, RagChunk } from "./turboVector/types";
import { normalizeVector, TURBO_VECTOR_CONFIG } from "./turboVector/quantize";

export async function embedChunks(chunks: RagChunk[]) {
  const embedded: EmbeddedChunk[] = [];
  for (const chunk of chunks) {
    embedded.push({ ...chunk, embedding: await embedText(`${chunk.title ?? ""}\n${chunk.text}`) });
  }
  return embedded;
}

export async function embedText(text: string): Promise<number[]> {
  if (process.env.EMBEDDING_PROVIDER === "local" && process.env.LOCAL_EMBEDDING_URL) {
    const response = await fetch(process.env.LOCAL_EMBEDDING_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: text })
    });
    if (response.ok) {
      const payload = (await response.json()) as { embedding?: number[]; data?: Array<{ embedding: number[] }> };
      const vector = payload.embedding ?? payload.data?.[0]?.embedding;
      if (vector?.length) return normalizeVector(vector);
    }
  }

  return hashEmbedding(text, TURBO_VECTOR_CONFIG.dim);
}

export function hashEmbedding(text: string, dim = TURBO_VECTOR_CONFIG.dim): number[] {
  const vector = Array(dim).fill(0) as number[];
  const tokens = tokenize(text);
  for (const token of tokens) {
    const digest = crypto.createHash("sha256").update(token).digest();
    const index = digest.readUInt16BE(0) % dim;
    const magnitude = 0.5 + digest[2] / 255;
    const sign = digest[3] % 2 === 0 ? 1 : -1;
    vector[index] += sign * magnitude;
  }
  return normalizeVector(vector);
}

function tokenize(text: string) {
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}가-힣㎡%._-]+/gu, " ")
    .trim();
  if (!normalized) return ["homepath-empty"];
  const words = normalized.split(/\s+/).filter(Boolean);
  const bigrams = words.slice(0, -1).map((word, index) => `${word} ${words[index + 1]}`);
  return [...words, ...bigrams];
}
