import type { ComplexSignalCandidate, CurrentHome, UserFinancialPlan, UserProfile } from "@/types";
import { sampleHomes, sampleProfiles } from "@/data/dummy";
import { calculateMoveUpBudget, calculateNetCashAfterSellingHome, calculatePurchasePower } from "@/lib/calculations";
import { calculateFuturePurchasePower } from "@/lib/futurePlan";
import { formatKRW, formatMonthly } from "@/lib/format";
import { embedText } from "./embedding";
import { getDefaultVectorStore } from "./turboVector/store";
import type { SearchResult } from "./turboVector/types";

export type HomePathChatIntent =
  | "candidate_reason"
  | "purchase_power"
  | "risk_check"
  | "data_source"
  | "safety"
  | "general";

export type HomePathChatInput = {
  message: string;
  profile?: UserProfile;
  currentHome?: CurrentHome;
  financialPlan?: UserFinancialPlan;
  activeCandidate?: ComplexSignalCandidate | null;
  useRag?: boolean;
};

export async function buildHomePathRagContext(input: HomePathChatInput) {
  const profile = input.profile ?? sampleProfiles[0];
  const currentHome = input.currentHome ?? sampleHomes[0];
  const financialPlan = input.financialPlan ?? defaultFinancialPlan(profile);
  const intent = classifyIntent(input.message);
  const calculations = buildCalculationSummary({ profile, currentHome, financialPlan, activeCandidate: input.activeCandidate });
  if (input.useRag === false) {
    return {
      intent,
      calculations,
      retrieved: [],
      contextText: buildContextText([], input.activeCandidate)
    };
  }
  const query = [
    input.message,
    input.activeCandidate?.complexName,
    input.activeCandidate?.region,
    input.activeCandidate?.areaBucket,
    intent
  ]
    .filter(Boolean)
    .join(" ");
  const queryEmbedding = await embedText(query);
  const results = await getDefaultVectorStore().search({ queryEmbedding, topK: 4 });

  return {
    intent,
    calculations,
    retrieved: results,
    contextText: buildContextText(results, input.activeCandidate)
  };
}

export function classifyIntent(message: string): HomePathChatIntent {
  const text = message.toLowerCase();
  if (/왜|이유|후보|떴/.test(text)) return "candidate_reason";
  if (/가능|구매력|월급|예산|어디까지/.test(text)) return "purchase_power";
  if (/위험|리스크|안전|dsr|ltv|하락/.test(text)) return "risk_check";
  if (/출처|데이터|근거|공공/.test(text)) return "data_source";
  if (/추천|매수|사도|수익/.test(text)) return "safety";
  return "general";
}

function buildCalculationSummary(input: {
  profile: UserProfile;
  currentHome: CurrentHome;
  financialPlan: UserFinancialPlan;
  activeCandidate?: ComplexSignalCandidate | null;
}) {
  const purchasePowerNow = calculatePurchasePower(input.profile, {
    currentHome: input.currentHome,
    propertyPrice: input.activeCandidate?.referencePrice ?? input.financialPlan.targetHomePrice,
    region: input.activeCandidate?.region ?? input.financialPlan.targetRegion,
    homeCount: input.currentHome ? 1 : 0
  });
  const moveUpBudget = calculateMoveUpBudget(input.profile, input.currentHome);
  const fiveYearPower = calculateFuturePurchasePower(input.profile, input.currentHome, input.financialPlan, 5);
  const netCashAfterSale = calculateNetCashAfterSellingHome(input.currentHome);
  const targetPrice = input.activeCandidate?.referencePrice ?? input.financialPlan.targetHomePrice;
  return {
    purchasePowerNow,
    moveUpBudget,
    fiveYearPower,
    netCashAfterSale,
    targetPrice,
    summary:
      `현재 구매력 ${formatKRW(purchasePowerNow)}, 현재 집 정리 후 예산 ${formatKRW(moveUpBudget)}, ` +
      `5년 뒤 추정 구매력 ${formatKRW(fiveYearPower)}, 현재 집 정리 후 순현금 ${formatKRW(netCashAfterSale)}, ` +
      `월소득 ${formatMonthly(input.profile.monthlyIncome)}, 월저축 ${formatMonthly(input.profile.monthlySavings)}.`
  };
}

function buildContextText(results: SearchResult[], activeCandidate?: ComplexSignalCandidate | null) {
  const candidateText = activeCandidate
    ? [
        `[현재 후보] ${activeCandidate.region} ${activeCandidate.complexName} ${activeCandidate.areaBucket}`,
        `기준가: ${activeCandidate.referencePrice ? formatKRW(activeCandidate.referencePrice) : "데이터 부족"}`,
        `거래 집중도: ${activeCandidate.transactionHeat.toFixed(2)}배`,
        `전고점 대비: ${activeCandidate.drawdownFromHigh?.toFixed(1) ?? "미상"}%`,
        `전세가율: ${activeCandidate.jeonseRatio?.toFixed(1) ?? "미상"}%`,
        `주의: ${activeCandidate.disclaimer}`
      ].join("\n")
    : "";
  const ragText = results
    .map((result, index) => `[근거 ${index + 1}] ${result.title ?? result.id}\n${result.text}`)
    .join("\n\n");
  return [candidateText, ragText].filter(Boolean).join("\n\n");
}

function defaultFinancialPlan(profile: UserProfile): UserFinancialPlan {
  return {
    annualIncomeGrowthRate: 0.03,
    monthlySavingsGrowthRate: 0.02,
    expectedBonusPerYear: 0,
    maxComfortableMonthlyPayment: 1_500_000,
    parentalSupport: 0,
    targetHomePrice: 650_000_000,
    targetRegion: profile.preferredRegions[0] ?? "대구 수성구",
    targetHorizonYears: 5,
    targetMonthlyCashFlow: profile.targetMonthlyCashFlow
  };
}
