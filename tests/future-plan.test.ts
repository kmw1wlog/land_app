import { describe, expect, it } from "vitest";
import { properties, sampleHomes, sampleProfiles } from "@/data/dummy";
import {
  calculateFutureCash,
  calculateFutureIncome,
  calculateFuturePurchasePower,
  calculateRequiredMonthlySavings,
  calculateTargetHomePath,
  recommendGoalPathCandidates
} from "@/lib/futurePlan";
import type { UserFinancialPlan } from "@/types";

const plan: UserFinancialPlan = {
  annualIncomeGrowthRate: 0.03,
  monthlySavingsGrowthRate: 0.02,
  expectedBonusPerYear: 2_000_000,
  maxComfortableMonthlyPayment: 1_500_000,
  parentalSupport: 0,
  targetHomePrice: 650_000_000,
  targetRegion: "대구 수성구",
  targetHorizonYears: 5,
  targetMonthlyCashFlow: 3_000_000
};

describe("future purchase power", () => {
  it("projects future cash and income", () => {
    expect(calculateFutureCash({ cashOnHand: 10_000_000, monthlySavings: 1_000_000, savingsGrowthRate: 0.02, expectedBonusPerYear: 0, years: 3 })).toBeGreaterThan(46_000_000);
    expect(calculateFutureIncome({ monthlyIncome: 4_000_000, incomeGrowthRate: 0.03, years: 5 })).toBeGreaterThan(4_600_000);
  });

  it("calculates future purchase power and target path", () => {
    const power = calculateFuturePurchasePower(sampleProfiles[0], sampleHomes[0], plan, 5);
    const path = calculateTargetHomePath(sampleProfiles[0], sampleHomes[0], plan, properties[0]);

    expect(power).toBeGreaterThan(sampleProfiles[0].cashOnHand);
    expect(path.targetPrice).toBe(properties[0].salePrice);
    expect(path.explanation.length).toBeGreaterThan(0);
  });

  it("recommends goal-path candidates and reverse-calculates savings", () => {
    const required = calculateRequiredMonthlySavings(120_000_000, 5, 2_000_000);
    const candidates = recommendGoalPathCandidates(sampleProfiles[0], sampleHomes[0], plan, properties, 3);

    expect(required).toBeGreaterThan(0);
    expect(candidates).toHaveLength(3);
    expect(candidates[0].path.targetName).toBeTruthy();
  });
});
