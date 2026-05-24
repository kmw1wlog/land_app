import { describe, expect, it } from "vitest";
import { generateHomePathChatAnswer } from "@/server/llm/qwenClient";
import { HOMEPASS_SAFETY_NOTICE } from "@/server/llm/homepassSystemPrompt";

describe("Qwen RAG fallback", () => {
  it("returns a safe fallback when the configured endpoint is unavailable", async () => {
    const previousBaseUrl = process.env.LLM_BASE_URL;
    const previousLocalBaseUrl = process.env.LOCAL_LLM_BASE_URL;
    process.env.LLM_BASE_URL = "http://127.0.0.1:9/v1";
    delete process.env.LOCAL_LLM_BASE_URL;

    const result = await generateHomePathChatAnswer({
      userMessage: "이 결과는 매수 추천이야?",
      calculationSummary: "현재 구매력 5억, 정리 후 예산 6억",
      contextText: "[안전 정책 1] 홈패스는 매수 추천과 수익 보장을 하지 않는다.",
      timeoutMs: 50
    }).finally(() => {
      if (previousBaseUrl === undefined) delete process.env.LLM_BASE_URL;
      else process.env.LLM_BASE_URL = previousBaseUrl;
      if (previousLocalBaseUrl === undefined) delete process.env.LOCAL_LLM_BASE_URL;
      else process.env.LOCAL_LLM_BASE_URL = previousLocalBaseUrl;
    });

    expect(result.fallbackUsed).toBe(true);
    expect(result.answer).toContain(HOMEPASS_SAFETY_NOTICE);
    expect(result.answer).not.toContain("수익 보장입니다");
  });
});
