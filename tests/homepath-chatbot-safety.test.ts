import { describe, expect, it } from "vitest";
import {
  HOMEPASS_SAFETY_NOTICE,
  buildSafeFallbackAnswer,
  ensureHomePathSafety
} from "@/server/llm/homepassSystemPrompt";
import { buildHomePathInstructionContext } from "@/server/llm/homepathScenarioInstructions";
import { classifyIntent, getIntentRetrievalPlan } from "@/server/rag/contextBuilder";
import { sampleHomes, sampleProfiles } from "@/data/dummy";

describe("HomePath AI chatbot safety", () => {
  it("keeps the bot in decision-support mode", () => {
    const answer = ensureHomePathSafety("무조건 사면 됩니다. 수익 보장입니다.");

    expect(answer).not.toContain("수익 보장입니다");
    expect(answer).toContain(HOMEPASS_SAFETY_NOTICE);
  });

  it("builds a safe fallback answer when Qwen is unavailable", () => {
    const answer = buildSafeFallbackAnswer({
      message: "왜 이 후보가 떴어?",
      calculationSummary: "현재 구매력 6억, 정리 후 예산 8억",
      contextText: "[근거 1] 거래 집중도 2.4배\n[근거 2] 전세가율 64%"
    });

    expect(answer).toContain("근거 3개:");
    expect(answer).toContain("1. 구매력 계산 근거");
    expect(answer).toContain("2. 실거래/전세가율/거래량 근거");
    expect(answer).toContain("거래 집중도");
    expect(answer).toContain(HOMEPASS_SAFETY_NOTICE);
  });

  it("classifies candidate-reason and safety intents", () => {
    expect(classifyIntent("왜 이 후보가 떴어?")).toBe("candidate_reason");
    expect(classifyIntent("이거 사도 돼? 수익 보장돼?")).toBe("safety");
    expect(classifyIntent("같은 예산이면 어디가 더 안전해?")).toBe("comparison");
  });

  it("uses intent-specific RAG source plans", () => {
    const comparisonPlan = getIntentRetrievalPlan("comparison");
    const dataSourcePlan = getIntentRetrievalPlan("data_source");

    expect(comparisonPlan.resultLimit).toBeGreaterThanOrEqual(8);
    expect(comparisonPlan.sourceMinimums.find((item) => item.sourceType === "complex_signal")?.minimum).toBeGreaterThanOrEqual(3);
    expect(comparisonPlan.sourceMinimums.some((item) => item.sourceType === "model_artifact")).toBe(true);
    expect(dataSourcePlan.sourceMinimums.some((item) => item.sourceType === "doc")).toBe(true);
    expect(dataSourcePlan.sourceMinimums.some((item) => item.sourceType === "faq")).toBe(true);
  });

  it("injects scenario instructions for current-home explanations", () => {
    const instructions = buildHomePathInstructionContext({
      message: "내 집 넣었으니 갈아타기 설명해줘",
      intent: "general",
      profile: sampleProfiles[0],
      currentHome: sampleHomes[0]
    });

    expect(instructions.scenarios).toContain("current_home_explanation");
    expect(instructions.text).toContain("현재 집 설명 상황");
    expect(instructions.text).toContain("매수하라, 팔아라");
    expect(instructions.text).toContain(sampleHomes[0].region);
  });

  it("injects comparison and safety instructions for same-budget questions", () => {
    const instructions = buildHomePathInstructionContext({
      message: "같은 예산이면 어디가 더 안전해? 추천이야?",
      intent: "safety",
      profile: sampleProfiles[0],
      currentHome: sampleHomes[0]
    });

    expect(instructions.scenarios).toContain("same_budget_compare");
    expect(instructions.scenarios).toContain("risk_and_safety");
    expect(instructions.text).toContain("단일 승자를 선언하지 말고");
    expect(instructions.text).toContain("매수 추천이 아니라고 답한다");
  });
});
