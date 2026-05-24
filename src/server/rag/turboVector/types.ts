export type RagSourceType =
  | "doc"
  | "complex_signal"
  | "model_artifact"
  | "faq"
  | "safety_policy";

export type RagMetadata = Record<string, string | number | boolean | null>;

export interface RagChunk {
  id: string;
  sourceType: RagSourceType;
  sourceId?: string;
  title?: string;
  text: string;
  metadata: RagMetadata;
}

export interface EmbeddedChunk extends RagChunk {
  embedding: number[];
}

export interface SearchResult extends RagChunk {
  score: number;
  finalScore?: number;
  boostReason?: string[];
}

export interface VectorStore {
  upsert(chunks: EmbeddedChunk[]): Promise<void>;

  search(input: {
    queryEmbedding: number[];
    topK: number;
    filters?: Record<string, string | number | boolean>;
  }): Promise<SearchResult[]>;
}
