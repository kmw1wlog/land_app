import { NextRequest, NextResponse } from "next/server";
import { sampleHomes, sampleProfiles } from "@/data/dummy";
import { prisma } from "@/server/db";
import { expandPreferredRegions } from "@/server/regions/regionExpansionService";
import { scoreComplexCandidate } from "@/server/signals/complexRecommendationService";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const candidateId = body.candidateId;
  const priceBandPercent = Number(body.priceBandPercent ?? 10);
  const limit = Number(body.limit ?? 12);
  const baseSnapshot = candidateId
    ? await prisma.complexSignalSnapshot.findUnique({ where: { id: candidateId } })
    : await prisma.complexSignalSnapshot.findFirst({ orderBy: { recommendationScore: "desc" } });

  if (!baseSnapshot?.referencePrice) {
    return NextResponse.json({ error: "base candidate not found" }, { status: 404 });
  }

  const basePrice = Number(baseSnapshot.referencePrice);
  const min = basePrice * (1 - priceBandPercent / 100);
  const max = basePrice * (1 + priceBandPercent / 100);
  const regions = expandPreferredRegions({
    preferredRegions: body.preferredRegions ?? sampleProfiles[0].preferredRegions,
    currentHomeRegion: body.currentHome?.region ?? sampleHomes[0].region,
    maxRegions: 6
  });
  const lawdCodes = regions.map((region) => region.lawdCode5);
  const snapshots = await prisma.complexSignalSnapshot.findMany({
    where: {
      lawdCode5: { in: lawdCodes },
      propertyType: baseSnapshot.propertyType,
      referencePrice: { gte: BigInt(Math.round(min)), lte: BigInt(Math.round(max)) },
      id: { not: baseSnapshot.id }
    },
    orderBy: [{ transactionHeat: "desc" }, { recommendationScore: "desc" }],
    take: limit * 2
  });
  const profile = body.profile ?? sampleProfiles[0];
  const currentHome = body.currentHome ?? sampleHomes[0];
  const peerPrices = snapshots.map((item) => Number(item.referencePrice ?? 0)).filter(Boolean);
  const peerVolume90d = snapshots.map((item) => item.volume90d);
  const base = await scoreComplexCandidate({
    snapshot: baseSnapshot,
    userProfile: profile,
    currentHome,
    expandedRegion: regions.find((region) => region.lawdCode5 === baseSnapshot.lawdCode5),
    peerPrices,
    peerVolume90d
  });
  const comparables = await Promise.all(
    snapshots.slice(0, limit).map(async (snapshot) => {
      const candidate = await scoreComplexCandidate({
        snapshot,
        userProfile: profile,
        currentHome,
        expandedRegion: regions.find((region) => region.lawdCode5 === snapshot.lawdCode5),
        peerPrices,
        peerVolume90d
      });
      return {
        candidate,
        comparisonScore: Math.round(
          candidate.scores.recommendationScore * 0.45 +
            (candidate.moveUp?.leaderScore ?? 0) * 0.25 +
            (candidate.moveUp?.liquidityScore ?? 0) * 0.2 +
            Math.max(0, 100 - Math.abs((candidate.referencePrice ?? 0) - basePrice) / 5_000_000) * 0.1
        ),
        betterPoints: betterPoints(base, candidate),
        worsePoints: worsePoints(base, candidate)
      };
    })
  );

  return NextResponse.json({
    base,
    comparables: comparables.sort((a, b) => b.comparisonScore - a.comparisonScore).slice(0, limit)
  });
}

function betterPoints(base: Awaited<ReturnType<typeof scoreComplexCandidate>>, candidate: Awaited<ReturnType<typeof scoreComplexCandidate>>) {
  const points: string[] = [];
  if ((candidate.moveUp?.leaderScore ?? 0) > (base.moveUp?.leaderScore ?? 0)) points.push("지역 대장성이 더 높습니다.");
  if (candidate.volume90d > base.volume90d) points.push("최근 90일 거래량이 더 많습니다.");
  if ((candidate.jeonseRatio ?? 0) > (base.jeonseRatio ?? 0)) points.push("전세가율이 더 높습니다.");
  return points.length ? points : ["가격대가 유사해 대체 후보로 비교할 만합니다."];
}

function worsePoints(base: Awaited<ReturnType<typeof scoreComplexCandidate>>, candidate: Awaited<ReturnType<typeof scoreComplexCandidate>>) {
  const points: string[] = [];
  if ((candidate.userFit.monthlyBurdenDelta ?? 0) > (base.userFit.monthlyBurdenDelta ?? 0)) points.push("월 부담이 더 큽니다.");
  if ((candidate.moveUp?.liquidityScore ?? 0) < (base.moveUp?.liquidityScore ?? 0)) points.push("유동성 점수가 낮습니다.");
  if ((candidate.drawdownFromHigh ?? 0) > (base.drawdownFromHigh ?? 0)) points.push("전고점 대비 할인 폭이 작습니다.");
  return points.length ? points : ["뚜렷한 열위 항목은 아직 데이터로 확인되지 않았습니다."];
}
