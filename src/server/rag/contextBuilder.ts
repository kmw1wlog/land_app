import type { ComplexSignalCandidate, CurrentHome, UserFinancialPlan, UserProfile, VirtualPortfolioItem } from "@/types";
import { sampleHomes, sampleProfiles } from "@/data/dummy";
import { calculateMoveUpBudget, calculateNetCashAfterSellingHome, calculatePurchasePower } from "@/lib/calculations";
import { calculateFuturePurchasePower } from "@/lib/futurePlan";
import { formatKRW, formatMonthly } from "@/lib/format";
import { analyzeUserState, hasOwnedCurrentHome } from "@/lib/userState";
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
  portfolioItems?: VirtualPortfolioItem[];
  interestedHomes?: HomePathInterestHome[];
  useRag?: boolean;
};

export type HomePathInterestHome = {
  id?: string;
  propertyId?: string;
  complexSignalId?: string;
  sourceType?: string;
  complexName?: string;
  name?: string;
  region?: string;
  lawdCode5?: string | null;
  areaBucket?: string | null;
  floorBand?: string | null;
  propertyType?: string | null;
  referencePrice?: number | null;
  virtualPurchasePrice?: number | null;
  memo?: string | null;
  reason?: string | null;
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

type UserRagAnchor = {
  id: string;
  role: "active_candidate" | "portfolio_item" | "interested_home";
  label: string;
  complexName?: string;
  region?: string;
  lawdCode5?: string;
  areaBucket?: string;
  floorBand?: string;
  referencePrice?: number;
  memo?: string;
};

export async function buildHomePathRagContext(input: HomePathChatInput) {
  const profile = input.profile ?? sampleProfiles[0];
  const currentHome = input.currentHome ?? sampleHomes[0];
  const financialPlan = input.financialPlan ?? defaultFinancialPlan(profile);
  const intent = classifyIntent(input.message);
  const calculations = buildCalculationSummary({ profile, currentHome, financialPlan, activeCandidate: input.activeCandidate });
  const retrievalPlan = getIntentRetrievalPlan(intent);
  const anchors = buildUserRagAnchors(input);
  const mandatoryContext = buildMandatoryUserContextResults({
    profile,
    currentHome,
    financialPlan,
    activeCandidate: input.activeCandidate,
    calculations,
    anchors
  });

  if (input.useRag === false) {
    return {
      intent,
      profile,
      currentHome,
      financialPlan,
      calculations,
      retrievalPlan,
      retrieved: [],
      contextText: buildContextText(mandatoryContext, intent)
    };
  }

  const query = buildRagQuery({ input, intent, profile, currentHome, financialPlan, calculations, anchors });
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
  const anchorSearches = await Promise.all(
    buildAnchorQueries(anchors, profile, currentHome, financialPlan, calculations).map(async (anchorQuery) => {
      const anchorEmbedding = await embedText(anchorQuery);
      const [complexSignals, modelArtifacts, fusionSignals, krebSignals] = await Promise.all([
        store.search({ queryEmbedding: anchorEmbedding, topK: 8, filters: { sourceType: "complex_signal" } }),
        store.search({ queryEmbedding: anchorEmbedding, topK: 5, filters: { sourceType: "model_artifact" } }),
        store.search({ queryEmbedding: anchorEmbedding, topK: 3, filters: { sourceType: "fusion_data" } }),
        store.search({ queryEmbedding: anchorEmbedding, topK: 3, filters: { sourceType: "kreb_market_index" } })
      ]);
      return [...complexSignals, ...modelArtifacts, ...fusionSignals, ...krebSignals];
    })
  );
  const rawResults = [
    ...(await store.search({ queryEmbedding, topK: 20 })),
    ...sourceSearches.flat(),
    ...anchorSearches.flat()
  ];
  const rankedResults = rankHomePathRagResults(rawResults, input.activeCandidate, intent, { anchors, calculations });
  const vectorResults = selectPlannedResults(rankedResults, retrievalPlan);
  const results = [...mandatoryContext, ...vectorResults];

  return {
    intent,
    profile,
    currentHome,
    financialPlan,
    calculations,
    retrievalPlan,
    retrieved: results,
    contextText: buildContextText(results, intent)
  };
}

export function classifyIntent(message: string): HomePathChatIntent {
  const text = message.toLowerCase();
  if (/같은\s*예산|비교|대비|어디가\s*더|둘\s*중|vs|versus/.test(text)) return "comparison";
  if (/왜|이유|후보|떴/.test(text)) return "candidate_reason";
  if (/첫\s*주택|첫\s*집|첫\s*구매|가능|구매력|월급|예산|어디까지/.test(text)) return "purchase_power";
  if (/위험|리스크|안전|dsr|ltv|하락/.test(text)) return "risk_check";
  if (/출처|데이터\s*(뭐|무엇|어디|출처)|공공\s*데이터|kreb|한국부동산원/.test(text)) return "data_source";
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
    homeCount: analyzeUserState(input.profile, input.currentHome, input.financialPlan).mortgageHomeCount,
    isFirstTimeBuyer: analyzeUserState(input.profile, input.currentHome, input.financialPlan).isFirstTimeBuyer
  });
  const moveUpBudget = calculateMoveUpBudget(input.profile, input.currentHome);
  const fiveYearPower = calculateFuturePurchasePower(input.profile, input.currentHome, input.financialPlan, 5);
  const currentHomeIsOwned = hasOwnedCurrentHome(input.currentHome);
  const netCashAfterSale = currentHomeIsOwned ? calculateNetCashAfterSellingHome(input.currentHome) : 0;
  const targetPrice = input.activeCandidate?.referencePrice ?? input.financialPlan.targetHomePrice;
  const userState = analyzeUserState(input.profile, input.currentHome, input.financialPlan);
  return {
    purchasePowerNow,
    moveUpBudget,
    fiveYearPower,
    netCashAfterSale,
    targetPrice,
    userState,
    summary:
      `${userState.goalLabel} / ${userState.housingLabel}. 현재 구매력 ${formatKRW(purchasePowerNow)}, ` +
      `${currentHomeIsOwned ? `현재 집 정리 후 예산 ${formatKRW(moveUpBudget)}, 현재 집 정리 후 순현금 ${formatKRW(netCashAfterSale)}, ` : `목표가 대비 부족액 ${formatKRW(Math.max(0, targetPrice - purchasePowerNow))}, `}` +
      `5년 뒤 추정 구매력 ${formatKRW(fiveYearPower)}, ` +
      `월소득 ${formatMonthly(input.profile.monthlyIncome)}, 월저축 ${formatMonthly(input.profile.monthlySavings)}.`
  };
}

function buildContextText(results: SearchResult[], intent?: HomePathChatIntent) {
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
  return [summaryText, ragText].filter(Boolean).join("\n\n");
}

function buildUserRagAnchors(input: HomePathChatInput): UserRagAnchor[] {
  const anchors: UserRagAnchor[] = [];
  if (input.activeCandidate) {
    anchors.push({
      id: `active:${input.activeCandidate.id}`,
      role: "active_candidate",
      label: input.activeCandidate.complexName,
      complexName: input.activeCandidate.complexName,
      region: input.activeCandidate.region,
      lawdCode5: input.activeCandidate.lawdCode5 ?? undefined,
      areaBucket: input.activeCandidate.areaBucket,
      floorBand: input.activeCandidate.floorBand,
      referencePrice: input.activeCandidate.referencePrice ?? undefined,
      memo: "현재 화면에서 설명 중인 후보"
    });
  }

  for (const item of input.portfolioItems ?? []) {
    anchors.push({
      id: `portfolio:${item.complexSignalId ?? item.propertyId ?? item.id}`,
      role: "portfolio_item",
      label: item.complexName ?? item.propertyId,
      complexName: item.complexName,
      region: item.region,
      areaBucket: item.areaBucket,
      floorBand: item.floorBand,
      referencePrice: item.referencePrice ?? item.virtualPurchasePrice,
      memo: item.memo ?? item.reason
    });
  }

  for (const home of input.interestedHomes ?? []) {
    anchors.push({
      id: `interest:${home.complexSignalId ?? home.propertyId ?? home.id ?? home.complexName ?? home.name}`,
      role: "interested_home",
      label: home.complexName ?? home.name ?? home.propertyId ?? "관심 주택",
      complexName: home.complexName ?? home.name,
      region: home.region,
      lawdCode5: home.lawdCode5 ?? undefined,
      areaBucket: home.areaBucket ?? undefined,
      floorBand: home.floorBand ?? undefined,
      referencePrice: home.referencePrice ?? home.virtualPurchasePrice ?? undefined,
      memo: home.memo ?? home.reason ?? undefined
    });
  }

  const seen = new Set<string>();
  return anchors.filter((anchor) => {
    const key = [anchor.complexName ?? anchor.label, anchor.region ?? "", anchor.areaBucket ?? "", anchor.referencePrice ?? ""].join(":");
    if (seen.has(key)) return false;
    seen.add(key);
    return Boolean(anchor.label);
  });
}

function buildMandatoryUserContextResults(input: {
  profile: UserProfile;
  currentHome: CurrentHome;
  financialPlan: UserFinancialPlan;
  activeCandidate?: ComplexSignalCandidate | null;
  calculations: ReturnType<typeof buildCalculationSummary>;
  anchors: UserRagAnchor[];
}): SearchResult[] {
  const userState = analyzeUserState(input.profile, input.currentHome, input.financialPlan);
  const results: SearchResult[] = [
    {
      id: "user-context:situation",
      sourceType: "user_context",
      sourceId: "user-situation",
      title: "사용자 상황 고정 context",
      text: [
        "이 정보는 RAG 검색 결과와 무관하게 항상 답변에 먼저 반영해야 하는 사용자 상황이다.",
        `현재 상태 판정: ${userState.goalLabel}, ${userState.housingLabel}, 첫 주택 구매자 기준=${userState.isFirstTimeBuyer ? "예" : "아니오"}, 대출 계산 주택수=${userState.mortgageHomeCount}.`,
        `월소득 ${formatMonthly(input.profile.monthlyIncome)}, 월저축 ${formatMonthly(input.profile.monthlySavings)}, 현금 ${formatKRW(input.profile.cashOnHand)}, 위험성향 ${input.profile.riskPreference}.`,
        `선호지역 ${input.profile.preferredRegions.join(", ") || "미입력"}, 목표 ${input.financialPlan.targetRegion} ${formatKRW(input.financialPlan.targetHomePrice)}, 목표기간 ${input.financialPlan.targetHorizonYears}년.`,
        `현재 집 ${input.currentHome.region}, 추정가 ${formatKRW(input.currentHome.estimatedCurrentPrice)}, 매입가 ${formatKRW(input.currentHome.purchasePrice)}, 대출잔액 ${formatKRW(input.currentHome.loanBalance)}, 점유 ${input.currentHome.occupancyType}.`,
        `계산 요약: ${input.calculations.summary}`
      ].join(" "),
      metadata: {
        contextRole: "user_situation",
        pinned: true,
        primaryGoal: input.profile.primaryGoal,
        goalLabel: userState.goalLabel,
        housingPosition: userState.position,
        isFirstTimeBuyer: userState.isFirstTimeBuyer,
        mortgageHomeCount: userState.mortgageHomeCount,
        region: input.currentHome.region,
        targetRegion: input.financialPlan.targetRegion,
        targetPrice: input.financialPlan.targetHomePrice,
        monthlyIncome: input.profile.monthlyIncome,
        cashOnHand: input.profile.cashOnHand,
        purchasePowerNow: input.calculations.purchasePowerNow,
        moveUpBudget: input.calculations.moveUpBudget,
        fiveYearPower: input.calculations.fiveYearPower
      },
      score: 1,
      finalScore: 1.8,
      boostReason: ["mandatory:user_situation"]
    }
  ];

  if (input.activeCandidate) {
    results.push({
      id: `user-context:active-candidate:${input.activeCandidate.id}`,
      sourceType: "user_context",
      sourceId: input.activeCandidate.id,
      title: "현재 후보 고정 context",
      text: [
        "사용자가 지금 설명을 요구한 후보이므로 반드시 답변에 포함해야 한다.",
        `${input.activeCandidate.region} ${input.activeCandidate.complexName} ${input.activeCandidate.areaBucket}.`,
        `기준가 ${input.activeCandidate.referencePrice ? formatKRW(input.activeCandidate.referencePrice) : "데이터 부족"}, 거래 집중도 ${formatOptionalNumber(input.activeCandidate.transactionHeat, 2, "배")}, 전고점 대비 ${formatOptionalNumber(input.activeCandidate.drawdownFromHigh, 1, "%")}, 전세가율 ${formatOptionalNumber(input.activeCandidate.jeonseRatio, 1, "%")}.`,
        `주의: ${input.activeCandidate.disclaimer ?? "공공데이터 기반 참고용 진단이며 매수 추천이 아니다."}`
      ].join(" "),
      metadata: {
        contextRole: "active_candidate",
        pinned: true,
        complexName: input.activeCandidate.complexName,
        region: input.activeCandidate.region,
        lawdCode5: input.activeCandidate.lawdCode5,
        areaBucket: input.activeCandidate.areaBucket,
        floorBand: input.activeCandidate.floorBand,
        referencePrice: input.activeCandidate.referencePrice ?? null
      },
      score: 1,
      finalScore: 1.7,
      boostReason: ["mandatory:active_candidate"]
    });
  }

  const interestAnchors = input.anchors.filter((anchor) => anchor.role !== "active_candidate");
  if (interestAnchors.length) {
    results.push({
      id: "user-context:interest-homes",
      sourceType: "user_context",
      sourceId: "interest-homes",
      title: "관심 주택 고정 context",
      text: [
        "사용자가 관심에 담은 주택 목록이다. 답변은 이 관심 후보들을 빠뜨리지 말고, 이 후보들을 기준점으로 삼아 TurboQuant RAG에서 찾은 다른 후보와 비교해야 한다.",
        ...interestAnchors.map((anchor, index) =>
          `${index + 1}. ${anchor.region ?? "지역 미상"} ${anchor.label}${anchor.areaBucket ? ` ${anchor.areaBucket}` : ""}: 기준가 ${anchor.referencePrice ? formatKRW(anchor.referencePrice) : "미상"}${anchor.memo ? `, 메모 ${anchor.memo}` : ""}`
        )
      ].join("\n"),
      metadata: {
        contextRole: "interest_homes",
        pinned: true,
        interestCount: interestAnchors.length,
        complexName: interestAnchors.map((anchor) => anchor.complexName ?? anchor.label).join(", "),
        region: interestAnchors.map((anchor) => anchor.region).filter(Boolean).join(", ")
      },
      score: 1,
      finalScore: 1.6,
      boostReason: ["mandatory:interest_homes"]
    });
  }

  return results;
}

function buildAnchorQueries(
  anchors: UserRagAnchor[],
  profile: UserProfile,
  currentHome: CurrentHome,
  financialPlan: UserFinancialPlan,
  calculations: ReturnType<typeof buildCalculationSummary>
) {
  const base = [
    "사용자 상황 맞춤 비교",
    `월소득 ${profile.monthlyIncome}`,
    `월저축 ${profile.monthlySavings}`,
    `현금 ${profile.cashOnHand}`,
    `현재집 ${currentHome.region}`,
    `목표지역 ${financialPlan.targetRegion}`,
    `현재구매력 ${calculations.purchasePowerNow}`,
    `정리후예산 ${calculations.moveUpBudget}`,
    `5년구매력 ${calculations.fiveYearPower}`,
    "같은 예산 다른 후보 거래 집중도 전세가율 전고점 대비 하락 리스크"
  ];
  const anchorQueries = anchors.map((anchor) =>
    [
      ...base,
      anchor.role,
      anchor.complexName,
      anchor.region,
      anchor.lawdCode5,
      anchor.areaBucket,
      anchor.floorBand,
      anchor.referencePrice ? `관심가격 ${anchor.referencePrice}` : undefined,
      anchor.referencePrice ? `비슷한 가격대 ${Math.round(anchor.referencePrice / 100_000_000)}억` : undefined,
      anchor.memo
    ]
      .filter(Boolean)
      .join(" ")
  );
  return anchorQueries.length ? anchorQueries : [base.join(" ")];
}

const INTENT_SOURCE_BOOST: Record<HomePathChatIntent, Partial<Record<RagSourceType, number>>> = {
  candidate_reason: {
    complex_signal: 0.2,
    model_artifact: 0.16,
    fusion_data: 0.1,
    kreb_market_index: 0.08,
    hug_jeonse_risk: 0.08,
    transport_accessibility: 0.08,
    faq: 0.08,
    safety_policy: 0.04,
    doc: -0.04
  },
  purchase_power: {
    complex_signal: 0.1,
    fusion_data: 0.06,
    transport_accessibility: 0.04,
    faq: 0.1,
    doc: 0.04,
    safety_policy: 0.04
  },
  comparison: {
    complex_signal: 0.18,
    model_artifact: 0.14,
    fusion_data: 0.12,
    kreb_market_index: 0.1,
    hug_jeonse_risk: 0.1,
    transport_accessibility: 0.1,
    faq: 0.08,
    safety_policy: 0.06,
    doc: 0.02
  },
  risk_check: {
    complex_signal: 0.14,
    model_artifact: 0.12,
    hug_jeonse_risk: 0.14,
    kreb_market_index: 0.1,
    fusion_data: 0.1,
    transport_accessibility: 0.06,
    safety_policy: 0.12,
    faq: 0.06
  },
  data_source: {
    fusion_data: 0.22,
    kreb_market_index: 0.2,
    hug_jeonse_risk: 0.2,
    transport_accessibility: 0.2,
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
    fusion_data: 0.06,
    faq: 0.06,
    model_artifact: 0.04,
    safety_policy: 0.04
  }
};

export function rankHomePathRagResults(
  results: SearchResult[],
  activeCandidate: ComplexSignalCandidate | null | undefined,
  intent: HomePathChatIntent,
  options: {
    anchors?: UserRagAnchor[];
    calculations?: Pick<ReturnType<typeof buildCalculationSummary>, "purchasePowerNow" | "moveUpBudget" | "fiveYearPower">;
  } = {}
) {
  return results
    .map((result) => {
      const sourceTypeBoost = INTENT_SOURCE_BOOST[intent][result.sourceType] ?? 0;
      const candidateBoost = candidateMetadataBoost(result, activeCandidate);
      const anchorBoost = anchorMetadataBoost(result, options.anchors ?? []);
      const fitBoost = userFitMetadataBoost(result, options.calculations);
      const boostReason = [
        sourceTypeBoost ? `intent:${intent}:${result.sourceType}+${sourceTypeBoost.toFixed(2)}` : undefined,
        ...candidateBoost.reasons,
        ...anchorBoost.reasons,
        ...fitBoost.reasons
      ].filter(Boolean) as string[];
      return {
        ...result,
        finalScore: result.score + sourceTypeBoost + candidateBoost.value + anchorBoost.value + fitBoost.value,
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

function anchorMetadataBoost(result: SearchResult, anchors: UserRagAnchor[]) {
  if (!anchors.length) return { value: 0, reasons: [] as string[] };
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
  const resultPrice = numericMetadata(result.metadata.referencePrice);

  for (const anchor of anchors.slice(0, 8)) {
    const anchorLabel = anchor.complexName?.toLowerCase();
    if (anchorLabel && haystack.includes(anchorLabel)) {
      value += anchor.role === "active_candidate" ? 0.1 : 0.18;
      reasons.push(`${anchor.role}:exact+${anchor.role === "active_candidate" ? "0.10" : "0.18"}`);
    }
    if (anchor.lawdCode5 && haystack.includes(anchor.lawdCode5.toLowerCase())) {
      value += 0.08;
      reasons.push(`${anchor.role}:lawdCode5+0.08`);
    }
    if (anchor.region && haystack.includes(anchor.region.toLowerCase())) {
      value += 0.08;
      reasons.push(`${anchor.role}:region+0.08`);
    }
    if (anchor.areaBucket && haystack.includes(anchor.areaBucket.toLowerCase())) {
      value += 0.05;
      reasons.push(`${anchor.role}:areaBucket+0.05`);
    }
    if (anchor.referencePrice && resultPrice && isSimilarPrice(anchor.referencePrice, resultPrice)) {
      value += 0.07;
      reasons.push(`${anchor.role}:similarPrice+0.07`);
    }
  }
  return { value: Math.min(value, 0.42), reasons: Array.from(new Set(reasons)).slice(0, 8) };
}

function userFitMetadataBoost(
  result: SearchResult,
  calculations?: Pick<ReturnType<typeof buildCalculationSummary>, "purchasePowerNow" | "moveUpBudget" | "fiveYearPower">
) {
  if (!calculations || result.sourceType !== "complex_signal") return { value: 0, reasons: [] as string[] };
  const price = numericMetadata(result.metadata.referencePrice);
  if (!price) return { value: 0, reasons: [] as string[] };
  if (price <= calculations.purchasePowerNow) {
    return { value: 0.14, reasons: ["userFit:possibleNow+0.14"] };
  }
  if (price <= calculations.moveUpBudget) {
    return { value: 0.11, reasons: ["userFit:afterSale+0.11"] };
  }
  if (price <= calculations.fiveYearPower) {
    return { value: 0.07, reasons: ["userFit:fiveYear+0.07"] };
  }
  const targetCeiling = Math.max(calculations.fiveYearPower, calculations.moveUpBudget) * 1.18;
  if (price <= targetCeiling) {
    return { value: 0.03, reasons: ["userFit:nearStretch+0.03"] };
  }
  return { value: -0.04, reasons: ["userFit:overBudget-0.04"] };
}

function numericMetadata(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isSimilarPrice(anchorPrice: number, resultPrice: number) {
  const ratio = Math.abs(resultPrice - anchorPrice) / Math.max(anchorPrice, 1);
  return ratio <= 0.22;
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
        { sourceType: "fusion_data", minimum: 1, take: 3, hints: ["융합 안정성 점수", "한국부동산원", "HUG", "교통 접근성"] },
        { sourceType: "kreb_market_index", minimum: 1, take: 3, hints: ["한국부동산원", "지역시장 지수", "R-ONE", "매매가격지수", "전세가격지수"] },
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
        { sourceType: "fusion_data", minimum: 1, take: 3, hints: ["융합 안정성", "주거 안정성", "데이터 확인 가능성"] },
        { sourceType: "kreb_market_index", minimum: 1, take: 3, hints: ["한국부동산원", "KREB", "지역시장", "매매가격지수", "전세가격지수"] },
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
        { sourceType: "fusion_data", minimum: 1, take: 3, hints: ["융합 안정성 점수", "주거 안정성", "지역시장"] },
        { sourceType: "transport_accessibility", minimum: 1, take: 3, hints: ["교통 접근성", "직주근접", "생활권"] },
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
        { sourceType: "hug_jeonse_risk", minimum: 1, take: 3, hints: ["HUG", "전세 리스크", "보증사고", "임차 안정성"] },
        { sourceType: "kreb_market_index", minimum: 1, take: 3, hints: ["한국부동산원", "지역시장", "가격지수", "변동성"] },
        { sourceType: "complex_signal", minimum: 2, take: 4, hints: ["하락 리스크", "전세가율", "거래 부재", "공급", "공실"] },
        { sourceType: "model_artifact", minimum: 1, take: 4, hints: ["하락 리스크 확률", "Transformer", "백테스트"] },
        faq
      ]
    };
  }
  if (intent === "data_source") {
    return {
      resultLimit: 12,
      sourceMinimums: [
        { sourceType: "fusion_data", minimum: 2, take: 4, hints: ["융합데이터 증빙", "real seed mock", "주관기관 융합데이터"] },
        { sourceType: "kreb_market_index", minimum: 1, take: 3, hints: ["한국부동산원", "지역시장 지수", "R-ONE"] },
        { sourceType: "hug_jeonse_risk", minimum: 1, take: 3, hints: ["HUG", "전세 리스크", "보증사고"] },
        { sourceType: "transport_accessibility", minimum: 1, take: 3, hints: ["교통 접근성", "K-MaaS", "직주근접"] },
        { sourceType: "faq", minimum: 1, take: 4, hints: ["데이터 출처", "공공 실거래", "법정동 코드", "건축물대장"] },
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
      { sourceType: "fusion_data", minimum: 1, take: 3, hints: ["융합 안정성", "한국부동산원", "HUG", "교통"] },
      { sourceType: "kreb_market_index", minimum: 1, take: 3, hints: ["KREB", "한국부동산원", "지역시장 지수"] },
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
  if (sourceType === "user_context") return "사용자 상황/관심 주택";
  if (sourceType === "complex_signal") return "후보 실거래 지표";
  if (sourceType === "model_artifact") return "Transformer AI 신호";
  if (sourceType === "faq") return "FAQ 근거";
  if (sourceType === "safety_policy") return "안전 정책";
  if (sourceType === "fusion_data") return "융합 공공데이터";
  if (sourceType === "kreb_market_index") return "한국부동산원 지역지수";
  if (sourceType === "hug_jeonse_risk") return "HUG 전세 리스크";
  if (sourceType === "transport_accessibility") return "교통 접근성";
  return "문서 근거";
}

function buildRagQuery(input: {
  input: HomePathChatInput;
  intent: HomePathChatIntent;
  profile: UserProfile;
  currentHome: CurrentHome;
  financialPlan: UserFinancialPlan;
  calculations: ReturnType<typeof buildCalculationSummary>;
  anchors: UserRagAnchor[];
}) {
  const activeCandidate = input.input.activeCandidate;
  const intentKeywords: Record<HomePathChatIntent, string[]> = {
    candidate_reason: ["후보 이유", "거래 집중도", "전세가율", "AI 후보점수", "회복 확률", "하락 리스크", "융합 안정성"],
    purchase_power: ["구매력", "월소득", "월저축", "현재 집 정리 후 예산", "미래 구매력", "DSR", "LTV", "주거 안정성", "국토부 실거래", "KREB 지역지수"],
    comparison: ["같은 예산 비교", "안정성", "거래 회복", "가격 낙폭", "전세가율", "현금흐름", "교통 접근성", "KREB 지역시장"],
    risk_check: ["리스크", "안전", "하락", "대출 부담", "실거래 부재", "전세가율", "HUG", "한국부동산원"],
    data_source: ["데이터 출처", "공공 실거래", "법정동 코드", "건축물대장", "한국부동산원", "HUG", "교통 접근성", "Transformer artifact"],
    safety: ["매수 추천 아님", "수익 보장 금지", "대출 승인 보장 금지", "의사결정 보조"],
    general: ["홈패스", "공공데이터", "구매력", "후보", "리스크"]
  };
  return [
    input.input.message,
    input.intent,
    ...intentKeywords[input.intent],
    "사용자 상황 맞춤 답변",
    "관심 주택 기반 비교",
    ...input.anchors.flatMap((anchor) => [
      anchor.label,
      anchor.complexName,
      anchor.region,
      anchor.lawdCode5,
      anchor.areaBucket,
      anchor.referencePrice ? `관심가격:${anchor.referencePrice}` : undefined,
      anchor.memo
    ]),
    activeCandidate?.complexName,
    activeCandidate?.region,
    activeCandidate?.areaBucket,
    input.profile.preferredRegions.join(" "),
    input.currentHome.region,
    input.financialPlan.targetRegion,
    `targetPrice:${input.financialPlan.targetHomePrice}`,
    `purchasePowerNow:${input.calculations.purchasePowerNow}`,
    `moveUpBudget:${input.calculations.moveUpBudget}`,
    `fiveYearPower:${input.calculations.fiveYearPower}`,
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
    result.metadata.contextRole ? `contextRole=${result.metadata.contextRole}` : undefined,
    result.metadata.intent ? `intent=${result.metadata.intent}` : undefined,
    result.metadata.region ? `region=${result.metadata.region}` : undefined,
    result.metadata.complexName ? `complex=${result.metadata.complexName}` : undefined,
    result.metadata.areaBucket ? `area=${result.metadata.areaBucket}` : undefined,
    result.metadata.referencePrice ? `referencePrice=${result.metadata.referencePrice}` : undefined,
    result.metadata.aiScore ? `aiScore=${result.metadata.aiScore}` : undefined,
    result.metadata.provider ? `provider=${result.metadata.provider}` : undefined,
    result.metadata.fusionSourceType ? `fusionSourceType=${result.metadata.fusionSourceType}` : undefined,
    result.metadata.fusedStabilityScore ? `fusedScore=${result.metadata.fusedStabilityScore}` : undefined,
    result.metadata.fusedRiskGrade ? `fusedGrade=${result.metadata.fusedRiskGrade}` : undefined,
    typeof result.metadata.fusionConfidence === "number" ? `fusionConfidence=${result.metadata.fusionConfidence}` : undefined
  ].filter(Boolean);
  return metadata.join(", ");
}

function limitContextChunk(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 850 ? `${compact.slice(0, 847)}...` : compact;
}

function formatOptionalNumber(value: unknown, digits: number, suffix: string) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(digits)}${suffix}` : "미상";
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
