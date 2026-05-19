import type { CurrentHome, ComplexSignalCandidate, DiscoveryCardType, UserProfile } from "@/types";
import { analyzePropertyForUser } from "@/lib/calculations";
import { complexSignalToPropertyLike } from "@/lib/candidateAdapter";
import { formatKRW } from "@/lib/format";
import { resolveNaverRealEstateLink } from "@/server/external-links/naverRealEstateLinkResolver";
import { calculateLeaderScore, calculateLiquidityScore } from "@/server/move-up/leaderComplexService";
import { findMoveUpBand } from "@/server/move-up/moveUpBandService";
import type { ExpandedRegion } from "@/server/regions/regionExpansionService";

type SnapshotLike = {
  id: string;
  lawdCode5: string;
  legalDongCode10: string | null;
  region: string | null;
  legalDong: string | null;
  complexName: string;
  propertyType: string;
  areaBucket: string;
  floorBand: string;
  referencePrice: bigint | number | null;
  referencePriceMethod: string | null;
  recentMedianPrice: bigint | number | null;
  recentWeightedPrice: bigint | number | null;
  lowFloorPrice: bigint | number | null;
  midFloorPrice: bigint | number | null;
  highFloorPrice: bigint | number | null;
  recentJeonseMedian: bigint | number | null;
  previousHighPrice: bigint | number | null;
  drawdownFromHigh: number | null;
  jeonseRatio: number | null;
  volume30d: number;
  volume90d: number;
  previous90dVolume: number;
  baselineMonthlyVolume: number | null;
  transactionHeat: number | null;
  reaccelerationScore: number | null;
  inventoryLikelihoodScore: number | null;
  latestTradeDate: Date | null;
  hotScore: number;
  discountScore: number;
  jeonseScore: number;
  recommendationScore?: number;
  householdCount?: number | null;
  monthlyTradeAvg?: number | null;
  liquidityScore?: number | null;
  leaderScore?: number | null;
  sellabilityScore?: number | null;
};

export async function scoreComplexCandidate(input: {
  snapshot: SnapshotLike;
  userProfile: UserProfile;
  currentHome?: CurrentHome;
  expandedRegion?: ExpandedRegion;
  peerPrices?: number[];
  peerVolume90d?: number[];
}): Promise<ComplexSignalCandidate> {
  const snapshot = input.snapshot;
  const propertyType = snapshot.propertyType === "officetel" ? "officetel" : "apartment";
  const referencePrice = toNumber(snapshot.referencePrice);
  const regionFit = Math.round((input.expandedRegion?.weight ?? 0.42) * 100);
  const baseCandidate = snapshotToCandidateSkeleton(snapshot, propertyType, referencePrice, regionFit);
  const propertyLike = complexSignalToPropertyLike(baseCandidate);
  const analysis = analyzePropertyForUser(input.userProfile, input.currentHome, propertyLike);
  const affordabilityFit = Math.max(0, 100 - Math.max(0, analysis.shortage) / 5_000_000 - Math.max(0, analysis.dsrRatio - 40) * 2);
  const transactionHeatScore = Math.min(100, Math.round((snapshot.transactionHeat ?? 0) * 24));
  const drawdownOpportunityScore = Math.min(100, Math.max(0, Math.abs(snapshot.drawdownFromHigh ?? 0) * 3));
  const jeonseRatioScore = Math.min(100, Math.max(0, (snapshot.jeonseRatio ?? 0) - 45) * 2);
  const reaccelerationScore = Math.min(100, Math.round((snapshot.reaccelerationScore ?? 0) * 25));
  const communityHeatScore = Math.min(100, 45 + Math.round((snapshot.transactionHeat ?? 0) * 8));
  const inventoryLikelihoodScore = Math.min(100, Math.round(snapshot.inventoryLikelihoodScore ?? 0));
  const monthlyTradeAvg = snapshot.monthlyTradeAvg ?? Math.max(snapshot.volume90d / 3, 0);
  const liquidityScore =
    snapshot.liquidityScore ??
    calculateLiquidityScore({
      monthlyTradeAvg,
      volume90d: snapshot.volume90d,
      householdCount: snapshot.householdCount
    });
  const leaderScore =
    snapshot.leaderScore ??
    calculateLeaderScore({
      referencePrice,
      regionPeerPrices: input.peerPrices ?? [],
      volume90d: snapshot.volume90d,
      peerVolume90d: input.peerVolume90d ?? [],
      liquidityScore,
      jeonseRatio: snapshot.jeonseRatio
    });
  const sellabilityScore = snapshot.sellabilityScore ?? Math.round(liquidityScore * 0.7 + leaderScore * 0.3);
  const goalBoost = goalSpecificBoost(input.userProfile.primaryGoal, propertyType, analysis, snapshot);
  const recommendationScore = Math.round(
    regionFit * 0.15 +
      affordabilityFit * 0.2 +
      transactionHeatScore * 0.2 +
      drawdownOpportunityScore * 0.15 +
      jeonseRatioScore * 0.1 +
      reaccelerationScore * 0.1 +
      communityHeatScore * 0.05 +
      inventoryLikelihoodScore * 0.05 +
      goalBoost
  );
  const link = await resolveNaverRealEstateLink({
    lawdCode5: snapshot.lawdCode5,
    legalDongCode10: snapshot.legalDongCode10,
    region: snapshot.region,
    legalDong: snapshot.legalDong,
    complexName: snapshot.complexName,
    propertyType,
    areaBucket: snapshot.areaBucket
  });
  const yearsToReach = analysis.monthsToReach <= 0 ? 0 : Math.ceil(analysis.monthsToReach / 12);
  const cardType = classifyDiscoveryCard(propertyType, analysis, snapshot);
  const moveUpBand = findMoveUpBand(referencePrice, input.currentHome?.estimatedCurrentPrice ?? 0);
  const lowFloorWarning =
    snapshot.floorBand === "low"
      ? "저층 거래 기준가입니다. 2~3층 거래 비중이 높으면 재매도 선호도가 낮을 수 있어 중층 가격과 비교하세요."
      : null;
  const candidate: ComplexSignalCandidate = {
    ...baseCandidate,
    cardType,
    referencePriceLabel: referencePrice ? `최근 실거래 시간가중 기준가 ${formatKRW(referencePrice)}` : "실거래 기준가 부족",
    userFit: {
      possibleNow: analysis.isAffordableNow,
      possibleAfterSellingCurrentHome: analysis.isAffordableAfterSale,
      yearsToReach,
      shortageNow: analysis.shortage,
      monthlyBurdenDelta: analysis.monthlyDebtPayment,
      dsrRatio: analysis.dsrRatio,
      ltvRate: analysis.ltvRate,
      ltvLimit: analysis.ltvLimit,
      dsrLimit: analysis.dsrLimit,
      regulationNotes: analysis.regulationNotes
    },
    floorPriceSummary: {
      low: toNumber(snapshot.lowFloorPrice),
      mid: toNumber(snapshot.midFloorPrice),
      high: toNumber(snapshot.highFloorPrice),
      selectedBand: snapshot.floorBand as ComplexSignalCandidate["floorBand"],
      warning: lowFloorWarning
    },
    moveUp: {
      targetMultiplierBand: moveUpBand?.multiplier ?? null,
      isInTargetBand: Boolean(moveUpBand),
      priceBandLabel: moveUpBand ? `${moveUpBand.label} ${formatKRW(moveUpBand.targetMinPrice)}~${formatKRW(moveUpBand.targetMaxPrice)}` : "갈아타기 목표 band 밖",
      moveUpFitScore: Math.round((moveUpBand ? 35 : 0) + liquidityScore * 0.25 + leaderScore * 0.25 + affordabilityFit * 0.15),
      sellabilityScore,
      leaderScore,
      liquidityScore,
      lowFloorWarning,
      checklist: {
        priceBandPass: Boolean(moveUpBand),
        liquidityPass: monthlyTradeAvg >= 1 || (snapshot.householdCount ?? 0) >= 400,
        leaderPass: leaderScore >= 65,
        transportPass: null,
        schoolPass: null,
        floorPass: snapshot.floorBand !== "low"
      }
    },
    scores: {
      recommendationScore,
      affordabilityFit,
      regionFit,
      transactionHeatScore,
      drawdownOpportunityScore,
      jeonseRatioScore,
      reaccelerationScore,
      communityHeatScore,
      inventoryLikelihoodScore
    },
    externalLinks: {
      naverSearchUrl: link.url,
      accuracyLevel: link.accuracyLevel
    },
    reasons: buildReasons({ snapshot, regionFit, analysis, cardType, moveUpBandLabel: moveUpBand?.label }),
    disclaimer: "공공 실거래가 기반 분석 후보입니다. 실제 현재 매물은 네이버 등 외부 사이트에서 확인하세요."
  };
  return candidate;
}

function snapshotToCandidateSkeleton(
  snapshot: SnapshotLike,
  propertyType: "apartment" | "officetel",
  referencePrice: number | null,
  regionFit: number
): ComplexSignalCandidate {
  return {
    id: snapshot.id,
    sourceType: "complex_signal",
    cardType: "hot_complex",
    lawdCode5: snapshot.lawdCode5,
    legalDongCode10: snapshot.legalDongCode10,
    region: snapshot.region ?? snapshot.legalDong ?? "관심지역",
    legalDong: snapshot.legalDong,
    complexName: snapshot.complexName,
    propertyType,
    areaBucket: snapshot.areaBucket as ComplexSignalCandidate["areaBucket"],
    floorBand: snapshot.floorBand as ComplexSignalCandidate["floorBand"],
    referencePrice,
    referencePriceLabel: referencePrice ? `최근 실거래 시간가중 기준가 ${formatKRW(referencePrice)}` : "실거래 기준가 부족",
    referencePriceMethod: (snapshot.referencePriceMethod ?? "median") as ComplexSignalCandidate["referencePriceMethod"],
    recentMedianPrice: toNumber(snapshot.recentMedianPrice),
    recentWeightedPrice: toNumber(snapshot.recentWeightedPrice),
    lowFloorPrice: toNumber(snapshot.lowFloorPrice),
    midFloorPrice: toNumber(snapshot.midFloorPrice),
    highFloorPrice: toNumber(snapshot.highFloorPrice),
    recentJeonseMedian: toNumber(snapshot.recentJeonseMedian),
    previousHighPrice: toNumber(snapshot.previousHighPrice),
    drawdownFromHigh: snapshot.drawdownFromHigh,
    jeonseRatio: snapshot.jeonseRatio,
    volume30d: snapshot.volume30d,
    volume90d: snapshot.volume90d,
    previous90dVolume: snapshot.previous90dVolume,
    baselineMonthlyVolume: snapshot.baselineMonthlyVolume,
    transactionHeat: snapshot.transactionHeat ?? 0,
    reaccelerationScore: snapshot.reaccelerationScore ?? 0,
    inventoryLikelihoodScore: snapshot.inventoryLikelihoodScore ?? 0,
    latestTradeDate: snapshot.latestTradeDate?.toISOString() ?? null,
    floorPriceSummary: {
      low: toNumber(snapshot.lowFloorPrice),
      mid: toNumber(snapshot.midFloorPrice),
      high: toNumber(snapshot.highFloorPrice),
      selectedBand: snapshot.floorBand as ComplexSignalCandidate["floorBand"]
    },
    userFit: {
      possibleNow: false,
      possibleAfterSellingCurrentHome: false,
      yearsToReach: null,
      shortageNow: null,
      monthlyBurdenDelta: null
    },
    scores: {
      recommendationScore: 0,
      affordabilityFit: 0,
      regionFit,
      transactionHeatScore: 0,
      drawdownOpportunityScore: 0,
      jeonseRatioScore: 0,
      reaccelerationScore: 0,
      communityHeatScore: 0,
      inventoryLikelihoodScore: 0
    },
    externalLinks: {
      naverSearchUrl: "https://www.naver.com",
      accuracyLevel: "region_search"
    },
    reasons: [],
    disclaimer: ""
  };
}

function classifyDiscoveryCard(
  propertyType: "apartment" | "officetel",
  analysis: ReturnType<typeof analyzePropertyForUser>,
  snapshot: SnapshotLike
): DiscoveryCardType {
  if (propertyType === "officetel" && (snapshot.jeonseRatio ?? 0) >= 65) return "officetel_cash_flow";
  if (analysis.isAffordableAfterSale) return "current_home_moveup";
  if (analysis.monthsToReach <= 120) return "future_affordable";
  if ((snapshot.transactionHeat ?? 0) >= 2.2) return "hot_complex";
  if ((snapshot.drawdownFromHigh ?? 0) <= -10) return "discount_complex";
  if ((snapshot.jeonseRatio ?? 0) >= 60) return "jeonse_ratio_complex";
  return "community_hot";
}

function goalSpecificBoost(
  goal: UserProfile["primaryGoal"],
  propertyType: "apartment" | "officetel",
  analysis: ReturnType<typeof analyzePropertyForUser>,
  snapshot: SnapshotLike
) {
  if (goal === "move_up" && analysis.isAffordableAfterSale) return 12;
  if (goal === "cash_flow" && propertyType === "officetel") return 12;
  if (goal === "just_browsing" && (snapshot.transactionHeat ?? 0) >= 2) return 10;
  if (goal === "buy_home" && analysis.monthsToReach <= 60) return 10;
  if (goal === "multi_home" && (snapshot.jeonseRatio ?? 0) >= 60) return 8;
  return 0;
}

function buildReasons(input: {
  snapshot: SnapshotLike;
  regionFit: number;
  analysis: ReturnType<typeof analyzePropertyForUser>;
  cardType: DiscoveryCardType;
  moveUpBandLabel?: string;
}) {
  const reasons = [
    input.regionFit >= 90 ? "관심지역과 일치합니다." : "관심지역과 유사한 생활권/가격대 후보입니다.",
    `최근 30일 거래 ${input.snapshot.volume30d}건, 90일 거래 ${input.snapshot.volume90d}건입니다.`,
    `거래 집중도는 평소 대비 ${(input.snapshot.transactionHeat ?? 0).toFixed(1)}배 수준입니다.`
  ];
  if (input.analysis.isAffordableAfterSale) reasons.push("현재 집 매도 시 접근 가능한 가격대입니다.");
  if ((input.snapshot.drawdownFromHigh ?? 0) < 0) reasons.push(`전고점 대비 ${(input.snapshot.drawdownFromHigh ?? 0).toFixed(1)}% 구간입니다.`);
  if ((input.snapshot.jeonseRatio ?? 0) > 0) reasons.push(`전세가율은 ${(input.snapshot.jeonseRatio ?? 0).toFixed(1)}%로 추정됩니다.`);
  if (input.moveUpBandLabel) reasons.push(`${input.moveUpBandLabel} 가격대에 걸쳐 있습니다.`);
  if (input.cardType === "officetel_cash_flow") reasons.push("오피스텔 현금흐름 후보로 분류했습니다.");
  return reasons.slice(0, 6);
}

function toNumber(value: bigint | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return Number(value);
}
