import { describe, expect, test, vi } from "vitest";
import { scoreComplexCandidate } from "@/server/signals/complexRecommendationService";
import { sampleHomes, sampleProfiles } from "@/data/dummy";

vi.mock("@/server/external-links/naverRealEstateLinkResolver", () => ({
  resolveNaverRealEstateLink: vi.fn(async () => ({
    url: "https://search.naver.com/search.naver?query=test",
    accuracyLevel: "complex_name_search",
    source: "generated_search",
    label: "외부 사이트에서 매물 확인"
  }))
}));

describe("discovery personalization", () => {
  test("top card changes between low-cash and high-cash users on the same signal set", async () => {
    const affordable = snapshot("affordable", 350_000_000, 8);
    const stretch = snapshot("stretch", 1_250_000_000, 20);
    const lowCashProfile = { ...sampleProfiles[0], cashOnHand: 40_000_000, monthlyIncome: 3_500_000 };
    const highCashProfile = { ...sampleProfiles[0], cashOnHand: 800_000_000, monthlyIncome: 12_000_000 };

    const lowScores = await Promise.all([affordable, stretch].map((item) =>
      scoreComplexCandidate({ snapshot: item, userProfile: lowCashProfile, currentHome: { ...sampleHomes[0], estimatedCurrentPrice: 300_000_000 } })
    ));
    const highScores = await Promise.all([affordable, stretch].map((item) =>
      scoreComplexCandidate({ snapshot: item, userProfile: highCashProfile, currentHome: { ...sampleHomes[0], estimatedCurrentPrice: 900_000_000 } })
    ));

    const lowTop = lowScores.sort((a, b) => b.scores.recommendationScore - a.scores.recommendationScore)[0];
    const highTop = highScores.sort((a, b) => b.scores.recommendationScore - a.scores.recommendationScore)[0];
    expect(lowTop.id).toBe("affordable");
    expect(highTop.id).toBe("stretch");
  });
});

function snapshot(id: string, price: number, volume90d: number) {
  return {
    id,
    lawdCode5: "27260",
    legalDongCode10: "2726010100",
    region: "대구 수성구",
    legalDong: "범어동",
    complexName: id,
    propertyType: "apartment",
    areaBucket: "84",
    floorBand: "mid",
    referencePrice: BigInt(price),
    referencePriceMethod: "time_weighted_trimmed_mean",
    recentMedianPrice: BigInt(price),
    recentWeightedPrice: BigInt(price),
    lowFloorPrice: BigInt(Math.round(price * 0.96)),
    midFloorPrice: BigInt(price),
    highFloorPrice: BigInt(Math.round(price * 1.03)),
    recentJeonseMedian: BigInt(Math.round(price * 0.62)),
    previousHighPrice: BigInt(Math.round(price * 1.18)),
    drawdownFromHigh: -15,
    jeonseRatio: 62,
    volume30d: Math.max(2, Math.round(volume90d / 3)),
    volume90d,
    previous90dVolume: 4,
    baselineMonthlyVolume: 2,
    transactionHeat: volume90d / 6,
    reaccelerationScore: volume90d / 4,
    inventoryLikelihoodScore: 70,
    latestTradeDate: new Date(),
    hotScore: 70,
    discountScore: 45,
    jeonseScore: 35,
    recommendationScore: 70,
    monthlyTradeAvg: volume90d / 3,
    liquidityScore: 80,
    leaderScore: price > 1_000_000_000 ? 90 : 55,
    sellabilityScore: 80
  };
}
