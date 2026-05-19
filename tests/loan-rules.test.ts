import { describe, expect, it } from "vitest";
import { calculateMortgageAffordability } from "@/lib/loanRules";

describe("realistic mortgage affordability rules", () => {
  it("caps bank DSR around 40% using stressed payment", () => {
    const result = calculateMortgageAffordability({
      propertyPrice: 900_000_000,
      region: "서울 성동구",
      monthlyIncome: 5_000_000,
      cashOnHand: 250_000_000,
      mortgageRate: 0.045
    });

    expect(result.maxLoan).toBeGreaterThan(0);
    expect(result.dsrRatio).toBeLessThanOrEqual(40.1);
    expect(result.notes.join(" ")).toContain("DSR");
  });

  it("applies the capital-area absolute mortgage cap", () => {
    const result = calculateMortgageAffordability({
      propertyPrice: 1_800_000_000,
      region: "서울 강남구",
      monthlyIncome: 30_000_000,
      cashOnHand: 900_000_000,
      mortgageRate: 0.045
    });

    expect(result.maxLoan).toBeLessThanOrEqual(600_000_000);
    expect(result.ltvLimit).toBeLessThanOrEqual(600_000_000);
  });

  it("gives first-time buyers a higher non-capital LTV ceiling", () => {
    const firstTime = calculateMortgageAffordability({
      propertyPrice: 500_000_000,
      region: "대구 수성구",
      monthlyIncome: 10_000_000,
      cashOnHand: 150_000_000,
      isFirstTimeBuyer: true
    });
    const normal = calculateMortgageAffordability({
      propertyPrice: 500_000_000,
      region: "대구 수성구",
      monthlyIncome: 10_000_000,
      cashOnHand: 150_000_000
    });

    expect(firstTime.ltvRate).toBeGreaterThan(normal.ltvRate);
  });
});
