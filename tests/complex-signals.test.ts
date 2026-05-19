import { describe, expect, test } from "vitest";
import { getAreaBucket } from "@/server/signals/buckets";
import { getFloorBand } from "@/server/signals/floorBand";
import { calculateSignalMetrics } from "@/server/signals/complexSignalService";
import { calculateTimeWeightedPrice } from "@/server/signals/priceEstimator";

describe("complex signal utilities", () => {
  test("classifies apartment area buckets", () => {
    expect(getAreaBucket(39, "apartment")).toBe("under_40");
    expect(getAreaBucket(59, "apartment")).toBe("59");
    expect(getAreaBucket(84.9, "apartment")).toBe("84");
    expect(getAreaBucket(120, "apartment")).toBe("over_101");
  });

  test("classifies officetel area buckets", () => {
    expect(getAreaBucket(25, "officetel")).toBe("officetel_under_30");
    expect(getAreaBucket(39, "officetel")).toBe("officetel_30_45");
    expect(getAreaBucket(55, "officetel")).toBe("officetel_45_60");
    expect(getAreaBucket(70, "officetel")).toBe("officetel_over_60");
  });

  test("classifies floor bands with and without total floors", () => {
    expect(getFloorBand(3)).toBe("low");
    expect(getFloorBand(10)).toBe("mid");
    expect(getFloorBand(20)).toBe("high");
    expect(getFloorBand(4, 20)).toBe("low");
    expect(getFloorBand(10, 20)).toBe("mid");
    expect(getFloorBand(18, 20)).toBe("high");
  });

  test("time weighted price emphasizes newer valid transactions and filters invalid values", () => {
    const latest = new Date("2026-05-01");
    const result = calculateTimeWeightedPrice([
      { price: 0, dealDate: latest },
      { price: -10, dealDate: latest },
      { price: 500_000_000, dealDate: new Date("2025-01-01") },
      { price: 700_000_000, dealDate: new Date("2026-04-01") },
      { price: 710_000_000, dealDate: latest }
    ]);
    expect(result.count).toBe(3);
    expect(result.price).toBeGreaterThan(630_000_000);
  });

  test("uses median fallback for fewer than three transactions", () => {
    const result = calculateTimeWeightedPrice([
      { price: 500_000_000, dealDate: new Date("2026-01-01") },
      { price: 700_000_000, dealDate: new Date("2026-02-01") }
    ]);
    expect(result.method).toBe("median");
    expect(result.price).toBe(600_000_000);
  });

  test("calculates heat, drawdown, jeonse ratio and inventory likelihood", () => {
    const metrics = calculateSignalMetrics({
      referencePrice: 640_000_000,
      recentJeonseMedian: 410_000_000,
      previousHighPrice: 780_000_000,
      volume30d: 8,
      volume90d: 18,
      previous90dVolume: 6,
      transactionCount12m: 48,
      recentRentCount12m: 24
    });
    expect(metrics.transactionHeat).toBe(2);
    expect(metrics.reaccelerationScore).toBe(3);
    expect(metrics.drawdownFromHigh).toBeLessThan(-17);
    expect(metrics.jeonseRatio).toBeGreaterThan(64);
    expect(metrics.inventoryLikelihoodScore).toBeGreaterThan(40);
  });
});
