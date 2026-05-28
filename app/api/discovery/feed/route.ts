import { NextRequest, NextResponse } from "next/server";
import { properties as dummyProperties, sampleHomes, sampleProfiles } from "@/data/dummy";
import { complexSignalToPropertyLike } from "@/lib/candidateAdapter";
import { prisma } from "@/server/db";
import { expandPreferredRegions } from "@/server/regions/regionExpansionService";
import { loadArtifactComplexSignalSnapshots } from "@/server/signals/artifactSignalSnapshotService";
import { buildComplexSignalSnapshots } from "@/server/signals/complexSignalService";
import { scoreComplexCandidate } from "@/server/signals/complexRecommendationService";
import type { ComplexSignalCandidate, CurrentHome, UserProfile } from "@/types";

export async function GET(request: NextRequest) {
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 30);
  return discoveryFeed({ limit });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return discoveryFeed(body);
}

async function discoveryFeed(input: {
  preferredRegions?: string[];
  preferredLawdCodes?: string[];
  includeSimilarRegions?: boolean;
  propertyTypes?: Array<"apartment" | "officetel">;
  goal?: UserProfile["primaryGoal"];
  profile?: UserProfile;
  currentHome?: CurrentHome;
  limit?: number;
}) {
  if (process.env.APP_ENV === "production" && (!input.profile || !input.currentHome)) {
    return NextResponse.json({ source: "complex_signal", cards: [], warnings: ["profile/currentHome이 필요합니다."] }, { status: 400 });
  }
  const profile: UserProfile = input.profile
    ? { ...input.profile, preferredRegions: input.preferredRegions?.length ? input.preferredRegions : input.profile.preferredRegions, primaryGoal: input.goal ?? input.profile.primaryGoal }
    : {
        ...sampleProfiles[0],
        preferredRegions: input.preferredRegions?.length ? input.preferredRegions : sampleProfiles[0].preferredRegions,
        primaryGoal: input.goal ?? sampleProfiles[0].primaryGoal
      };
  const currentHome: CurrentHome = input.currentHome ?? sampleHomes[0];
  const regions = expandPreferredRegions({
    preferredRegions: profile.preferredRegions,
    preferredLawdCodes: input.preferredLawdCodes,
    currentHomeRegion: currentHome.region,
    currentHomeLawdCode5: currentHome.address.includes("수성") ? "27260" : undefined,
    maxRegions: input.includeSimilarRegions === false ? 1 : 6
  });
  const lawdCodes = regions.map((region) => region.lawdCode5);
  const propertyTypes = input.propertyTypes ?? ["apartment", "officetel"];
  const warnings: string[] = [];
  const baseWhere = { lawdCode5: { in: lawdCodes }, propertyType: { in: propertyTypes } };

  let snapshots = await prisma.complexSignalSnapshot.findMany({
    where: baseWhere,
    orderBy: [{ recommendationScore: "desc" }, { transactionHeat: "desc" }],
    take: Math.max(input.limit ?? 30, 30) * 2
  });

  if (snapshots.length === 0) {
    const rebuild = await buildComplexSignalSnapshots({ lawdCodes, propertyTypes, monthsBack: 36 });
    warnings.push(...rebuild.warnings);
    snapshots = await prisma.complexSignalSnapshot.findMany({
      where: baseWhere,
      orderBy: [{ recommendationScore: "desc" }, { transactionHeat: "desc" }],
      take: Math.max(input.limit ?? 30, 30) * 2
    });
  }

  let fallbackUsed = false;
  let cards: ComplexSignalCandidate[] = [];
  const artifactSnapshots = snapshots.length
    ? []
    : loadArtifactComplexSignalSnapshots({
        lawdCodes,
        propertyTypes,
        regionLabelsByLawdCode: Object.fromEntries(regions.map((region) => [region.lawdCode5, region.label])),
        limit: Math.max(input.limit ?? 30, 30) * 2
      });
  if (!snapshots.length && artifactSnapshots.length) {
    warnings.push("DB signal snapshot이 비어 있어 과거 국토부 실거래 feature artifact를 사용했습니다.");
  }
  const artifactUsed = !snapshots.length && artifactSnapshots.length > 0;

  if (snapshots.length > 0 || artifactSnapshots.length > 0) {
    const baseSnapshots = snapshots.length ? snapshots : artifactSnapshots;
    const activeTradeSnapshots = await prisma.complexSignalSnapshot.findMany({
      where: {
        ...baseWhere,
        id: { notIn: baseSnapshots.map((snapshot) => snapshot.id) }
      },
      orderBy: [{ transactionHeat: "desc" }, { volume90d: "desc" }, { recommendationScore: "desc" }],
      take: Math.max(10, input.limit ?? 30)
    });
    const affordableSnapshots = await prisma.complexSignalSnapshot.findMany({
      where: {
        ...baseWhere,
        referencePrice: { not: null },
        id: { notIn: [...baseSnapshots, ...activeTradeSnapshots].map((snapshot) => snapshot.id) }
      },
      orderBy: [{ referencePrice: "asc" }, { transactionHeat: "desc" }],
      take: Math.max(8, Math.ceil((input.limit ?? 30) * 0.5))
    });
    const mergedSnapshots = aggregateFloorBandSnapshots([...baseSnapshots, ...activeTradeSnapshots, ...affordableSnapshots]);
    cards = await Promise.all(
      mergedSnapshots.map((snapshot) => {
        const peerSnapshots = mergedSnapshots.filter((item) => item.lawdCode5 === snapshot.lawdCode5);
        return (
        scoreComplexCandidate({
          snapshot,
          userProfile: profile,
          currentHome,
          expandedRegion: regions.find((region) => region.lawdCode5 === snapshot.lawdCode5),
          peerPrices: peerSnapshots.map((item) => Number(item.referencePrice ?? 0)).filter(Boolean),
          peerVolume90d: peerSnapshots.map((item) => item.volume90d)
        })
        );
      })
    );
  } else if (process.env.APP_ENV !== "production") {
    fallbackUsed = true;
    warnings.push("실거래 signal snapshot이 없어 개발용 signal fallback을 사용했습니다.");
    cards = await Promise.all(
      dummyProperties.slice(0, 30).map((property, index) =>
        scoreComplexCandidate({
          snapshot: {
            id: `signal-fallback-${property.id}`,
            lawdCode5: property.lawdCode5 ?? "27260",
            legalDongCode10: property.legalDongCode10 ?? null,
            region: property.region,
            legalDong: property.address.split(" ").slice(-1)[0] ?? null,
            complexName: property.name,
            propertyType: property.propertyType === "officetel" ? "officetel" : "apartment",
            areaBucket: property.propertyType === "officetel" ? "officetel_30_45" : "84",
            floorBand: index % 3 === 0 ? "low" : index % 3 === 1 ? "mid" : "high",
            referencePrice: BigInt(property.salePrice),
            referencePriceMethod: "median",
            recentMedianPrice: BigInt(property.salePrice),
            recentWeightedPrice: BigInt(property.salePrice),
            lowFloorPrice: null,
            midFloorPrice: null,
            highFloorPrice: null,
            recentJeonseMedian: BigInt(property.jeonsePrice),
            previousHighPrice: BigInt(property.previousHighPrice),
            drawdownFromHigh: property.drawdownFromHigh,
            jeonseRatio: property.jeonseRatio,
            volume30d: 3 + (index % 7),
            volume90d: 9 + (index % 12),
            previous90dVolume: 4 + (index % 6),
            baselineMonthlyVolume: 2,
            transactionHeat: 1.5 + (index % 4) * 0.4,
            reaccelerationScore: 1.2 + (index % 3) * 0.3,
            inventoryLikelihoodScore: 52 + (index % 25),
            latestTradeDate: new Date(),
            hotScore: property.communityHeatScore,
            discountScore: Math.abs(property.drawdownFromHigh) * 2,
            jeonseScore: property.jeonseRatio,
            recommendationScore: property.communityHeatScore
          },
          userProfile: profile,
          currentHome,
          expandedRegion: regions.find((region) => region.lawdCode5 === property.lawdCode5)
        })
      )
    );
  }

  const defaultInterestCandidate = selectDefaultInterestCandidate(cards);
  const sorted = mixDiscoveryCards(cards, input.limit ?? 30, defaultInterestCandidate);
  return NextResponse.json({
    source: fallbackUsed
      ? "developer_fallback"
      : artifactUsed
        ? "molit_real_transaction_artifact+kreb_real_fusion"
        : "molit_real_transactions+kreb_real_fusion",
    regions,
    cards: sorted,
    properties: sorted.map(complexSignalToPropertyLike),
    defaultInterestCandidate: sorted[0] ?? defaultInterestCandidate,
    dataEvidence: {
      molit: "real_transaction_snapshot",
      kreb: "real_region_index",
      hug: "seed_jeonse_risk",
      transport: "seed_accessibility"
    },
    fallbackUsed,
    warnings
  });
}

type SnapshotRow =
  | Awaited<ReturnType<typeof prisma.complexSignalSnapshot.findMany>>[number]
  | ReturnType<typeof loadArtifactComplexSignalSnapshots>[number];

function aggregateFloorBandSnapshots(snapshots: SnapshotRow[]) {
  const groups = new Map<string, SnapshotRow[]>();
  for (const snapshot of snapshots) {
    const key = [snapshot.lawdCode5, snapshot.complexName, snapshot.propertyType, snapshot.areaBucket].join("|");
    groups.set(key, [...(groups.get(key) ?? []), snapshot]);
  }
  return [...groups.values()].map((items) => {
    const selected =
      items.find((item) => item.floorBand === "mid") ??
      items.find((item) => item.floorBand === "high") ??
      items[0];
    const low = items.find((item) => item.floorBand === "low")?.referencePrice ?? selected.lowFloorPrice;
    const mid = items.find((item) => item.floorBand === "mid")?.referencePrice ?? selected.midFloorPrice;
    const high = items.find((item) => item.floorBand === "high")?.referencePrice ?? selected.highFloorPrice;
    return {
      ...selected,
      floorBand: selected.floorBand === "unknown" && mid ? "mid" : selected.floorBand,
      lowFloorPrice: low,
      midFloorPrice: mid,
      highFloorPrice: high,
      volume30d: items.reduce((sum, item) => sum + item.volume30d, 0),
      volume90d: items.reduce((sum, item) => sum + item.volume90d, 0),
      previous90dVolume: items.reduce((sum, item) => sum + item.previous90dVolume, 0),
      monthlyTradeAvg: items.reduce((sum, item) => sum + (item.monthlyTradeAvg ?? 0), 0)
    };
  });
}

function selectDefaultInterestCandidate(cards: ComplexSignalCandidate[]) {
  return (
    dedupeCards(cards)
      .slice()
      .sort((a, b) => defaultInterestScore(b) - defaultInterestScore(a))[0] ?? null
  );
}

function defaultInterestScore(card: ComplexSignalCandidate) {
  const fit =
    card.scores.recommendationScore * 1.6 +
    card.scores.affordabilityFit * 1.25 +
    card.scores.regionFit * 1.15 +
    card.scores.transactionHeatScore * 0.9 +
    card.scores.reaccelerationScore * 0.45 +
    Math.min(100, card.volume90d * 3) * 0.25;
  const reachBoost = card.userFit.possibleNow
    ? 45
    : card.userFit.possibleAfterSellingCurrentHome
      ? 34
      : card.userFit.yearsToReach !== null && card.userFit.yearsToReach <= 5
        ? 24
        : card.userFit.yearsToReach !== null && card.userFit.yearsToReach <= 10
          ? 12
          : -18;
  const riskPenalty = card.jeonseRatio && card.jeonseRatio >= 80 ? 12 : 0;
  return fit + reachBoost - riskPenalty;
}

function mixDiscoveryCards(cards: ComplexSignalCandidate[], limit: number, defaultInterestCandidate?: ComplexSignalCandidate | null) {
  const unique = dedupeCards(cards);
  const result: ComplexSignalCandidate[] = [];
  if (defaultInterestCandidate) {
    result.push(withDiscoveryMixReason(defaultInterestCandidate, "best_fit"));
  }

  const remaining = unique.filter((card) => card.id !== defaultInterestCandidate?.id);
  const realistic = remaining
    .filter((card) => card.userFit.possibleNow || card.userFit.possibleAfterSellingCurrentHome || (card.userFit.yearsToReach !== null && card.userFit.yearsToReach <= 10))
    .sort((a, b) => defaultInterestScore(b) - defaultInterestScore(a));
  const hot = remaining
    .filter((card) => card.transactionHeat >= 1.6 || card.volume90d >= 6)
    .sort((a, b) => b.transactionHeat - a.transactionHeat || b.volume90d - a.volume90d);
  const stretch = remaining
    .filter((card) => !realistic.includes(card) && card.scores.regionFit >= 55)
    .sort((a, b) => (a.userFit.yearsToReach ?? 99) - (b.userFit.yearsToReach ?? 99) || b.scores.recommendationScore - a.scores.recommendationScore);
  const explore = remaining
    .filter((card) => !realistic.includes(card) && !stretch.includes(card))
    .sort((a, b) => b.scores.regionFit - a.scores.regionFit || b.transactionHeat - a.transactionHeat);

  const pattern = ["realistic", "realistic", "hot", "realistic", "stretch", "realistic", "hot", "explore", "realistic", "stretch"];
  const pools = {
    realistic: realistic.length ? realistic : remaining.slice().sort((a, b) => defaultInterestScore(b) - defaultInterestScore(a)),
    hot: hot.length ? hot : remaining.slice().sort((a, b) => b.transactionHeat - a.transactionHeat),
    stretch: stretch.length ? stretch : remaining,
    explore: explore.length ? explore : remaining
  };
  const cursors = { realistic: 0, hot: 0, stretch: 0, explore: 0 };

  while (result.length < limit && result.length < unique.length) {
    for (const key of pattern) {
      const poolKey = key as keyof typeof pools;
      const next = nextUnused(pools[poolKey], result, cursors[poolKey]);
      cursors[poolKey] += 1;
      if (next) result.push(withDiscoveryMixReason(next, poolKey));
      if (result.length >= limit || result.length >= unique.length) break;
    }
  }
  return result;
}

function nextUnused(pool: ComplexSignalCandidate[], selected: ComplexSignalCandidate[], start: number) {
  for (let index = start; index < pool.length; index += 1) {
    const candidate = pool[index];
    if (!selected.some((item) => item.id === candidate.id)) return candidate;
  }
  return null;
}

function withDiscoveryMixReason(card: ComplexSignalCandidate, bucket: "best_fit" | "realistic" | "hot" | "stretch" | "explore") {
  if (bucket === "best_fit") {
    return {
      ...card,
      reasons: [
        "사용자 조건과 관심지역에 가장 가까운 기본 관심 후보입니다. 저장 전에는 이 후보가 AI/RAG의 기준점으로 들어갑니다.",
        "국토부 실거래 snapshot과 KREB 지역시장 real 지표를 함께 반영했습니다.",
        ...card.reasons.filter((reason) => !reason.includes("기본 관심 후보")).slice(0, 4)
      ]
    };
  }
  if (bucket === "hot") {
    return {
      ...card,
      reasons: [
        "관심지역 또는 인접 생활권에서 최근 실거래가 활발했던 후보입니다.",
        "KREB 지역 흐름은 보조 안정성 근거로 함께 표시합니다.",
        ...card.reasons.filter((reason) => !reason.includes("실거래가 활발")).slice(0, 4)
      ]
    };
  }
  if (bucket === "stretch") {
    return {
      ...card,
      reasons: [
        "현재 조건보다 조금 더 준비가 필요한 확장 후보입니다.",
        ...card.reasons.filter((reason) => !reason.includes("확장 후보")).slice(0, 5)
      ]
    };
  }
  if (bucket === "explore") {
    return {
      ...card,
      reasons: ["관심지역 근처에서 비교용으로 섞은 탐험 후보입니다.", ...card.reasons.slice(0, 5)]
    };
  }
  return card;
}

function dedupeCards(cards: ComplexSignalCandidate[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    if (seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });
}
