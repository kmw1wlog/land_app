import { describe, expect, it } from "vitest";
import {
  HOMEPASS_SAFETY_NOTICE,
  buildSafeFallbackAnswer,
  ensureHomePathSafety
} from "@/server/llm/homepassSystemPrompt";
import { classifyIntent } from "@/server/rag/contextBuilder";

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

    expect(answer).toContain("근거 3개");
    expect(answer).toContain("거래 집중도");
    expect(answer).toContain(HOMEPASS_SAFETY_NOTICE);
  });

  it("classifies candidate-reason and safety intents", () => {
    expect(classifyIntent("왜 이 후보가 떴어?")).toBe("candidate_reason");
    expect(classifyIntent("이거 사도 돼? 수익 보장돼?")).toBe("safety");
  });
});
