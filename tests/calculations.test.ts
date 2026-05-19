import { describe, expect, it } from "vitest";
import {
  analyzePropertyForUser,
  calculateInvestmentAmount,
  calculateMoveUpBudget,
  calculateNetCashAfterSellingHome,
  calculatePurchasePower,
  calculateRecommendationScore,
  estimateLoanCapacity
} from "@/lib/calculations";
import { properties, sampleHomes, sampleProfiles } from "@/data/dummy";

describe("MVP calculation engine", () => {
  const profile = sampleProfiles[0];
  const currentHome = sampleHomes[0];
  const property = properties[0];

  it("estimates loan capacity with DSR/LTV style caps", () => {
    const capacity = estimateLoanCapacity(profile, {
      propertyPrice: property.salePrice,
      region: property.region,
      currentHome
    });
    expect(capacity).toBeGreaterThan(0);
    expect(capacity).toBeLessThanOrEqual(property.salePrice * 0.8);
  });

  it("calculates purchase power as cash plus estimated loan capacity", () => {
    expect(calculatePurchasePower(profile)).toBe(profile.cashOnHand + estimateLoanCapacity(profile));
  });

  it("deducts loan balance and simplified selling costs from home sale proceeds", () => {
    const netCash = calculateNetCashAfterSellingHome(currentHome);
    expect(netCash).toBeGreaterThan(200_000_000);
    expect(netCash).toBeLessThan(currentHome.estimatedCurrentPrice);
  });

  it("creates a move-up budget from sale cash plus loan capacity", () => {
    expect(calculateMoveUpBudget(profile, currentHome, property)).toBeGreaterThan(
      calculateNetCashAfterSellingHome(currentHome)
    );
  });

  it("calculates jeonse-gap investment amount including purchase costs", () => {
    expect(calculateInvestmentAmount(property)).toBeGreaterThan(property.salePrice - property.jeonsePrice);
  });

  it("returns a bounded recommendation score and user-specific analysis", () => {
    const score = calculateRecommendationScore(profile, property);
    const analysis = analyzePropertyForUser(profile, currentHome, property);

    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(analysis.recommendationScore).toBe(score);
    expect(analysis.investmentAmount).toBe(calculateInvestmentAmount(property));
    expect(analysis.requiredCash).toBeGreaterThan(0);
    expect(analysis.loanLimit).toBeGreaterThanOrEqual(0);
    expect(analysis.regulationNotes.length).toBeGreaterThan(0);
  });
});
