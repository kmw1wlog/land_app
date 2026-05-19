import { Prisma } from "@prisma/client";
import { prisma } from "@/server/db";
import type { AreaBucket, FloorBand } from "@/types";
import { getAreaBucket } from "./buckets";
import { getFloorBand } from "./floorBand";
import { calculateTimeWeightedPrice, median } from "./priceEstimator";
import { calculateLiquidityScore } from "@/server/move-up/leaderComplexService";

type PropertyType = "apartment" | "officetel";

interface TxRow {
  lawdCode5: string;
  legalDongCode10: string | null;
  legalDong: string | null;
  complexName: string | null;
  buildingName: string | null;
  propertyType: string;
  dealType: string;
  floor: number | null;
  areaM2: number | null;
  dealYear: number | null;
  dealMonth: number | null;
  dealDay: number | null;
  dealAmount: number | null;
  deposit: number | null;
}

interface Grouped {
  key: string;
  lawdCode5: string;
  legalDongCode10: string | null;
  legalDong: string | null;
  region: string | null;
  complexName: string;
  propertyType: PropertyType;
  areaBucket: AreaBucket;
  floorBand: FloorBand;
  trade: Array<TxRow & { dealDate: Date }>;
  rent: Array<TxRow & { dealDate: Date }>;
}

export async function buildComplexSignalSnapshots(input: {
  lawdCodes: string[];
  propertyTypes?: PropertyType[];
  monthsBack?: number;
}): Promise<{ created: number; updated: number; skipped: number; warnings: string[] }> {
  const propertyTypes = input.propertyTypes ?? ["apartment", "officetel"];
  const latest = await latestTransactionDate(input.lawdCodes, propertyTypes);
  if (!latest) {
    return { created: 0, updated: 0, skipped: 0, warnings: ["실거래 데이터가 없어 signal snapshot을 만들 수 없습니다."] };
  }

  const from = new Date(latest);
  from.setMonth(from.getMonth() - (input.monthsBack ?? 36));
  const minYearMonth = from.getFullYear() * 100 + from.getMonth() + 1;
  const rows = (await prisma.realTransaction.findMany({
    where: {
      lawdCode5: { in: input.lawdCodes },
      propertyType: { in: propertyTypes },
      dealYear: { not: null },
      dealMonth: { not: null }
    }
  })) as unknown as TxRow[];

  const filtered = rows
    .map((row) => ({ ...row, dealDate: dealDateOf(row) }))
    .filter((row): row is TxRow & { dealDate: Date } =>
      Boolean(row.dealDate) && (row.dealYear ?? 0) * 100 + (row.dealMonth ?? 0) >= minYearMonth
    );

  const legalCodes = await prisma.legalDongCode.findMany({
    where: { lawdCode5: { in: input.lawdCodes } },
    select: { lawdCode5: true, fullName: true }
  });
  const regionByLawd = new Map(legalCodes.map((item) => [item.lawdCode5, item.fullName.split(" ").slice(0, 2).join(" ")]));
  const groups = groupTransactions(filtered, regionByLawd);
  let created = 0;
  let updated = 0;
  let skipped = 0;
  const warnings: string[] = [];

  for (const group of groups.values()) {
    const result = snapshotData(group, latest);
    if (!result.referencePrice) {
      skipped += 1;
      continue;
    }

    const existing = await prisma.complexSignalSnapshot.findUnique({
      where: {
        lawdCode5_complexName_propertyType_areaBucket_floorBand: {
          lawdCode5: group.lawdCode5,
          complexName: group.complexName,
          propertyType: group.propertyType,
          areaBucket: group.areaBucket,
          floorBand: group.floorBand
        }
      }
    });

    await prisma.complexSignalSnapshot.upsert({
      where: {
        lawdCode5_complexName_propertyType_areaBucket_floorBand: {
          lawdCode5: group.lawdCode5,
          complexName: group.complexName,
          propertyType: group.propertyType,
          areaBucket: group.areaBucket,
          floorBand: group.floorBand
        }
      },
      create: result,
      update: result
    });
    if (existing) updated += 1;
    else created += 1;
    if (result.warnings && Array.isArray(result.warnings)) warnings.push(...(result.warnings as string[]));
  }

  return { created, updated, skipped, warnings: [...new Set(warnings)].slice(0, 20) };
}

export function calculateSignalMetrics(params: {
  referencePrice: number | null;
  recentJeonseMedian: number | null;
  previousHighPrice: number | null;
  volume30d: number;
  volume90d: number;
  previous90dVolume: number;
  transactionCount12m: number;
  recentRentCount12m: number;
}) {
  const baselineMonthlyVolume = params.transactionCount12m / 12;
  const transactionHeat = params.volume30d / Math.max(baselineMonthlyVolume, 1);
  const reaccelerationScore = params.volume90d / Math.max(params.previous90dVolume, 1);
  const drawdownFromHigh =
    params.referencePrice && params.previousHighPrice
      ? ((params.referencePrice - params.previousHighPrice) / params.previousHighPrice) * 100
      : null;
  const jeonseRatio =
    params.referencePrice && params.recentJeonseMedian
      ? (params.recentJeonseMedian / params.referencePrice) * 100
      : null;
  const inventoryLikelihoodScore =
    normalize(params.volume90d, 24) * 40 +
    normalize(params.transactionCount12m, 80) * 40 +
    normalize(params.recentRentCount12m, 80) * 20;

  return {
    baselineMonthlyVolume,
    transactionHeat,
    reaccelerationScore,
    drawdownFromHigh,
    jeonseRatio,
    inventoryLikelihoodScore
  };
}

async function latestTransactionDate(lawdCodes: string[], propertyTypes: PropertyType[]) {
  const rows = await prisma.realTransaction.findMany({
    where: { lawdCode5: { in: lawdCodes }, propertyType: { in: propertyTypes }, dealYear: { not: null }, dealMonth: { not: null } },
    orderBy: [{ dealYear: "desc" }, { dealMonth: "desc" }, { dealDay: "desc" }],
    take: 1
  });
  return rows[0] ? dealDateOf(rows[0] as unknown as TxRow) : null;
}

function groupTransactions(rows: Array<TxRow & { dealDate: Date }>, regionByLawd: Map<string, string>) {
  const groups = new Map<string, Grouped>();
  for (const row of rows) {
    const propertyType = row.propertyType as PropertyType;
    if (!["apartment", "officetel"].includes(propertyType)) continue;
    const complexName = row.complexName || row.buildingName;
    if (!complexName || !row.areaM2) continue;
    const areaBucket = getAreaBucket(row.areaM2, propertyType);
    const floorBand = getFloorBand(row.floor);
    const key = [row.lawdCode5, complexName, propertyType, areaBucket, floorBand].join("|");
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        lawdCode5: row.lawdCode5,
        legalDongCode10: row.legalDongCode10,
        legalDong: row.legalDong,
        region: regionByLawd.get(row.lawdCode5) ?? row.legalDong ?? null,
        complexName,
        propertyType,
        areaBucket,
        floorBand,
        trade: [],
        rent: []
      });
    }
    const group = groups.get(key)!;
    if (row.dealType === "trade") group.trade.push(row);
    if (row.dealType === "rent") group.rent.push(row);
  }
  return groups;
}

function snapshotData(group: Grouped, latest: Date): Prisma.ComplexSignalSnapshotCreateInput {
  const priceResult = calculateTimeWeightedPrice(group.trade.map((row) => ({ price: row.dealAmount, dealDate: row.dealDate, floor: row.floor })));
  const referencePrice = priceResult.price;
  const recentMedianPrice = median(group.trade.map((row) => Number(row.dealAmount ?? 0)));
  const recentWeightedPrice = priceResult.price;
  const recentRent = group.rent.filter((row) => daysBetween(row.dealDate, latest) <= 365);
  const recentJeonseMedian = median(recentRent.map((row) => Number(row.deposit ?? 0)));
  const previousHighPrice = median([Math.max(...group.trade.map((row) => Number(row.dealAmount ?? 0)), 0)]);
  const volume30d = group.trade.filter((row) => daysBetween(row.dealDate, latest) <= 30).length;
  const volume90d = group.trade.filter((row) => daysBetween(row.dealDate, latest) <= 90).length;
  const previous90dVolume = group.trade.filter((row) => {
    const age = daysBetween(row.dealDate, latest);
    return age > 90 && age <= 180;
  }).length;
  const transactionCount12m = group.trade.filter((row) => daysBetween(row.dealDate, latest) <= 365).length;
  const availableMonths = Math.max(1, new Set(group.trade.map((row) => `${row.dealDate.getFullYear()}-${row.dealDate.getMonth()}`)).size);
  const monthlyTradeAvg = transactionCount12m / availableMonths;
  const recentRentCount12m = group.rent.filter((row) => daysBetween(row.dealDate, latest) <= 365).length;
  const metrics = calculateSignalMetrics({
    referencePrice,
    recentJeonseMedian,
    previousHighPrice,
    volume30d,
    volume90d,
    previous90dVolume,
    transactionCount12m,
    recentRentCount12m
  });
  const hotScore = Math.min(100, metrics.transactionHeat * 20 + metrics.reaccelerationScore * 15);
  const discountScore = Math.min(100, Math.max(0, Math.abs(metrics.drawdownFromHigh ?? 0) * 3));
  const jeonseScore = Math.min(100, Math.max(0, (metrics.jeonseRatio ?? 0) - 45) * 2);

  return {
    lawdCode5: group.lawdCode5,
    legalDongCode10: group.legalDongCode10,
    region: group.region,
    legalDong: group.legalDong,
    complexName: group.complexName,
    propertyType: group.propertyType,
    areaBucket: group.areaBucket,
    floorBand: group.floorBand,
    referencePrice: referencePrice ? BigInt(referencePrice) : null,
    referencePriceMethod: priceResult.method,
    recentMedianPrice: recentMedianPrice ? BigInt(recentMedianPrice) : null,
    recentWeightedPrice: recentWeightedPrice ? BigInt(recentWeightedPrice) : null,
    lowFloorPrice: group.floorBand === "low" && referencePrice ? BigInt(referencePrice) : null,
    midFloorPrice: group.floorBand === "mid" && referencePrice ? BigInt(referencePrice) : null,
    highFloorPrice: group.floorBand === "high" && referencePrice ? BigInt(referencePrice) : null,
    recentJeonseMedian: recentJeonseMedian ? BigInt(recentJeonseMedian) : null,
    previousHighPrice: previousHighPrice ? BigInt(previousHighPrice) : null,
    drawdownFromHigh: metrics.drawdownFromHigh,
    jeonseRatio: metrics.jeonseRatio,
    volume30d,
    volume90d,
    previous90dVolume,
    baselineMonthlyVolume: metrics.baselineMonthlyVolume,
    transactionHeat: metrics.transactionHeat,
    reaccelerationScore: metrics.reaccelerationScore,
    inventoryLikelihoodScore: metrics.inventoryLikelihoodScore,
    monthlyTradeAvg,
    liquidityScore: calculateLiquidityScore({ monthlyTradeAvg, volume90d }),
    sellabilityScore: calculateLiquidityScore({ monthlyTradeAvg, volume90d }),
    hotScore,
    discountScore,
    jeonseScore,
    recommendationScore: hotScore * 0.4 + discountScore * 0.3 + jeonseScore * 0.2 + metrics.inventoryLikelihoodScore * 0.1,
    latestTradeDate: latest,
    method: "real_transaction_complex_signal_v1",
    warnings: priceResult.warnings as Prisma.InputJsonValue
  };
}

function dealDateOf(row: TxRow) {
  if (!row.dealYear || !row.dealMonth) return null;
  return new Date(row.dealYear, row.dealMonth - 1, row.dealDay || 1);
}

function daysBetween(date: Date, latest: Date) {
  return Math.max(0, Math.floor((latest.getTime() - date.getTime()) / 86_400_000));
}

function normalize(value: number, max: number) {
  return Math.min(1, Math.max(0, value / max));
}
