import { prisma } from "@/server/db";
import {
  cosineApproxFromQuantized,
  decodeCodes,
  encodeCodes,
  quantizeVector,
  TURBO_VECTOR_CONFIG,
  type QuantizedMethod,
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
  padded_dim: number | null;
  quant_method: string;
  codebook_id: string | null;
  vector_min: number;
  vector_scale: number;
  vector_blob: Buffer | Uint8Array;
  residual_norm: number | null;
  residual_method: string | null;
  residual_blob: Buffer | Uint8Array | null;
};

export class InMemoryTurboVectorStore implements VectorStore {
  private rows = new Map<string, { chunk: RagChunk; quantized: QuantizedVector }>();

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
      .filter(({ chunk }) => matchesFilters(chunk.metadata, input.filters))
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
        padded_dim INTEGER,
        quant_method TEXT NOT NULL,
        codebook_id TEXT,
        vector_min REAL NOT NULL,
        vector_scale REAL NOT NULL,
        vector_blob BLOB NOT NULL,
        residual_norm REAL,
        residual_method TEXT,
        residual_blob BLOB,
        created_at TEXT NOT NULL
      )
    `);
    await addColumnIfMissing("rag_chunks", "padded_dim", "INTEGER");
    await addColumnIfMissing("rag_chunks", "codebook_id", "TEXT");
    await addColumnIfMissing("rag_chunks", "residual_norm", "REAL");
    await addColumnIfMissing("rag_chunks", "residual_method", "TEXT");
    await addColumnIfMissing("rag_chunks", "residual_blob", "BLOB");
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
          embedding_dim, padded_dim, quant_method, codebook_id, vector_min, vector_scale, vector_blob,
          residual_norm, residual_method, residual_blob, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        chunk.id,
        chunk.sourceType,
        chunk.sourceId ?? null,
        chunk.title ?? null,
        chunk.text,
        JSON.stringify(chunk.metadata),
        quantized.dim,
        quantized.paddedDim,
        quantized.method,
        quantized.codebookId,
        quantized.min,
        quantized.scale,
        encodeCodes(quantized.codes),
        quantized.residualNorm ?? null,
        quantized.residualMethod ?? null,
        quantized.residualSigns ? encodeCodes(quantized.residualSigns) : null,
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
      `SELECT id, source_type, source_id, title, text, metadata_json, embedding_dim, padded_dim, quant_method, codebook_id, vector_min, vector_scale, vector_blob, residual_norm, residual_method, residual_blob FROM rag_chunks`
    );
    const query = quantizeVector(input.queryEmbedding, TURBO_VECTOR_CONFIG);
    return rows
      .map(rowToChunk)
      .filter(({ chunk }) => matchesFilters(chunk.metadata, input.filters))
      .map(({ chunk, quantized }) => ({ ...chunk, score: cosineApproxFromQuantized(query, quantized) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, Math.min(input.topK, 20)));
  }
}

export function getDefaultVectorStore() {
  return new TurboVectorSqliteStore();
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
  const method = (row.quant_method as QuantizedMethod) || "turboquant_lite_uint8";
  const quantized: QuantizedVector = {
    dim: row.embedding_dim,
    paddedDim: row.padded_dim ?? row.embedding_dim,
    method,
    min: row.vector_min,
    scale: row.vector_scale,
    codebookId: row.codebook_id ?? (method === "turboquant_lite_uint8" ? "legacy_minmax" : "normal_clipped_8bit_rht_512"),
    codes: decodeCodes(row.vector_blob),
    residualNorm: row.residual_norm ?? undefined,
    residualMethod: row.residual_method === "qjl_sign_rht" ? "qjl_sign_rht" : undefined,
    residualSigns: row.residual_blob ? decodeCodes(row.residual_blob) : undefined
  };
  return { chunk, quantized };
}

async function addColumnIfMissing(tableName: string, columnName: string, definition: string) {
  const columns = await prisma.$queryRawUnsafe<Array<{ name: string }>>(`PRAGMA table_info(${tableName})`);
  if (!columns.some((column) => column.name === columnName)) {
    await prisma.$executeRawUnsafe(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
}

function matchesFilters(metadata: RagMetadata, filters?: Record<string, string | number | boolean>) {
  if (!filters) return true;
  return Object.entries(filters).every(([key, value]) => metadata[key] === value);
}
