import type { CurrentHome, Property, RiskPreference, TargetPathResult, UserFinancialPlan, UserProfile } from "@/types";
import {
  calculateMoveUpBudget,
  calculateNetCashAfterSellingHome,
  calculatePurchasePower,
  estimateLoanCapacity
} from "./calculations";
import { calculateMortgageAffordability, principalFromMonthlyPayment } from "./loanRules";

export function calculateFutureCash(params: {
  cashOnHand: number;
  monthlySavings: number;
  savingsGrowthRate: number;
  expectedBonusPerYear: number;
  years: number;
}): number {
  let cash = params.cashOnHand;
  let monthlySavings = params.monthlySavings;
  for (let year = 0; year < params.years; year += 1) {
    cash += monthlySavings * 12 + params.expectedBonusPerYear;
    monthlySavings *= 1 + params.savingsGrowthRate;
  }
  return Math.round(cash);
}

export function calculateFutureIncome(params: {
  monthlyIncome: number;
  incomeGrowthRate: number;
  years: number;
}): number {
  return Math.round(params.monthlyIncome * Math.pow(1 + params.incomeGrowthRate, params.years));
}

export function calculateFutureLoanCapacity(params: {
  futureMonthlyIncome: number;
  riskPreference: RiskPreference;
  maxComfortableMonthlyPayment: number;
  propertyPrice?: number;
  region?: string;
  cashOnHand?: number;
}): number {
  const dsrBased = calculateMortgageAffordability({
    propertyPrice: params.propertyPrice ?? 650_000_000,
    region: params.region ?? "대구 수성구",
    monthlyIncome: params.futureMonthlyIncome,
    cashOnHand: params.cashOnHand ?? 0,
    riskPreference: params.riskPreference,
    homeCount: 0,
    mortgageRate: 0.045
  });
  const comfortBased =
    params.maxComfortableMonthlyPayment > 0
      ? principalFromMonthlyPayment(params.maxComfortableMonthlyPayment, dsrBased.stressedAnnualRate, 30)
      : dsrBased.maxLoan;

  return Math.round(Math.min(dsrBased.maxLoan, comfortBased));
}

export function calculateFuturePurchasePower(
  profile: UserProfile,
  currentHome: CurrentHome,
  plan: UserFinancialPlan,
  years: number
): number {
  const futureCash =
    calculateFutureCash({
      cashOnHand: profile.cashOnHand,
      monthlySavings: profile.monthlySavings,
      savingsGrowthRate: plan.monthlySavingsGrowthRate,
      expectedBonusPerYear: plan.expectedBonusPerYear,
      years
    }) + plan.parentalSupport;
  const futureIncome = calculateFutureIncome({
    monthlyIncome: profile.monthlyIncome,
    incomeGrowthRate: plan.annualIncomeGrowthRate,
    years
  });
  const loanCapacity = calculateFutureLoanCapacity({
    futureMonthlyIncome: futureIncome,
    riskPreference: profile.riskPreference,
    maxComfortableMonthlyPayment: plan.maxComfortableMonthlyPayment,
    propertyPrice: plan.targetHomePrice,
    region: plan.targetRegion,
    cashOnHand: futureCash
  });
  return futureCash + loanCapacity + Math.max(0, calculateNetCashAfterSellingHome(currentHome));
}

export function calculateYearsToReach(shortage: number, profile: UserProfile, plan: UserFinancialPlan) {
  if (shortage <= 0) return 0;
  for (let year = 1; year <= 20; year += 1) {
    const futureCash = calculateFutureCash({
      cashOnHand: profile.cashOnHand,
      monthlySavings: profile.monthlySavings,
      savingsGrowthRate: plan.monthlySavingsGrowthRate,
      expectedBonusPerYear: plan.expectedBonusPerYear,
      years: year
    });
    if (futureCash >= shortage) return year;
  }
  return null;
}

export function calculateTargetHomePath(
  profile: UserProfile,
  currentHome: CurrentHome,
  plan: UserFinancialPlan,
  targetProperty?: Property
): TargetPathResult {
  const targetPrice = targetProperty?.salePrice ?? plan.targetHomePrice;
  const targetName = targetProperty?.name ?? `${plan.targetRegion || "목표 지역"} 목표 집`;
  const nowPower = calculatePurchasePower(profile, {
    propertyPrice: targetPrice,
    region: targetProperty?.region ?? plan.targetRegion,
    currentHome,
    homeCount: 1
  });
  const salePower = calculateMoveUpBudget(profile, currentHome, targetProperty) + plan.parentalSupport;
  const jeonseLiquidity = Math.max(currentHome.deposit, currentHome.estimatedCurrentPrice * 0.62 - currentHome.loanBalance);
  const jeonseCash = profile.cashOnHand + Math.max(0, jeonseLiquidity) + plan.parentalSupport;
  const jeonsePower =
    jeonseCash +
    estimateLoanCapacity(profile, {
      propertyPrice: targetPrice,
      region: targetProperty?.region ?? plan.targetRegion,
      cashOnHand: jeonseCash,
      homeCount: 1
    });
  const shortageNow = Math.max(0, targetPrice - nowPower);
  const yearsToReachBySavingOnly = calculateYearsToReach(shortageNow, profile, plan);
  const yearsToReachWithHomeSale = salePower >= targetPrice ? 0 : calculateYearsToReach(targetPrice - salePower, profile, plan);
  const yearsToReachWithJeonseStrategy = jeonsePower >= targetPrice ? 0 : calculateYearsToReach(targetPrice - jeonsePower, profile, plan);
  const purchaseFinancing = calculateMortgageAffordability({
    propertyPrice: targetPrice,
    region: targetProperty?.region ?? plan.targetRegion,
    monthlyIncome: profile.monthlyIncome,
    cashOnHand: profile.cashOnHand + plan.parentalSupport,
    riskPreference: profile.riskPreference,
    homeCount: currentHome ? 1 : 0,
    mortgageRate: 0.045
  });
  const monthlyPaymentAtPurchase = purchaseFinancing.monthlyPayment;

  let recommendedPath: TargetPathResult["recommendedPath"] = "not_feasible";
  if (nowPower >= targetPrice) recommendedPath = "additional_purchase";
  else if (salePower >= targetPrice) recommendedPath = "sell_current_home";
  else if (jeonsePower >= targetPrice) recommendedPath = "convert_to_jeonse";
  else if (yearsToReachBySavingOnly !== null && yearsToReachBySavingOnly <= plan.targetHorizonYears) recommendedPath = "save_more";
  else if (currentHome.monthlyRent > 0 || currentHome.estimatedCurrentPrice > 0) recommendedPath = "convert_to_monthly_rent";

  return {
    targetPropertyId: targetProperty?.id,
    targetName,
    targetPrice,
    possibleNow: nowPower >= targetPrice,
    possibleAfterSellingCurrentHome: salePower >= targetPrice,
    yearsToReachBySavingOnly,
    yearsToReachWithHomeSale,
    yearsToReachWithJeonseStrategy,
    monthlyPaymentAtPurchase,
    shortageNow,
    recommendedPath,
    explanation: [
      `현재 구매능력은 ${Math.round(nowPower / 10000).toLocaleString("ko-KR")}만 원 수준입니다.`,
      `현재 집 매도 루트는 ${Math.round(salePower / 10000).toLocaleString("ko-KR")}만 원까지 열립니다.`,
      `목표 시점 ${plan.targetHorizonYears}년 안 도달 가능성을 기준으로 경로를 비교했습니다.`,
      `DSR/LTV 반영 월 부담은 약 ${Math.round(monthlyPaymentAtPurchase / 10000).toLocaleString("ko-KR")}만 원입니다.`
    ]
  };
}

export function calculateRequiredMonthlySavings(targetShortage: number, years: number, expectedBonusPerYear = 0): number {
  if (targetShortage <= 0) return 0;
  const months = Math.max(1, years * 12);
  return Math.max(0, Math.ceil((targetShortage - expectedBonusPerYear * years) / months));
}

export function recommendGoalPathCandidates(
  profile: UserProfile,
  currentHome: CurrentHome,
  plan: UserFinancialPlan,
  candidates: Property[],
  limit = 3
) {
  return [...candidates]
    .map((property) => {
      const path = calculateTargetHomePath(profile, currentHome, plan, property);
      const requiredMonthlySavings = calculateRequiredMonthlySavings(
        path.shortageNow,
        Math.max(1, plan.targetHorizonYears),
        plan.expectedBonusPerYear
      );
      const years = [
        path.yearsToReachBySavingOnly,
        path.yearsToReachWithHomeSale,
        path.yearsToReachWithJeonseStrategy
      ].filter((value): value is number => value !== null);
      return {
        property,
        path,
        requiredMonthlySavings,
        fastestYears: years.length ? Math.min(...years) : 99,
        portfolioImpactMonths: Math.max(0, (path.yearsToReachBySavingOnly ?? 20) * 12 - Math.max(0, property.expectedMonthlyRent / 100000))
      };
    })
    .sort((a, b) => a.fastestYears - b.fastestYears || a.requiredMonthlySavings - b.requiredMonthlySavings)
    .slice(0, limit);
}
