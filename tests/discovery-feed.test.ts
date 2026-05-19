import { describe, expect, test } from "vitest";
import { complexSignalToPropertyLike } from "@/lib/candidateAdapter";
import { expandPreferredRegions } from "@/server/regions/regionExpansionService";
import type { ComplexSignalCandidate } from "@/types";

describe("discovery feed region and adapter behavior", () => {
  test("expands exact preferred region and similar regions", () => {
    const regions = expandPreferredRegions({
      preferredRegions: ["대구 수성구"],
      preferredLawdCodes: ["27260"]
    });
    expect(regions[0]).toMatchObject({ lawdCode5: "27260", reason: "exact" });
    expect(regions.some((region) => region.reason !== "exact")).toBe(true);
  });

  test("converts complex signal to property-like object for existing calculators", () => {
    const property = complexSignalToPropertyLike(makeCandidate({ referencePrice: 640_000_000, recentJeonseMedian: 410_000_000 }));
    expect(property.salePrice).toBe(640_000_000);
    expect(property.jeonsePrice).toBe(410_000_000);
    expect(property.name).toContain("84");
    expect(property.isAd).toBe(false);
  });

  test("complex signals remain non-listing analysis candidates", () => {
    const property = complexSignalToPropertyLike(makeCandidate({ referencePrice: 500_000_000 }));
    expect(property.isDirectListing).toBe(false);
    expect(property.isPartnerListing).toBe(false);
  });
});

function makeCandidate(partial: Partial<ComplexSignalCandidate>): ComplexSignalCandidate {
  return {
    id: "signal-1",
    sourceType: "complex_signal",
    cardType: "hot_complex",
    lawdCode5: "27260",
    region: "대구 수성구",
    legalDong: "범어동",
    complexName: "범어 테스트아파트",
    propertyType: "apartment",
    areaBucket: "84",
    floorBand: "mid",
    referencePrice: 640_000_000,
    referencePriceLabel: "최근 실거래 시간가중 기준가 6.4억",
    referencePriceMethod: "time_weighted_trimmed_mean",
    recentMedianPrice: 630_000_000,
    recentWeightedPrice: 640_000_000,
    recentJeonseMedian: 400_000_000,
    previousHighPrice: 780_000_000,
    drawdownFromHigh: -18,
    jeonseRatio: 64,
    volume30d: 8,
    volume90d: 18,
    previous90dVolume: 6,
    baselineMonthlyVolume: 4,
    transactionHeat: 2,
    reaccelerationScore: 3,
    inventoryLikelihoodScore: 70,
    userFit: {
      possibleNow: false,
      possibleAfterSellingCurrentHome: true,
      yearsToReach: 5,
      shortageNow: 100_000_000,
      monthlyBurdenDelta: 1_200_000
    },
    scores: {
      recommendationScore: 80,
      affordabilityFit: 70,
      regionFit: 100,
      transactionHeatScore: 80,
      drawdownOpportunityScore: 50,
      jeonseRatioScore: 35,
      reaccelerationScore: 70,
      communityHeatScore: 55,
      inventoryLikelihoodScore: 70
    },
    externalLinks: {
      naverSearchUrl: "https://search.naver.com/search.naver?query=test",
      accuracyLevel: "complex_name_search"
    },
    reasons: ["관심지역과 일치합니다.", "거래 집중도가 높습니다.", "현재 집 매도 시 접근 가능합니다."],
    disclaimer: "공공 실거래가 기반 분석 후보입니다.",
    ...partial
  };
}
