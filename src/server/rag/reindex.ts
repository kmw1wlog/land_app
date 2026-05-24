import { embedChunks } from "./embedding";
import { buildHomePathRagChunks } from "./turboVector/chunkers";
import { getDefaultVectorStore, TurboVectorSqliteStore } from "./turboVector/store";

export async function reindexHomePathRag() {
  const chunks = await buildHomePathRagChunks();
  const embedded = await embedChunks(chunks);
  const store = getDefaultVectorStore();
  if (store instanceof TurboVectorSqliteStore) {
    await store.clear();
  }
  await store.upsert(embedded);
  return {
    indexedCount: embedded.length,
    sourceTypeCounts: embedded.reduce<Record<string, number>>((acc, chunk) => {
      acc[chunk.sourceType] = (acc[chunk.sourceType] ?? 0) + 1;
      return acc;
    }, {}),
    vector: {
      provider: "turbo_vector_sqlite",
      quantization: "turboquant_lite_uint8"
    }
  };
}
