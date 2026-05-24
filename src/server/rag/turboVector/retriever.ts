import { embedText } from "../embedding";
import { getDefaultVectorStore } from "./store";
import type { SearchResult } from "./types";

export async function retrieveHomePathContext(input: {
  query: string;
  topK?: number;
  filters?: Record<string, string | number | boolean>;
}): Promise<SearchResult[]> {
  const store = getDefaultVectorStore();
  const queryEmbedding = await embedText(input.query);
  return store.search({
    queryEmbedding,
    topK: input.topK ?? 4,
    filters: input.filters
  });
}
