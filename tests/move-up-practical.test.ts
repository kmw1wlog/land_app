import { describe, expect, test } from "vitest";
import { calculateLeaderScore, calculateLiquidityScore } from "@/server/move-up/leaderComplexService";
import { buildMoveUpTargetBands, findMoveUpBand } from "@/server/move-up/moveUpBandService";

describe("move-up practical scoring", () => {
  test("builds 1.3x, 1.5x, and 2.0x target bands", () => {
    const bands = buildMoveUpTargetBands(800_000_000);
    expect(bands.map((band) => band.multiplier)).toEqual([1.3, 1.5, 2.0]);
    const onePointFive = bands.find((band) => band.multiplier === 1.5)!;
    expect(onePointFive.targetMinPrice).toBeGreaterThan(1_100_000_000);
    expect(onePointFive.targetMaxPrice).toBeLessThan(1_300_000_000);
    expect(findMoveUpBand(1_200_000_000, 800_000_000)?.multiplier).toBe(1.5);
  });

  test("scores liquidity from monthly trades and household count", () => {
    expect(calculateLiquidityScore({ monthlyTradeAvg: 2, volume90d: 6 })).toBe(100);
    expect(calculateLiquidityScore({ monthlyTradeAvg: 0.5, volume90d: 4 })).toBe(60);
    expect(calculateLiquidityScore({ monthlyTradeAvg: 1, volume90d: 3, householdCount: 500 })).toBeGreaterThan(80);
  });

  test("leader score reflects price percentile, volume percentile, liquidity and jeonse stability", () => {
    const score = calculateLeaderScore({
      referencePrice: 1_200_000_000,
      regionPeerPrices: [600_000_000, 800_000_000, 1_000_000_000, 1_200_000_000],
      volume90d: 12,
      peerVolume90d: [2, 4, 8, 12],
      liquidityScore: 90,
      jeonseRatio: 64
    });
    expect(score).toBeGreaterThan(80);
  });
});
