import { describe, expect, it } from "vitest";
import { buildHomePathRagContext, getIntentRetrievalPlan, rankHomePathRagResults } from "@/server/rag/contextBuilder";
import type { SearchResult } from "@/server/rag/turboVector/types";
import type { ComplexSignalCandidate } from "@/types";
import { sampleHomes, sampleProfiles } from "@/data/dummy";

const candidate = {
  id: "complex-1",
  sourceType: "complex_signal",
  cardType: "fit_now",
  lawdCode5: "27260",
  region: "대구 수성구",
  complexName: "범어홈패스",
  propertyType: "apartment",
  areaBucket: "84",
  floorBand: "mid",
  referencePrice: 650_000_000,
  transactionHeat: 2.2,
  disclaimer: "참고용"
} as unknown as ComplexSignalCandidate;

const results: SearchResult[] = [
  {
    id: "doc-1",
    sourceType: "doc",
    title: "일반 문서",
    text: "공공데이터 활용 설명",
    metadata: {},
    score: 0.5
  },
  {
    id: "complex-1",
    sourceType: "complex_signal",
    title: "범어홈패스 84",
    text: "대구 수성구 범어홈패스 84 후보. 거래 집중도 2.2배, 전세가율 61%.",
    metadata: { complexName: "범어홈패스", lawdCode5: "27260", region: "대구 수성구", areaBucket: "84" },
    score: 0.34
  },
  {
    id: "safety-1",
    sourceType: "safety_policy",
    title: "홈패스 안전 원칙",
    text: "매수 추천, 수익 보장, 대출 승인 보장을 하지 않는다.",
    metadata: {},
    score: 0.1
  }
];

describe("RAG context ranking", () => {
  it("adds sourceType and activeCandidate boosts without losing raw score", () => {
    const ranked = rankHomePathRagResults(results, candidate, "candidate_reason");

    expect(ranked[0].id).toBe("complex-1");
    expect(ranked[0].score).toBe(0.34);
    expect(ranked[0].finalScore).toBeGreaterThan(ranked[0].score);
    expect(ranked[0].boostReason?.join(" ")).toContain("activeCandidate");
  });

  it("keeps safety policy in every retrieval plan", () => {
    for (const intent of ["candidate_reason", "purchase_power", "comparison", "risk_check", "data_source", "safety", "general"] as const) {
      expect(getIntentRetrievalPlan(intent).sourceMinimums.some((item) => item.sourceType === "safety_policy")).toBe(true);
    }
  });

  it("pins user situation and saved interest homes into the prompt context", async () => {
    const context = await buildHomePathRagContext({
      message: "내 관심 후보 기준으로 설명해줘",
      useRag: false,
      profile: sampleProfiles[0],
      currentHome: sampleHomes[0],
      activeCandidate: candidate,
      portfolioItems: [
        {
          id: "portfolio-1",
          userId: "user-1",
          propertyId: "complex-2",
          sourceType: "complex_signal",
          complexSignalId: "complex-2",
          complexName: "만촌홈패스",
          region: "대구 수성구",
          areaBucket: "84",
          floorBand: "mid",
          referencePrice: 620_000_000,
          referenceDate: "2026-05-01",
          reason: "같은 예산 비교용",
          virtualPurchasePrice: 620_000_000,
          virtualPurchaseDate: "2026-05-01",
          virtualInvestmentAmount: 240_000_000,
          memo: "관심 주거 후보",
          createdAt: "2026-05-01",
          updatedAt: "2026-05-01"
        }
      ]
    });

    expect(context.retrieved).toHaveLength(0);
    expect(context.contextText).toContain("사용자 상황 고정 context");
    expect(context.contextText).toContain("현재 후보 고정 context");
    expect(context.contextText).toContain("관심 주택 고정 context");
    expect(context.contextText).toContain("만촌홈패스");
    expect(context.contextText).toContain("월소득");
  });

  it("boosts same-budget peer homes around the user's anchors", () => {
    const peerResults: SearchResult[] = [
      {
        id: "peer",
        sourceType: "complex_signal",
        title: "만촌홈패스 84",
        text: "대구 수성구 만촌홈패스 84 후보. 전세가율 60%.",
        metadata: { complexName: "만촌홈패스", region: "대구 수성구", areaBucket: "84", referencePrice: 630_000_000 },
        score: 0.3
      },
      {
        id: "far",
        sourceType: "complex_signal",
        title: "타지역후보 59",
        text: "다른 지역 후보.",
        metadata: { complexName: "타지역후보", region: "부산진구", areaBucket: "59", referencePrice: 1_400_000_000 },
        score: 0.35
      }
    ];

    const ranked = rankHomePathRagResults(peerResults, candidate, "comparison", {
      anchors: [
        {
          id: "interest:만촌홈패스",
          role: "portfolio_item",
          label: "만촌홈패스",
          complexName: "만촌홈패스",
          region: "대구 수성구",
          areaBucket: "84",
          referencePrice: 620_000_000
        }
      ],
      calculations: { purchasePowerNow: 650_000_000, moveUpBudget: 800_000_000, fiveYearPower: 950_000_000 }
    });

    expect(ranked[0].id).toBe("peer");
    expect(ranked[0].boostReason?.join(" ")).toContain("portfolio_item");
    expect(ranked[0].boostReason?.join(" ")).toContain("userFit");
  });
});
