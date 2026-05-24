import { describe, expect, it } from "vitest";
import { hashEmbedding } from "@/server/rag/embedding";
import {
  LEGACY_TURBO_VECTOR_CONFIG,
  TURBO_VECTOR_CONFIG,
  quantizeVector,
  dequantizeVector,
  cosineApproxFromQuantized
} from "@/server/rag/turboVector/quantize";
import { InMemoryTurboVectorStore } from "@/server/rag/turboVector/store";

describe("TurboVector-lite RAG", () => {
  it("quantizes deterministically with uint8 compressed codes", () => {
    const embedding = hashEmbedding("범어동 후보 단지 거래 집중도 전세가율", 384);
    const a = quantizeVector(embedding);
    const b = quantizeVector(embedding);

    expect(a.method).toBe("turboquant_rht_normal_uint8");
    expect(a.codes.length).toBe(TURBO_VECTOR_CONFIG.dim);
    expect(Array.from(a.codes)).toEqual(Array.from(b.codes));
    expect(dequantizeVector(a).length).toBe(TURBO_VECTOR_CONFIG.dim);
  });

  it("keeps the legacy pseudo rotation quantizer available", () => {
    const embedding = hashEmbedding("범어동 후보 단지 거래 집중도 전세가율", 384);
    const legacy = quantizeVector(embedding, LEGACY_TURBO_VECTOR_CONFIG);

    expect(legacy.method).toBe("turboquant_lite_uint8");
    expect(legacy.codes.length).toBe(384);
  });

  it("keeps similar text near the top after compression", async () => {
    const store = new InMemoryTurboVectorStore();
    await store.upsert([
      {
        id: "chunk-a",
        sourceType: "complex_signal",
        title: "범어동 거래 집중 후보",
        text: "범어동 아파트는 거래 집중도와 전세가율이 높아 후보로 노출됐다.",
        metadata: { region: "대구 수성구" },
        embedding: hashEmbedding("범어동 아파트 거래 집중도 전세가율 후보")
      },
      {
        id: "chunk-b",
        sourceType: "safety_policy",
        title: "안전 문구",
        text: "홈패스는 매수 추천과 수익 보장을 하지 않는다.",
        metadata: { policy: "safety" },
        embedding: hashEmbedding("매수 추천 수익 보장 금지")
      }
    ]);

    const results = await store.search({
      queryEmbedding: hashEmbedding("범어동 후보가 뜬 이유와 거래 집중도"),
      topK: 1
    });

    expect(results[0]?.id).toBe("chunk-a");
    expect(results[0]?.score).toBeGreaterThan(0);
  });

  it("preserves approximate self-similarity better than unrelated vectors", () => {
    const query = quantizeVector(hashEmbedding("Transformer 회복 신호 거래 재활성화"));
    const same = quantizeVector(hashEmbedding("Transformer 회복 신호 거래 재활성화"));
    const other = quantizeVector(hashEmbedding("세무 법률 확답 금지 안전 문구"));

    expect(cosineApproxFromQuantized(query, same)).toBeGreaterThan(cosineApproxFromQuantized(query, other));
  });
});
