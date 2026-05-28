import type {
  CurrentHome,
  Property,
  PropertyAnalysis,
  ScenarioResult,
  ScenarioType,
  UserProfile
} from "@/types";
import { clamp } from "./format";
import { calculateMortgageAffordability, monthlyAmortizedPayment } from "./loanRules";
import { getMortgageHomeCount, hasOwnedCurrentHome, isFirstHomeBuyer } from "./userState";

const SIMPLE_TAX_RATE = 0.18;
const BROKER_FEE_RATE = 0.006;
const PURCHASE_COST_RATE = 0.038;
const MOVING_COST = 5_000_000;
const MONTHLY_INTEREST_FACTOR = 0.0046;
const MAINTENANCE_RESERVE_RATE = 0.08;
const TAX_RESERVE_RATE = 0.06;
const VACANCY_RATE = 0.08;
const DEFAULT_PRICE_FOR_CAPACITY = 600_000_000;
const DEFAULT_RATE = 0.045;

export function estimateLoanCapacity(
  userProfile: UserProfile,
  options: {
    propertyPrice?: number;
    region?: string;
    cashOnHand?: number;
    currentHome?: CurrentHome;
    homeCount?: number;
    isFirstTimeBuyer?: boolean;
  } = {}
): number {
  const ownedCurrentHome = hasOwnedCurrentHome(options.currentHome) ? options.currentHome : undefined;
  const annualExistingDebtService = ownedCurrentHome
    ? monthlyAmortizedPayment(
        ownedCurrentHome.loanBalance,
        (ownedCurrentHome.interestRate || DEFAULT_RATE * 100) / 100,
        30
      ) * 12
    : 0;
  const affordability = calculateMortgageAffordability({
    propertyPrice: options.propertyPrice ?? DEFAULT_PRICE_FOR_CAPACITY,
    region: options.region ?? userProfile.preferredRegions[0] ?? "대구 수성구",
    monthlyIncome: userProfile.monthlyIncome,
    cashOnHand: options.cashOnHand ?? userProfile.cashOnHand,
    annualExistingDebtService,
    riskPreference: userProfile.riskPreference,
    homeCount: options.homeCount ?? getMortgageHomeCount(userProfile, options.currentHome),
    isFirstTimeBuyer: options.isFirstTimeBuyer ?? isFirstHomeBuyer(userProfile, options.currentHome),
    mortgageRate: DEFAULT_RATE
  });

  return affordability.maxLoan;
}

export function calculatePurchasePower(
  userProfile: UserProfile,
  options: {
    propertyPrice?: number;
    region?: string;
    cashOnHand?: number;
    currentHome?: CurrentHome;
    homeCount?: number;
    isFirstTimeBuyer?: boolean;
  } = {}
): number {
  const cash = options.cashOnHand ?? userProfile.cashOnHand;
  return cash + estimateLoanCapacity(userProfile, { ...options, cashOnHand: cash });
}

export function calculateNetCashAfterSellingHome(currentHome: CurrentHome): number {
  const capitalGain = currentHome.estimatedCurrentPrice - currentHome.purchasePrice;
  // TODO: Replace with actual Korean capital gains tax logic by holding period,
  // residency, home count, region regulation, and deductions.
  const estimatedCapitalGainsTax = capitalGain > 0 ? capitalGain * SIMPLE_TAX_RATE : 0;
  const brokerFee = currentHome.estimatedCurrentPrice * BROKER_FEE_RATE;
  const sellingCosts = brokerFee + MOVING_COST + estimatedCapitalGainsTax;

  return currentHome.estimatedCurrentPrice - currentHome.loanBalance - sellingCosts;
}

export function calculateMoveUpBudget(
  userProfile: UserProfile,
  currentHome: CurrentHome,
  targetProperty?: Property
): number {
  const saleCash = hasOwnedCurrentHome(currentHome) ? Math.max(0, calculateNetCashAfterSellingHome(currentHome)) : 0;
  return (
    saleCash +
    estimateLoanCapacity(userProfile, {
      propertyPrice: targetProperty?.salePrice ?? Math.max(currentHome.estimatedCurrentPrice, DEFAULT_PRICE_FOR_CAPACITY),
      region: targetProperty?.region ?? currentHome.region,
      cashOnHand: userProfile.cashOnHand + saleCash,
      currentHome,
      homeCount: hasOwnedCurrentHome(currentHome) ? 0 : getMortgageHomeCount(userProfile, currentHome)
    })
  );
}

export function calculateMonthlyRentCashFlow(
  property: Pick<Property, "expectedMonthlyRent" | "salePrice" | "expectedDeposit" | "vacancyRiskScore">,
  userProfile: UserProfile
): number {
  const loanAmount = Math.max(0, property.salePrice - property.expectedDeposit - userProfile.cashOnHand);
  const monthlyLoanInterest = loanAmount * MONTHLY_INTEREST_FACTOR;
  const maintenanceReserve = property.expectedMonthlyRent * MAINTENANCE_RESERVE_RATE;
  const taxReserve = property.expectedMonthlyRent * TAX_RESERVE_RATE;
  const vacancyReserve =
    property.expectedMonthlyRent * (VACANCY_RATE + property.vacancyRiskScore / 1000);

  return property.expectedMonthlyRent - monthlyLoanInterest - maintenanceReserve - taxReserve - vacancyReserve;
}

export function calculateInvestmentAmount(property: Property): number {
  const purchaseCosts = property.salePrice * PURCHASE_COST_RATE;
  return property.salePrice - property.jeonsePrice + purchaseCosts;
}

export function calculateRecommendationScore(
  userProfile: UserProfile,
  property: Property
): number {
  const affordability = calculateMortgageAffordability({
    propertyPrice: property.salePrice,
    region: property.region,
    monthlyIncome: userProfile.monthlyIncome,
    cashOnHand: userProfile.cashOnHand,
    riskPreference: userProfile.riskPreference,
    homeCount: 0,
    isFirstTimeBuyer: userProfile.primaryGoal === "buy_home",
    mortgageRate: DEFAULT_RATE
  });
  const investmentAmount = calculateInvestmentAmount(property);
  const affordabilityScore = clamp(
    100 -
      Math.max(0, affordability.shortage) / 5_000_000 -
      Math.max(0, affordability.dsrRatio - 40) * 2 -
      Math.max(0, investmentAmount - (userProfile.cashOnHand + affordability.maxLoan)) / 10_000_000
  );
  const cashFlow = calculateMonthlyRentCashFlow(property, userProfile);
  const cashFlowScore = clamp(50 + cashFlow / 20_000);
  const undervaluationScore = clamp(Math.abs(property.drawdownFromHigh) * 3 + (property.jeonseRatio - 55));
  const riskPenalty = (property.supplyRiskScore + property.vacancyRiskScore) / 2;

  return Math.round(
    affordabilityScore * 0.25 +
      cashFlowScore * 0.2 +
      undervaluationScore * 0.2 +
      property.growthScore * 0.15 +
      property.stabilityScore * 0.1 +
      property.communityHeatScore * 0.05 -
      riskPenalty * 0.05
  );
}

export function analyzePropertyForUser(
  userProfile: UserProfile,
  currentHome: CurrentHome | undefined,
  property: Property
): PropertyAnalysis {
  const investmentAmount = calculateInvestmentAmount(property);
  const ownedCurrentHome = hasOwnedCurrentHome(currentHome) ? currentHome : undefined;
  const currentHomeIsOwned = Boolean(ownedCurrentHome);
  const annualExistingDebtService = ownedCurrentHome
    ? monthlyAmortizedPayment(
        ownedCurrentHome.loanBalance,
        (ownedCurrentHome.interestRate || DEFAULT_RATE * 100) / 100,
        30
      ) * 12
    : 0;
  const financing = calculateMortgageAffordability({
    propertyPrice: property.salePrice,
    region: property.region,
    monthlyIncome: userProfile.monthlyIncome,
    cashOnHand: userProfile.cashOnHand,
    annualExistingDebtService,
    riskPreference: userProfile.riskPreference,
    homeCount: getMortgageHomeCount(userProfile, currentHome),
    isFirstTimeBuyer: isFirstHomeBuyer(userProfile, currentHome),
    mortgageRate: DEFAULT_RATE
  });
  const saleCash = currentHomeIsOwned && currentHome ? Math.max(0, calculateNetCashAfterSellingHome(currentHome)) : 0;
  const afterSaleFinancing = calculateMortgageAffordability({
    propertyPrice: property.salePrice,
    region: property.region,
    monthlyIncome: userProfile.monthlyIncome,
    cashOnHand: userProfile.cashOnHand + saleCash,
    riskPreference: userProfile.riskPreference,
    homeCount: currentHomeIsOwned ? 0 : getMortgageHomeCount(userProfile, currentHome),
    isFirstTimeBuyer: isFirstHomeBuyer(userProfile, currentHome),
    mortgageRate: DEFAULT_RATE
  });
  const gapShortage = Math.max(0, investmentAmount - userProfile.cashOnHand);
  const shortage = Math.max(0, Math.min(financing.shortage, gapShortage));
  const monthsToReach =
    shortage <= 0 ? 0 : Math.ceil(shortage / Math.max(userProfile.monthlySavings, 1));
  const monthlyCashFlow = calculateMonthlyRentCashFlow(property, userProfile);

  return {
    investmentAmount,
    requiredCash: financing.requiredCash,
    shortage,
    isAffordableNow: financing.shortage <= 0,
    isAffordableAfterSale: afterSaleFinancing.shortage <= 0,
    monthsToReach,
    monthlyDebtPayment: financing.monthlyPayment,
    monthlyCashFlow,
    fiveYearNetWorthChange:
      property.salePrice * (property.growthScore / 100) * 0.65 +
      monthlyCashFlow * 60 -
      property.salePrice * ((property.supplyRiskScore + property.vacancyRiskScore) / 1000),
    recommendationScore: calculateRecommendationScore(userProfile, property),
    loanLimit: financing.maxLoan,
    dsrLimit: financing.dsrLimit,
    ltvLimit: financing.ltvLimit,
    ltvRate: financing.ltvRate,
    dsrRatio: financing.dsrRatio,
    regulationNotes: financing.notes,
    accuracy: {
      price: property.pnu ? "public_data_based" : "rough",
      tax: "rough",
      loan: "rough",
      listing: property.isDirectListing ? "direct_checked" : property.isPartnerListing ? "broker_declared" : "seed"
    }
  };
}

function scenarioRisk(type: ScenarioType, property?: Property): ScenarioResult["risk"] {
  if (type === "hold" || type === "convert_to_jeonse") return "중간";
  if (type === "additional_purchase" || type === "cash_flow_plan") return "높음";
  if (property && property.stabilityScore >= 72) return "낮음";
  return "중간";
}

export function calculateScenarioResults(
  userProfile: UserProfile,
  currentHome: CurrentHome,
  targetProperty?: Property
): ScenarioResult[] {
  const ownedHome = hasOwnedCurrentHome(currentHome);
  const saleCash = ownedHome ? calculateNetCashAfterSellingHome(currentHome) : 0;
  const loanCapacity = estimateLoanCapacity(userProfile, {
    currentHome,
    region: currentHome.region,
    propertyPrice: targetProperty?.salePrice ?? 600_000_000
  });
  const target = targetProperty;
  const targetAnalysis = target ? analyzePropertyForUser(userProfile, currentHome, target) : undefined;
  const baseNetWorth = (ownedHome ? currentHome.estimatedCurrentPrice - currentHome.loanBalance : currentHome.deposit) + userProfile.cashOnHand;

  const rows: Array<Omit<ScenarioResult, "risk" | "fitScore"> & { fitScoreSeed: number }> = [
    {
      label: ownedHome ? "계속 보유" : "현재 임차 유지",
      scenarioType: "hold",
      initialCashNeeded: 0,
      monthlyCashFlow: -currentHome.loanBalance * (currentHome.interestRate / 100 / 12),
      debtBurden: currentHome.loanBalance,
      afterTaxNetWorth: baseNetWorth,
      fiveYearExpectedReturn: currentHome.estimatedCurrentPrice * 0.08,
      fitScoreSeed: userProfile.primaryGoal === "buy_home" ? 62 : 72,
      notes: ownedHome ? ["가격 회복을 기다리는 선택지", "월 부담과 기회비용을 같이 본다"] : ["현재 주거비를 유지하며 현금과 저축 속도를 본다", "보유 주택 매도 현금은 없는 기준이다"]
    },
    {
      label: ownedHome ? "지금 매도" : "첫 구매 준비",
      scenarioType: "sell_now",
      initialCashNeeded: 0,
      monthlyCashFlow: userProfile.monthlySavings,
      debtBurden: 0,
      afterTaxNetWorth: saleCash + userProfile.cashOnHand,
      fiveYearExpectedReturn: saleCash * 0.035,
      fitScoreSeed: userProfile.primaryGoal === "buy_home" ? 82 : userProfile.primaryGoal === "move_up" ? 78 : 58,
      notes: ownedHome ? ["세후 확보 현금을 만든다", "실제 세금은 추후 정밀 계산 필요"] : ["목표가 대비 부족액과 월저축 속도를 먼저 본다", "첫 구매 대출 한도는 금융기관 확인이 필요하다"]
    },
    {
      label: "월세 전환",
      scenarioType: "convert_to_monthly_rent",
      initialCashNeeded: 8_000_000,
      monthlyCashFlow:
        currentHome.monthlyRent ||
        950_000 - currentHome.loanBalance * (currentHome.interestRate / 100 / 12) - 220_000,
      debtBurden: currentHome.loanBalance,
      afterTaxNetWorth: baseNetWorth + 12_000_000,
      fiveYearExpectedReturn: currentHome.estimatedCurrentPrice * 0.06,
      fitScoreSeed: userProfile.primaryGoal === "cash_flow" ? 82 : 65,
      notes: ["임대 현금흐름을 만든다", "공실 2개월 스트레스 테스트 필요"]
    },
    {
      label: "전세 전환",
      scenarioType: "convert_to_jeonse",
      initialCashNeeded: 5_000_000,
      monthlyCashFlow: -Math.max(0, currentHome.loanBalance - currentHome.deposit) * 0.0038,
      debtBurden: Math.max(0, currentHome.loanBalance - currentHome.deposit),
      afterTaxNetWorth: baseNetWorth + currentHome.deposit * 0.2,
      fiveYearExpectedReturn: currentHome.estimatedCurrentPrice * 0.05,
      fitScoreSeed: 67,
      notes: ["보증금으로 유동성을 확보한다", "역전세 리스크를 별도 확인한다"]
    },
    {
      label: ownedHome ? "갈아타기" : "첫 주택 구매",
      scenarioType: "move_up",
      initialCashNeeded: targetAnalysis?.shortage ?? Math.max(0, 600_000_000 - saleCash - loanCapacity),
      monthlyCashFlow: -(targetAnalysis?.monthlyDebtPayment ?? loanCapacity * MONTHLY_INTEREST_FACTOR),
      debtBurden: Math.max(0, (target?.salePrice ?? 600_000_000) - saleCash),
      afterTaxNetWorth: saleCash + (target?.salePrice ?? 600_000_000) * 0.25,
      fiveYearExpectedReturn: target
        ? target.salePrice * (target.growthScore / 100) * 0.75
        : 52_000_000,
      fitScoreSeed: userProfile.primaryGoal === "buy_home" ? 86 : userProfile.primaryGoal === "move_up" ? 86 : 72,
      notes: ownedHome ? ["상급지 또는 목적 개선을 노린다", "월 부담 증가액을 먼저 확인한다"] : ["첫 집 목표 가격과 월 부담을 먼저 맞춘다", "보증금 반환 시점과 잔금 일정을 따로 확인한다"]
    },
    {
      label: "추가 매수",
      scenarioType: "additional_purchase",
      initialCashNeeded: targetAnalysis?.investmentAmount ?? 180_000_000,
      monthlyCashFlow: targetAnalysis?.monthlyCashFlow ?? -420_000,
      debtBurden: Math.max(0, (target?.salePrice ?? 480_000_000) - userProfile.cashOnHand),
      afterTaxNetWorth: baseNetWorth + (target?.salePrice ?? 480_000_000) * 0.18,
      fiveYearExpectedReturn: targetAnalysis?.fiveYearNetWorthChange ?? 41_000_000,
      fitScoreSeed: userProfile.primaryGoal === "multi_home" ? 83 : 61,
      notes: ["생활권 확장 선택지", "대출과 세금 민감도가 높다"]
    }
  ];

  return rows.map((row) => ({
    ...row,
    risk: scenarioRisk(row.scenarioType, target),
    fitScore: clamp(row.fitScoreSeed + (target?.stabilityScore ?? 60) / 12 - (target?.supplyRiskScore ?? 45) / 18)
  }));
}
