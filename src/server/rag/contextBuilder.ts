import type { ComplexSignalCandidate, CurrentHome, UserFinancialPlan, UserProfile } from "@/types";
import { sampleHomes, sampleProfiles } from "@/data/dummy";
import { calculateMoveUpBudget, calculateNetCashAfterSellingHome, calculatePurchasePower } from "@/lib/calculations";
import { calculateFuturePurchasePower } from "@/lib/futurePlan";
import { formatKRW, formatMonthly } from "@/lib/format";
import { embedText } from "./embedding";
import { getDefaultVectorStore } from "./turboVector/store";
import type { RagSourceType, SearchResult } from "./turboVector/types";

export type HomePathChatIntent =
  | "candidate_reason"
  | "purchase_power"
  | "comparison"
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

export type SourceRequirement = {
  sourceType: RagSourceType;
  minimum: number;
  take: number;
  hints: string[];
};

export type RetrievalPlan = {
  resultLimit: number;
  sourceMinimums: SourceRequirement[];
};

export async function buildHomePathRagContext(input: HomePathChatInput) {
  const profile = input.profile ?? sampleProfiles[0];
  const currentHome = input.currentHome ?? sampleHomes[0];
  const financialPlan = input.financialPlan ?? defaultFinancialPlan(profile);
  const intent = classifyIntent(input.message);
  const calculations = buildCalculationSummary({ profile, currentHome, financialPlan, activeCandidate: input.activeCandidate });
  const retrievalPlan = getIntentRetrievalPlan(intent);

  if (input.useRag === false) {
    return {
      intent,
      calculations,
      retrievalPlan,
      retrieved: [],
      contextText: buildContextText([], input.activeCandidate, intent)
    };
  }

  const query = buildRagQuery({ input, intent, profile, currentHome, financialPlan });
  const queryEmbedding = await embedText(query);
  const store = getDefaultVectorStore();
  const sourceSearches = await Promise.all(
    retrievalPlan.sourceMinimums.map(async (requirement) => {
      const sourceQuery = `${query} ${requirement.hints.join(" ")}`;
      const sourceEmbedding = await embedText(sourceQuery);
      return store.search({
        queryEmbedding: sourceEmbedding,
        topK: Math.max(requirement.minimum + 2, requirement.take),
        filters: { sourceType: requirement.sourceType }
      });
    })
  );
  const rawResults = [
    ...(await store.search({ queryEmbedding, topK: 20 })),
    ...sourceSearches.flat()
  ];
  const rankedResults = rankHomePathRagResults(rawResults, input.activeCandidate, intent);
  const results = selectPlannedResults(rankedResults, retrievalPlan);

  return {
    intent,
    calculations,
    retrievalPlan,
    retrieved: results,
    contextText: buildContextText(results, input.activeCandidate, intent)
  };
}

export function classifyIntent(message: string): HomePathChatIntent {
  const text = message.toLowerCase();
  if (/같은\s*예산|비교|대비|어디가\s*더|둘\s*중|vs|versus/.test(text)) return "comparison";
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

function buildContextText(results: SearchResult[], activeCandidate?: ComplexSignalCandidate | null, intent?: HomePathChatIntent) {
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
  const summaryText = results.length
    ? [
        `[RAG 검색 요약] intent=${intent ?? "general"}, sourceCount=${results.length}`,
        `sourceTypes: ${summarizeSourceTypes(results)}`
      ].join("\n")
    : "";
  const ragText = results
    .map((result, index) => {
      const metadata = summarizeMetadata(result);
      return [
        `[${sourceTypeLabel(result.sourceType)} ${index + 1}] ${result.title ?? result.id}`,
        `score=${result.score.toFixed(4)}, finalScore=${(result.finalScore ?? result.score).toFixed(4)}${
          result.boostReason?.length ? `, boost=${result.boostReason.join("|")}` : ""
        }${metadata ? `, ${metadata}` : ""}`,
        limitContextChunk(result.text)
      ].join("\n");
    })
    .join("\n\n");
  return [candidateText, summaryText, ragText].filter(Boolean).join("\n\n");
}

const INTENT_SOURCE_BOOST: Record<HomePathChatIntent, Partial<Record<RagSourceType, number>>> = {
  candidate_reason: {
    complex_signal: 0.2,
    model_artifact: 0.16,
    faq: 0.08,
    safety_policy: 0.04,
    doc: -0.04
  },
  purchase_power: {
    complex_signal: 0.1,
    faq: 0.1,
    doc: 0.04,
    safety_policy: 0.04
  },
  comparison: {
    complex_signal: 0.18,
    model_artifact: 0.14,
    faq: 0.08,
    safety_policy: 0.06,
    doc: 0.02
  },
  risk_check: {
    complex_signal: 0.14,
    model_artifact: 0.12,
    safety_policy: 0.12,
    faq: 0.06
  },
  data_source: {
    faq: 0.16,
    doc: 0.1,
    model_artifact: 0.04,
    safety_policy: 0.04
  },
  safety: {
    safety_policy: 0.32,
    faq: 0.08,
    doc: 0.02
  },
  general: {
    complex_signal: 0.08,
    faq: 0.06,
    model_artifact: 0.04,
    safety_policy: 0.04
  }
};

export function rankHomePathRagResults(
  results: SearchResult[],
  activeCandidate: ComplexSignalCandidate | null | undefined,
  intent: HomePathChatIntent
) {
  return results
    .map((result) => {
      const sourceTypeBoost = INTENT_SOURCE_BOOST[intent][result.sourceType] ?? 0;
      const candidateBoost = candidateMetadataBoost(result, activeCandidate);
      const boostReason = [
        sourceTypeBoost ? `intent:${intent}:${result.sourceType}+${sourceTypeBoost.toFixed(2)}` : undefined,
        ...candidateBoost.reasons
      ].filter(Boolean) as string[];
      return {
        ...result,
        finalScore: result.score + sourceTypeBoost + candidateBoost.value,
        boostReason
      };
    })
    .sort((a, b) => (b.finalScore ?? b.score) - (a.finalScore ?? a.score));
}

function candidateMetadataBoost(result: SearchResult, activeCandidate?: ComplexSignalCandidate | null) {
  if (!activeCandidate) return { value: 0, reasons: [] as string[] };
  let value = 0;
  const reasons: string[] = [];
  const haystack = [
    result.title,
    result.text,
    result.metadata.complexName,
    result.metadata.region,
    result.metadata.areaBucket,
    result.metadata.lawdCode5
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const complexName = activeCandidate.complexName.toLowerCase();
  if (complexName && haystack.includes(complexName)) {
    value += 0.24;
    reasons.push("activeCandidate:complexName+0.24");
  }
  if (activeCandidate.lawdCode5 && haystack.includes(activeCandidate.lawdCode5.toLowerCase())) {
    value += 0.1;
    reasons.push("activeCandidate:lawdCode5+0.10");
  }
  if (activeCandidate.region && haystack.includes(activeCandidate.region.toLowerCase())) {
    value += 0.08;
    reasons.push("activeCandidate:region+0.08");
  }
  if (activeCandidate.areaBucket && haystack.includes(activeCandidate.areaBucket.toLowerCase())) {
    value += 0.06;
    reasons.push("activeCandidate:areaBucket+0.06");
  }
  return { value, reasons };
}

export function getIntentRetrievalPlan(intent: HomePathChatIntent): RetrievalPlan {
  const commonSafety: SourceRequirement = {
    sourceType: "safety_policy",
    minimum: 1,
    take: 2,
    hints: ["안전 정책", "매수 추천 금지", "수익 보장 금지", "대출 승인 보장 금지"]
  };
  const faq: SourceRequirement = {
    sourceType: "faq",
    minimum: 1,
    take: 3,
    hints: ["FAQ", "설명 기준", "사용자 질문 답변"]
  };
  if (intent === "candidate_reason") {
    return {
      resultLimit: 8,
      sourceMinimums: [
        { sourceType: "complex_signal", minimum: 2, take: 5, hints: ["후보 실거래", "거래 집중도", "전세가율", "전고점 대비"] },
        { sourceType: "model_artifact", minimum: 2, take: 5, hints: ["Transformer AI 신호", "회복 확률", "거래 재활성화", "하락 리스크"] },
        faq,
        commonSafety
      ]
    };
  }
  if (intent === "purchase_power") {
    return {
      resultLimit: 8,
      sourceMinimums: [
        { sourceType: "faq", minimum: 2, take: 4, hints: ["구매력", "월소득", "월저축", "예산", "DSR", "LTV"] },
        { sourceType: "complex_signal", minimum: 2, take: 4, hints: ["기준가", "내 예산", "현재 집 정리 후 예산"] },
        { sourceType: "doc", minimum: 1, take: 3, hints: ["구매력 계산", "미래 구매력", "갈아타기"] },
        commonSafety
      ]
    };
  }
  if (intent === "comparison") {
    return {
      resultLimit: 9,
      sourceMinimums: [
        { sourceType: "complex_signal", minimum: 3, take: 6, hints: ["같은 예산 비교", "안정성", "거래량", "전세가율", "가격 낙폭"] },
        { sourceType: "model_artifact", minimum: 2, take: 5, hints: ["AI 후보점수 비교", "회복 확률", "하락 리스크"] },
        faq,
        commonSafety
      ]
    };
  }
  if (intent === "risk_check" || intent === "safety") {
    return {
      resultLimit: 8,
      sourceMinimums: [
        { sourceType: "safety_policy", minimum: 1, take: 2, hints: ["매수 추천 아님", "위험", "의사결정 보조"] },
        { sourceType: "complex_signal", minimum: 2, take: 4, hints: ["하락 리스크", "전세가율", "거래 부재", "공급", "공실"] },
        { sourceType: "model_artifact", minimum: 1, take: 4, hints: ["하락 리스크 확률", "Transformer", "백테스트"] },
        faq
      ]
    };
  }
  if (intent === "data_source") {
    return {
      resultLimit: 8,
      sourceMinimums: [
        { sourceType: "faq", minimum: 2, take: 4, hints: ["데이터 출처", "공공 실거래", "법정동 코드", "건축물대장"] },
        { sourceType: "doc", minimum: 2, take: 4, hints: ["README", "제출 문서", "공공데이터 활용"] },
        { sourceType: "model_artifact", minimum: 1, take: 3, hints: ["Transformer artifact", "feature manifest", "metrics"] },
        commonSafety
      ]
    };
  }
  return {
    resultLimit: 7,
    sourceMinimums: [
      { sourceType: "complex_signal", minimum: 2, take: 4, hints: ["후보", "기준가", "거래", "전세가율"] },
      { sourceType: "faq", minimum: 1, take: 3, hints: ["FAQ", "홈패스 설명"] },
      { sourceType: "model_artifact", minimum: 1, take: 3, hints: ["Transformer AI 신호"] },
      commonSafety
    ]
  };
}

function selectPlannedResults(results: SearchResult[], plan: RetrievalPlan) {
  const deduped = dedupeResults(results);
  const diverse = dedupeSemanticResults(deduped);
  const selected: SearchResult[] = [];
  for (const requirement of plan.sourceMinimums) {
    selected.push(...diverse.filter((result) => result.sourceType === requirement.sourceType).slice(0, requirement.minimum));
  }
  selected.push(...diverse, ...deduped);
  return dedupeResults(selected).slice(0, plan.resultLimit);
}

function dedupeResults(results: SearchResult[]) {
  const seen = new Set<string>();
  return results.filter((result) => {
    if (seen.has(result.id)) return false;
    seen.add(result.id);
    return true;
  });
}

function dedupeSemanticResults(results: SearchResult[]) {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = [
      result.sourceType,
      result.sourceId ?? result.title ?? result.id,
      result.metadata.areaBucket ?? ""
    ].join(":");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sourceTypeLabel(sourceType: RagSourceType) {
  if (sourceType === "complex_signal") return "후보 실거래 지표";
  if (sourceType === "model_artifact") return "Transformer AI 신호";
  if (sourceType === "faq") return "FAQ 근거";
  if (sourceType === "safety_policy") return "안전 정책";
  return "문서 근거";
}

function buildRagQuery(input: {
  input: HomePathChatInput;
  intent: HomePathChatIntent;
  profile: UserProfile;
  currentHome: CurrentHome;
  financialPlan: UserFinancialPlan;
}) {
  const activeCandidate = input.input.activeCandidate;
  const intentKeywords: Record<HomePathChatIntent, string[]> = {
    candidate_reason: ["후보 이유", "거래 집중도", "전세가율", "AI 후보점수", "회복 확률", "하락 리스크"],
    purchase_power: ["구매력", "월소득", "월저축", "현재 집 정리 후 예산", "미래 구매력", "DSR", "LTV"],
    comparison: ["같은 예산 비교", "안정성", "거래 회복", "가격 낙폭", "전세가율", "현금흐름"],
    risk_check: ["리스크", "안전", "하락", "대출 부담", "실거래 부재", "전세가율"],
    data_source: ["데이터 출처", "공공 실거래", "법정동 코드", "건축물대장", "Transformer artifact"],
    safety: ["매수 추천 아님", "수익 보장 금지", "대출 승인 보장 금지", "의사결정 보조"],
    general: ["홈패스", "공공데이터", "구매력", "후보", "리스크"]
  };
  return [
    input.input.message,
    input.intent,
    ...intentKeywords[input.intent],
    activeCandidate?.complexName,
    activeCandidate?.region,
    activeCandidate?.areaBucket,
    input.profile.preferredRegions.join(" "),
    input.currentHome.region,
    input.financialPlan.targetRegion,
    `targetPrice:${input.financialPlan.targetHomePrice}`,
    `monthlyIncome:${input.profile.monthlyIncome}`,
    `monthlySavings:${input.profile.monthlySavings}`
  ]
    .filter(Boolean)
    .join(" ");
}

function summarizeSourceTypes(results: SearchResult[]) {
  const counts = results.reduce<Record<string, number>>((acc, result) => {
    acc[result.sourceType] = (acc[result.sourceType] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts)
    .map(([sourceType, count]) => `${sourceType}:${count}`)
    .join(", ");
}

function summarizeMetadata(result: SearchResult) {
  const metadata = [
    result.sourceId ? `sourceId=${result.sourceId}` : undefined,
    result.metadata.intent ? `intent=${result.metadata.intent}` : undefined,
    result.metadata.region ? `region=${result.metadata.region}` : undefined,
    result.metadata.complexName ? `complex=${result.metadata.complexName}` : undefined,
    result.metadata.areaBucket ? `area=${result.metadata.areaBucket}` : undefined,
    result.metadata.aiScore ? `aiScore=${result.metadata.aiScore}` : undefined
  ].filter(Boolean);
  return metadata.join(", ");
}

function limitContextChunk(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 850 ? `${compact.slice(0, 847)}...` : compact;
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
