import type { ComplexSignalCandidate, Property } from "@/types";

export function complexSignalToPropertyLike(candidate: ComplexSignalCandidate): Property {
  const referencePrice = candidate.referencePrice ?? candidate.recentMedianPrice ?? 0;
  const jeonsePrice = candidate.recentJeonseMedian ?? Math.round(referencePrice * ((candidate.jeonseRatio ?? 55) / 100));
  const area = areaBucketRepresentativeM2(candidate.areaBucket);

  return {
    id: candidate.id,
    name: `${candidate.complexName} ${areaBucketLabel(candidate.areaBucket)}`,
    address: `${candidate.region} ${candidate.legalDong ?? ""}`.trim(),
    region: candidate.region,
    lawdCode5: candidate.lawdCode5,
    legalDongCode10: candidate.legalDongCode10,
    propertyType: candidate.propertyType,
    salePrice: referencePrice,
    jeonsePrice,
    expectedMonthlyRent: candidate.propertyType === "officetel" ? Math.round(referencePrice * 0.0032) : 0,
    expectedDeposit: jeonsePrice,
    areaM2: area,
    floor: candidate.floorBand === "high" ? 18 : candidate.floorBand === "low" ? 4 : 10,
    builtYear: 2010,
    pricePerM2: area > 0 ? Math.round(referencePrice / area) : 0,
    previousHighPrice: candidate.previousHighPrice ?? referencePrice,
    drawdownFromHigh: candidate.drawdownFromHigh ?? 0,
    jeonseRatio: candidate.jeonseRatio ?? 0,
    supplyRiskScore: Math.max(25, 70 - candidate.inventoryLikelihoodScore),
    vacancyRiskScore: candidate.propertyType === "officetel" ? 48 : 30,
    growthScore: Math.round(45 + candidate.transactionHeat * 8 + candidate.reaccelerationScore * 6),
    stabilityScore: Math.round(60 + Math.max(0, candidate.jeonseRatio ?? 0) / 3),
    communityHeatScore: candidate.scores.communityHeatScore,
    isDirectListing: false,
    isPartnerListing: false,
    isAd: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function areaBucketRepresentativeM2(bucket: ComplexSignalCandidate["areaBucket"]) {
  if (bucket === "under_40") return 39;
  if (bucket === "59") return 59;
  if (bucket === "74") return 74;
  if (bucket === "84") return 84;
  if (bucket === "101") return 101;
  if (bucket === "over_101") return 120;
  if (bucket === "officetel_under_30") return 26;
  if (bucket === "officetel_30_45") return 38;
  if (bucket === "officetel_45_60") return 52;
  return 65;
}

function areaBucketLabel(bucket: ComplexSignalCandidate["areaBucket"]) {
  if (bucket.startsWith("officetel")) {
    const labels: Record<string, string> = {
      officetel_under_30: "30㎡ 미만",
      officetel_30_45: "30~45㎡",
      officetel_45_60: "45~60㎡",
      officetel_over_60: "60㎡ 초과"
    };
    return labels[bucket];
  }
  return `${bucket}㎡급`;
}
