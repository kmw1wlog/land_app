import { describe, expect, it } from "vitest";
import { buildHomePathRagChunks } from "@/server/rag/turboVector/chunkers";

describe("fusion RAG chunks", () => {
  it("adds fusion source types for data-source and risk explanations", async () => {
    const chunks = await buildHomePathRagChunks();
    const sourceTypes = new Set(chunks.map((chunk) => chunk.sourceType));
    const dataSourceText = chunks.find((chunk) => chunk.id === "faq:data-source")?.text ?? "";

    expect(sourceTypes.has("fusion_data")).toBe(true);
    expect(sourceTypes.has("kreb_market_index")).toBe(true);
    expect(sourceTypes.has("hug_jeonse_risk")).toBe(true);
    expect(sourceTypes.has("transport_accessibility")).toBe(true);
    expect(dataSourceText).toContain("한국부동산원");
    expect(dataSourceText).toContain("HUG");
    expect(dataSourceText).toContain("교통 접근성");
  });
});
