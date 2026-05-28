import { describe, expect, it } from "vitest";
import { generateHomePathChatAnswer, resolveModelPlan } from "@/server/llm/qwenClient";
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

  it("routes long RAG answers to the long-answer model", () => {
    const previousLongModel = process.env.LLM_LONG_MODEL;
    process.env.LLM_LONG_MODEL = "qwen3.6-plus";

    const plan = resolveModelPlan({
      configuredModel: "qwen3.6-flash",
      endpointType: "remote",
      intent: "candidate_reason",
      userMessage: "이 후보가 왜 떴는지 근거까지 자세히 설명해줘.",
      contextText: "국토부 실거래와 KREB 지역지수 context\n".repeat(180)
    });

    if (previousLongModel === undefined) delete process.env.LLM_LONG_MODEL;
    else process.env.LLM_LONG_MODEL = previousLongModel;

    expect(plan.primaryModel).toBe("qwen3.6-plus");
    expect(plan.maxTokens).toBeGreaterThanOrEqual(1800);
    expect(plan.reason).toBe("long_rag_context");
  });

  it("routes risk and source questions to the reasoning model", () => {
    const previousReasoningModel = process.env.LLM_REASONING_MODEL;
    process.env.LLM_REASONING_MODEL = "qwen3.7-max";

    const plan = resolveModelPlan({
      configuredModel: "qwen3.6-flash",
      endpointType: "remote",
      intent: "risk_check",
      userMessage: "이 지역 리스크와 데이터 출처를 설명해줘.",
      contextText: "짧은 context"
    });

    if (previousReasoningModel === undefined) delete process.env.LLM_REASONING_MODEL;
    else process.env.LLM_REASONING_MODEL = previousReasoningModel;

    expect(plan.primaryModel).toBe("qwen3.7-max");
    expect(plan.maxTokens).toBeGreaterThanOrEqual(1600);
    expect(plan.reason).toBe("reasoning_or_risk_answer");
  });
});
