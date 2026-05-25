import { prisma } from "@/server/db";
import {
  cosineApproxFromQuantized,
  decodeCodes,
  encodeCodes,
  quantizeVector,
  TURBO_VECTOR_CONFIG,
  type QuantizedVector
} from "./quantize";
import type { EmbeddedChunk, RagChunk, RagMetadata, SearchResult, VectorStore } from "./types";

type RagChunkRow = {
  id: string;
  source_type: string;
  source_id: string | null;
  title: string | null;
  text: string;
  metadata_json: string | null;
  embedding_dim: number;
  quant_method: string;
  vector_min: number;
  vector_scale: number;
  vector_blob: Buffer | Uint8Array;
};

export class InMemoryTurboVectorStore implements VectorStore {
  private rows = new Map<string, { chunk: RagChunk; quantized: QuantizedVector }>();

  async clear() {
    this.rows.clear();
  }

  async count() {
    return this.rows.size;
  }

  async upsert(chunks: EmbeddedChunk[]) {
    for (const chunk of chunks) {
      this.rows.set(chunk.id, { chunk, quantized: quantizeVector(chunk.embedding) });
    }
  }

  async search(input: {
    queryEmbedding: number[];
    topK: number;
    filters?: Record<string, string | number | boolean>;
  }): Promise<SearchResult[]> {
    const query = quantizeVector(input.queryEmbedding);
    return [...this.rows.values()]
      .filter(({ chunk }) => matchesFilters(chunk, input.filters))
      .map(({ chunk, quantized }) => ({ ...chunk, score: cosineApproxFromQuantized(query, quantized) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, input.topK);
  }
}

export class TurboVectorSqliteStore implements VectorStore {
  async ensureSchema() {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS rag_chunks (
        id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL,
        source_id TEXT,
        title TEXT,
        text TEXT NOT NULL,
        metadata_json TEXT,
        embedding_dim INTEGER NOT NULL,
        quant_method TEXT NOT NULL,
        vector_min REAL NOT NULL,
        vector_scale REAL NOT NULL,
        vector_blob BLOB NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_rag_chunks_source_type ON rag_chunks(source_type)`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_rag_chunks_source_id ON rag_chunks(source_id)`);
  }

  async clear() {
    await this.ensureSchema();
    await prisma.$executeRawUnsafe(`DELETE FROM rag_chunks`);
  }

  async count() {
    await this.ensureSchema();
    const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(`SELECT COUNT(*) as count FROM rag_chunks`);
    return Number(rows[0]?.count ?? 0);
  }

  async upsert(chunks: EmbeddedChunk[]) {
    await this.ensureSchema();
    for (const chunk of chunks) {
      const quantized = quantizeVector(chunk.embedding, TURBO_VECTOR_CONFIG);
      await prisma.$executeRawUnsafe(
        `
        INSERT OR REPLACE INTO rag_chunks (
          id, source_type, source_id, title, text, metadata_json,
          embedding_dim, quant_method, vector_min, vector_scale, vector_blob, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        chunk.id,
        chunk.sourceType,
        chunk.sourceId ?? null,
        chunk.title ?? null,
        chunk.text,
        JSON.stringify(chunk.metadata),
        quantized.dim,
        quantized.method,
        quantized.min,
        quantized.scale,
        encodeCodes(quantized.codes),
        new Date().toISOString()
      );
    }
  }

  async search(input: {
    queryEmbedding: number[];
    topK: number;
    filters?: Record<string, string | number | boolean>;
  }): Promise<SearchResult[]> {
    await this.ensureSchema();
    const rows = await prisma.$queryRawUnsafe<RagChunkRow[]>(
      `SELECT id, source_type, source_id, title, text, metadata_json, embedding_dim, quant_method, vector_min, vector_scale, vector_blob FROM rag_chunks`
    );
    const query = quantizeVector(input.queryEmbedding, TURBO_VECTOR_CONFIG);
    return rows
      .map(rowToChunk)
      .filter(({ chunk }) => matchesFilters(chunk, input.filters))
      .map(({ chunk, quantized }) => ({ ...chunk, score: cosineApproxFromQuantized(query, quantized) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Math.min(input.topK, 20)));
  }
}

export function getDefaultVectorStore() {
  if (shouldUseInMemoryStore()) {
    return getGlobalInMemoryStore();
  }
  return new TurboVectorSqliteStore();
}

function shouldUseInMemoryStore() {
  return process.env.RAG_VECTOR_STORE === "memory" || process.env.VERCEL === "1" || process.env.VERCEL === "true";
}

function getGlobalInMemoryStore() {
  const globalForRag = globalThis as typeof globalThis & {
    homePathInMemoryVectorStore?: InMemoryTurboVectorStore;
  };
  globalForRag.homePathInMemoryVectorStore ??= new InMemoryTurboVectorStore();
  return globalForRag.homePathInMemoryVectorStore;
}

function rowToChunk(row: RagChunkRow) {
  const metadata = JSON.parse(row.metadata_json ?? "{}") as RagMetadata;
  const chunk: RagChunk = {
    id: row.id,
    sourceType: row.source_type as RagChunk["sourceType"],
    sourceId: row.source_id ?? undefined,
    title: row.title ?? undefined,
    text: row.text,
    metadata
  };
  const quantized: QuantizedVector = {
    dim: row.embedding_dim,
    method: row.quant_method === "turboquant_rht_normal_uint8" ? "turboquant_rht_normal_uint8" : "turboquant_lite_uint8",
    min: row.vector_min,
    scale: row.vector_scale,
    codes: decodeCodes(row.vector_blob),
    rotation: row.quant_method === "turboquant_rht_normal_uint8" ? "rht_pad512" : "legacy_pseudo",
    quantizer: row.quant_method === "turboquant_rht_normal_uint8" ? "normal_quantile_uint8" : "minmax_uint8",
    residualCorrection: row.quant_method === "turboquant_rht_normal_uint8"
  };
  return { chunk, quantized };
}

function matchesFilters(chunk: RagChunk, filters?: Record<string, string | number | boolean>) {
  if (!filters) return true;
  return Object.entries(filters).every(([key, value]) => {
    if (key === "id") return chunk.id === value;
    if (key === "sourceType") return chunk.sourceType === value;
    if (key === "sourceId") return chunk.sourceId === value;
    return chunk.metadata[key] === value;
  });
}
