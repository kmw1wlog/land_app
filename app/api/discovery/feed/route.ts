import { NextRequest, NextResponse } from "next/server";
import { properties as dummyProperties, sampleHomes, sampleProfiles } from "@/data/dummy";
import { complexSignalToPropertyLike } from "@/lib/candidateAdapter";
import { prisma } from "@/server/db";
import { expandPreferredRegions } from "@/server/regions/regionExpansionService";
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

  let snapshots = await prisma.complexSignalSnapshot.findMany({
    where: { lawdCode5: { in: lawdCodes }, propertyType: { in: propertyTypes } },
    orderBy: [{ recommendationScore: "desc" }, { transactionHeat: "desc" }],
    take: Math.max(input.limit ?? 30, 30) * 2
  });

  if (snapshots.length === 0) {
    const rebuild = await buildComplexSignalSnapshots({ lawdCodes, propertyTypes, monthsBack: 36 });
    warnings.push(...rebuild.warnings);
    snapshots = await prisma.complexSignalSnapshot.findMany({
      where: { lawdCode5: { in: lawdCodes }, propertyType: { in: propertyTypes } },
      orderBy: [{ recommendationScore: "desc" }, { transactionHeat: "desc" }],
      take: Math.max(input.limit ?? 30, 30) * 2
    });
  }

  let fallbackUsed = false;
  let cards: ComplexSignalCandidate[] = [];
  if (snapshots.length > 0) {
    const dreamSnapshots = await prisma.complexSignalSnapshot.findMany({
      where: {
        propertyType: { in: propertyTypes },
        referencePrice: { not: null },
        id: { notIn: snapshots.map((snapshot) => snapshot.id) }
      },
      orderBy: [{ referencePrice: "desc" }, { transactionHeat: "desc" }],
      take: Math.max(10, Math.ceil((input.limit ?? 30) * 0.4))
    });
    const mergedSnapshots = aggregateFloorBandSnapshots([...snapshots, ...dreamSnapshots]);
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

  const sorted = mixDiscoveryCards(cards, input.limit ?? 30);
  return NextResponse.json({
    source: "complex_signal",
    regions,
    cards: sorted,
    properties: sorted.map(complexSignalToPropertyLike),
    fallbackUsed,
    warnings
  });
}

type SnapshotRow = Awaited<ReturnType<typeof prisma.complexSignalSnapshot.findMany>>[number];

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

function mixDiscoveryCards(cards: ComplexSignalCandidate[], limit: number) {
  const unique = dedupeCards(cards);
  const realistic = unique
    .filter((card) => card.userFit.possibleNow || card.userFit.possibleAfterSellingCurrentHome || (card.userFit.yearsToReach !== null && card.userFit.yearsToReach <= 10))
    .sort((a, b) => b.scores.recommendationScore - a.scores.recommendationScore);
  const dream = unique
    .filter((card) => !card.userFit.possibleAfterSellingCurrentHome && (card.userFit.yearsToReach === null || card.userFit.yearsToReach > 10))
    .sort((a, b) => (b.referencePrice ?? 0) - (a.referencePrice ?? 0) || b.transactionHeat - a.transactionHeat);
  const explore = unique
    .filter((card) => !realistic.includes(card) && !dream.includes(card))
    .sort((a, b) => b.transactionHeat - a.transactionHeat);

  const result: ComplexSignalCandidate[] = [];
  const pattern = ["realistic", "realistic", "realistic", "realistic", "realistic", "realistic", "realistic", "dream", "dream", "explore"];
  const pools = { realistic, dream: dream.length ? dream : unique.slice().sort((a, b) => (b.referencePrice ?? 0) - (a.referencePrice ?? 0)), explore: explore.length ? explore : unique };
  const cursors = { realistic: 0, dream: 0, explore: 0 };

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

function withDiscoveryMixReason(card: ComplexSignalCandidate, bucket: "realistic" | "dream" | "explore") {
  if (bucket === "dream") {
    return {
      ...card,
      cardType: "community_hot" as const,
      reasons: [
        "지금 수준에서는 상상/장기 목표에 가까운 가격대입니다.",
        ...card.reasons.filter((reason) => !reason.includes("상상/장기 목표")).slice(0, 5)
      ]
    };
  }
  if (bucket === "explore") {
    return {
      ...card,
      reasons: ["관심지역 바깥의 탐험 후보로 섞었습니다.", ...card.reasons.slice(0, 5)]
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
