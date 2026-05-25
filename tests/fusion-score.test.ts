import { describe, expect, it } from "vitest";
import { calculateFusedStabilityScore } from "@/server/public-data/fusion/fusionScore";

describe("fusion stability score", () => {
  it("keeps the score bounded and labels it as a stability signal", () => {
    const result = calculateFusedStabilityScore({
      molitTradeHeat: 1.8,
      molitJeonseRatio: 62,
      molitDrawdownFromHigh: -12,
      krebSaleMom: 0.3,
      krebRentMom: 0.2,
      krebVolatilityScore: 35,
      hugJeonseRiskScore: 28,
      transitAccessibilityScore: 84
    });

    expect(result.fusedStabilityScore).toBeGreaterThanOrEqual(0);
    expect(result.fusedStabilityScore).toBeLessThanOrEqual(100);
    expect(["안정", "확인 필요", "보수적 검토", "데이터 부족"]).toContain(result.fusedRiskGrade);
    expect(result.components).toHaveProperty("krebMarketStability");
    expect(result.components).toHaveProperty("hugTenantSafety");
    expect(result.components).toHaveProperty("transportAccessibility");
  });
});
