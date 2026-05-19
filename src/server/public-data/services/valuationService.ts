import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client";

export function median(values: number[]): number | null {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[middle - 1] + sorted[middle]) / 2);
  }
  return sorted[middle];
}

export async function estimateCurrentHomeValue(params: {
  normalizedAddressId?: string;
  pnu?: string | null;
  lawdCode5: string;
  complexName?: string;
  buildingName?: string;
  areaM2?: number;
  propertyType: string;
}) {
  const warnings: string[] = [];
  const area = params.areaM2;
  const ledger = params.pnu
    ? await prisma.buildingLedger.findFirst({
        where: { pnu: params.pnu, ledgerType: "title" },
        orderBy: { updatedAt: "desc" }
      })
    : null;
  const enrichedParams = {
    ...params,
    complexName: params.complexName || ledger?.buildingName || undefined,
    buildingName: params.buildingName || ledger?.buildingName || undefined
  };
  const latestTradeMonth = await latestMonthNumber(params.lawdCode5, params.propertyType, "trade");
  const latestRentMonth = await latestMonthNumber(params.lawdCode5, params.propertyType, "rent");

  if (!latestTradeMonth) {
    warnings.push("DB에 저장된 최신 매매 거래가 없어 추정가가 비어 있습니다.");
  }
  if (!latestRentMonth) {
    warnings.push("DB에 저장된 최신 전월세 거래가 없어 전세가율이 비어 있습니다.");
  }

  const tradeSelection = latestTradeMonth
    ? await selectTradeComparables(enrichedParams, latestTradeMonth)
    : { rows: [], method: "no_trade_comparable" };
  const rentComparables = latestRentMonth
    ? await selectRentComparables(enrichedParams, latestRentMonth)
    : [];

  if (tradeSelection.method !== "tier1_same_complex_area_12m") {
    warnings.push(`매매 comparable 부족으로 ${tradeSelection.method} 기준을 사용했습니다.`);
  }

  const estimatedPrice = median(tradeSelection.rows.map((item) => Number(item.dealAmount ?? 0)));
  const previousHighPrice = Math.max(
    ...tradeSelection.rows.map((item) => Number(item.dealAmount ?? 0)).filter((value) => value > 0),
    0
  );
  const estimatedJeonsePrice = median(
    rentComparables
      .filter((item) => (item.monthlyRent ?? 0) === 0)
      .map((item) => Number(item.deposit ?? 0))
  );
  const recentTradeCount = latestTradeMonth
    ? tradeSelection.rows.filter((item) => transactionMonth(item) >= latestTradeMonth - 6).length
    : 0;

  if (!estimatedPrice) warnings.push("실거래 comparable이 부족해 추정가가 비어 있습니다.");
  if (!estimatedJeonsePrice) warnings.push("전세 comparable이 부족해 전세가율이 비어 있습니다.");

  return prisma.propertyValuationSnapshot.create({
    data: {
      normalizedAddressId: params.normalizedAddressId,
      pnu: params.pnu,
      lawdCode5: params.lawdCode5,
      propertyType: params.propertyType,
      estimatedPrice,
      estimatedJeonsePrice,
      jeonseRatio:
        estimatedPrice && estimatedJeonsePrice ? Math.round((estimatedJeonsePrice / estimatedPrice) * 1000) / 10 : null,
      drawdownFromHigh:
        estimatedPrice && previousHighPrice
          ? Math.round(((estimatedPrice - previousHighPrice) / previousHighPrice) * 1000) / 10
          : null,
      recentTradeCount,
      nearbyDiscount: null,
      method: tradeSelection.method,
      comparableIds: tradeSelection.rows.map((item) => item.id) as Prisma.InputJsonValue,
      warnings: warnings as Prisma.InputJsonValue
    }
  });
}

async function selectTradeComparables(
  params: {
    lawdCode5: string;
    complexName?: string;
    buildingName?: string;
    areaM2?: number;
    propertyType: string;
    pnu?: string | null;
  },
  latestTradeMonth: number
) {
  if (params.pnu) {
    const tier0 = await findComparables({
      ...params,
      dealType: "trade",
      sinceMonth: latestTradeMonth - 36,
      pnu: params.pnu,
      take: 80
    });
    if (tier0.length > 0) return { rows: tier0, method: "tier0_same_pnu_36m" };
  }

  const tier1 = await findComparables({
    ...params,
    dealType: "trade",
    sinceMonth: latestTradeMonth - 12,
    pnu: null,
    areaTolerance: 5,
    requireName: true,
    take: 50
  });
  if (tier1.length > 0) return { rows: tier1, method: "tier1_same_complex_area_12m" };

  const tier2 = await findComparables({
    ...params,
    dealType: "trade",
    sinceMonth: latestTradeMonth - 24,
    pnu: null,
    areaTolerance: 10,
    take: 80
  });
  if (tier2.length > 0) return { rows: tier2, method: "tier2_lawd_area_24m" };

  const tier3 = await findComparables({
    lawdCode5: params.lawdCode5,
    propertyType: params.propertyType,
    dealType: "trade",
    sinceMonth: latestTradeMonth - 36,
    take: 120
  });
  return { rows: tier3, method: "tier3_lawd_property_type_36m" };
}

async function selectRentComparables(
  params: {
    lawdCode5: string;
    complexName?: string;
    buildingName?: string;
    areaM2?: number;
    propertyType: string;
    pnu?: string | null;
  },
  latestRentMonth: number
) {
  if (params.pnu) {
    const exact = await findComparables({
      ...params,
      dealType: "rent",
      sinceMonth: latestRentMonth - 24,
      pnu: params.pnu,
      take: 50
    });
    if (exact.length > 0) return exact;
  }

  return findComparables({
    lawdCode5: params.lawdCode5,
    propertyType: params.propertyType,
    dealType: "rent",
    sinceMonth: latestRentMonth - 24,
    complexName: params.complexName,
    buildingName: params.buildingName,
    areaM2: params.areaM2,
    areaTolerance: 10,
    pnu: null,
    take: 80
  });
}

async function findComparables(params: {
  lawdCode5: string;
  propertyType: string;
  dealType: string;
  sinceMonth: number;
  pnu?: string | null;
  complexName?: string;
  buildingName?: string;
  areaM2?: number;
  areaTolerance?: number;
  requireName?: boolean;
  take: number;
}) {
  const minYear = Math.floor(params.sinceMonth / 12);
  const normalizedName = normalizeComplexName(params.complexName || params.buildingName || "");
  const areaBucket = params.areaM2 ? areaBucketOf(params.areaM2) : null;
  const rows = await prisma.realTransaction.findMany({
    where: {
      ...(params.pnu ? { pnu: params.pnu } : { lawdCode5: params.lawdCode5 }),
      propertyType: params.propertyType,
      dealType: params.dealType,
      dealYear: { gte: minYear },
      ...(params.requireName && params.complexName
        ? { complexName: { contains: params.complexName } }
        : {}),
      ...(params.requireName && !params.complexName && params.buildingName
        ? { buildingName: { contains: params.buildingName } }
        : {}),
      ...(params.areaM2 && params.areaTolerance
        ? { areaM2: { gte: params.areaM2 - params.areaTolerance, lte: params.areaM2 + params.areaTolerance } }
        : {})
    },
    orderBy: [{ dealYear: "desc" }, { dealMonth: "desc" }, { dealDay: "desc" }],
    take: params.take
  });

  return rows
    .filter((item) => transactionMonth(item) >= params.sinceMonth)
    .filter((item) => {
      if (!params.requireName || !normalizedName) return true;
      return normalizeComplexName(item.complexName || item.buildingName || "").includes(normalizedName);
    })
    .filter((item) => {
      if (!areaBucket || params.areaTolerance) return true;
      return areaBucketOf(Number(item.areaM2 ?? 0)) === areaBucket;
    })
    .sort((a, b) => correctionScore(b, params) - correctionScore(a, params));
}

async function latestMonthNumber(lawdCode5: string, propertyType: string, dealType: string) {
  const latest = await prisma.realTransaction.findFirst({
    where: { lawdCode5, propertyType, dealType },
    orderBy: [{ dealYear: "desc" }, { dealMonth: "desc" }, { dealDay: "desc" }]
  });
  if (!latest?.dealYear || !latest.dealMonth) return null;
  return latest.dealYear * 12 + latest.dealMonth;
}

function transactionMonth(item: { dealYear: number | null; dealMonth: number | null }) {
  return (item.dealYear ?? 0) * 12 + (item.dealMonth ?? 0);
}

export function normalizeComplexName(name: string) {
  return name.replace(/\s|\(|\)|아파트|오피스텔|빌라|주상복합/g, "").toLowerCase();
}

export function areaBucketOf(areaM2: number) {
  if (!Number.isFinite(areaM2) || areaM2 <= 0) return "unknown";
  return `${Math.round(areaM2 / 5) * 5}`;
}

function correctionScore(
  item: { areaM2: number | null; floor: number | null; builtYear: number | null },
  params: { areaM2?: number; propertyType: string }
) {
  const areaPenalty = params.areaM2 ? Math.abs(Number(item.areaM2 ?? 0) - params.areaM2) : 0;
  const floorBonus = params.propertyType === "apartment" ? Math.min(15, Math.max(0, Number(item.floor ?? 0))) / 100 : 0;
  const yearBonus = params.propertyType === "apartment" || params.propertyType === "officetel"
    ? Math.max(0, Number(item.builtYear ?? 0) - 1990) / 1000
    : 0;
  return 100 - areaPenalty + floorBonus + yearBonus;
}
