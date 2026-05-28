import { existsSync, readFileSync } from "fs";
import path from "path";

type ArtifactFeatureRow = {
  complexId: string;
  month: string;
  lawdCode5: string;
  propertyType: string;
  areaBucket: string;
  medianPrice: number;
  weightedPrice: number;
  tradeCount: number;
  rentCount: number;
  jeonseMedian: number;
  jeonseRatio: number;
  drawdownFromHigh: number;
  transactionHeat: number;
  tradeCount3m: number;
  tradeCount6m: number;
  reaccelerationScore: number;
  liquidityScore: number;
  leaderScore: number;
  regionWeightedPrice: number;
  regionTradeCount: number;
  medianBuiltYear: number;
};

const FEATURE_PATH = path.join(process.cwd(), "artifacts", "complex_monthly_features.csv");

export function loadArtifactComplexSignalSnapshots(input: {
  lawdCodes: string[];
  propertyTypes: string[];
  regionLabelsByLawdCode: Record<string, string>;
  limit?: number;
}) {
  const rows = readArtifactFeatureRows()
    .filter((row) => input.lawdCodes.includes(row.lawdCode5))
    .filter((row) => input.propertyTypes.includes(row.propertyType))
    .filter((row) => row.medianPrice > 0 || row.weightedPrice > 0);
  const byComplex = new Map<string, ArtifactFeatureRow[]>();
  for (const row of rows) {
    byComplex.set(row.complexId, [...(byComplex.get(row.complexId) ?? []), row]);
  }

  return [...byComplex.values()]
    .map((items) => toSnapshot(items, input.regionLabelsByLawdCode))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => (b.recommendationScore ?? 0) - (a.recommendationScore ?? 0) || b.volume90d - a.volume90d)
    .slice(0, input.limit ?? 80);
}

function toSnapshot(items: ArtifactFeatureRow[], regionLabelsByLawdCode: Record<string, string>) {
  const sorted = items.slice().sort((a, b) => b.month.localeCompare(a.month));
  const latest = sorted[0];
  if (!latest) return null;
  const price = latest.weightedPrice || latest.medianPrice;
  if (!price) return null;
  const previousHigh = Math.max(...items.map((item) => item.weightedPrice || item.medianPrice).filter(Boolean), price);
  const jeonseRatio = latest.jeonseRatio || (latest.jeonseMedian ? (latest.jeonseMedian / price) * 100 : 0);
  const transactionHeat = latest.transactionHeat || latest.tradeCount3m / Math.max(1, latest.regionTradeCount / 12);
  const reaccelerationScore = latest.reaccelerationScore || transactionHeat;
  const recommendationScore = Math.round(
    Math.min(100, transactionHeat * 24) * 0.35 +
      Math.min(100, latest.liquidityScore || latest.tradeCount3m * 8) * 0.25 +
      Math.min(100, latest.leaderScore || 50) * 0.2 +
      Math.max(0, 100 - Math.abs(latest.drawdownFromHigh || 0) * 2) * 0.1 +
      Math.min(100, reaccelerationScore * 24) * 0.1
  );
  const [, complexName] = latest.complexId.split("|");
  const now = new Date();
  return {
    id: `artifact-signal-${latest.complexId}`,
    lawdCode5: latest.lawdCode5,
    legalDongCode10: null,
    region: regionLabelsByLawdCode[latest.lawdCode5] ?? latest.lawdCode5,
    legalDong: null,
    complexName: complexName || latest.complexId,
    propertyType: latest.propertyType,
    areaBucket: latest.areaBucket,
    floorBand: "unknown",
    referencePrice: BigInt(Math.round(price)),
    referencePriceMethod: "time_weighted_median",
    recentMedianPrice: BigInt(Math.round(latest.medianPrice || price)),
    recentWeightedPrice: BigInt(Math.round(price)),
    lowFloorPrice: null,
    midFloorPrice: BigInt(Math.round(price)),
    highFloorPrice: null,
    recentJeonseMedian: latest.jeonseMedian ? BigInt(Math.round(latest.jeonseMedian)) : null,
    previousHighPrice: BigInt(Math.round(previousHigh)),
    drawdownFromHigh: latest.drawdownFromHigh || Math.round((price / previousHigh - 1) * 1000) / 10,
    jeonseRatio,
    volume30d: Math.round(latest.tradeCount),
    volume90d: Math.round(latest.tradeCount3m || latest.tradeCount),
    previous90dVolume: Math.max(0, Math.round((latest.tradeCount6m || 0) - (latest.tradeCount3m || 0))),
    baselineMonthlyVolume: Math.max(1, (latest.tradeCount6m || latest.tradeCount3m || 1) / 6),
    transactionHeat,
    reaccelerationScore,
    inventoryLikelihoodScore: Math.min(100, 35 + Math.max(0, latest.tradeCount3m) * 4 + Math.max(0, latest.rentCount) * 2),
    householdCount: null,
    monthlyTradeAvg: Math.max(latest.tradeCount3m / 3, latest.tradeCount),
    liquidityScore: latest.liquidityScore || null,
    leaderScore: latest.leaderScore || null,
    sellabilityScore: Math.round((latest.liquidityScore || 50) * 0.7 + (latest.leaderScore || 50) * 0.3),
    hotScore: Math.min(100, transactionHeat * 25),
    discountScore: Math.min(100, Math.abs(latest.drawdownFromHigh || 0) * 3),
    jeonseScore: Math.min(100, Math.max(0, jeonseRatio - 45) * 2),
    recommendationScore,
    latestTradeDate: new Date(`${latest.month}-01T00:00:00.000Z`),
    method: "artifact_molit_transaction_features",
    warnings: ["DB signal snapshot이 비어 있어 artifacts/complex_monthly_features.csv의 국토부 실거래-derived feature를 사용했습니다."],
    createdAt: now,
    updatedAt: now
  };
}

function readArtifactFeatureRows(): ArtifactFeatureRow[] {
  if (!existsSync(FEATURE_PATH)) return [];
  const [headerLine, ...lines] = readFileSync(FEATURE_PATH, "utf8").trim().split(/\r?\n/);
  if (!headerLine) return [];
  const headers = parseCsvLine(headerLine);
  return lines
    .filter(Boolean)
    .map((line) => {
      const values = parseCsvLine(line);
      return rowFromCsv(Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
    });
}

function rowFromCsv(row: Record<string, string>): ArtifactFeatureRow {
  return {
    complexId: row.complex_id ?? "",
    month: row.month ?? "",
    lawdCode5: row.lawd_code5 ?? "",
    propertyType: row.property_type ?? "",
    areaBucket: row.area_bucket ?? "84",
    medianPrice: numberValue(row.median_price),
    weightedPrice: numberValue(row.weighted_price),
    tradeCount: numberValue(row.trade_count),
    rentCount: numberValue(row.rent_count),
    jeonseMedian: numberValue(row.jeonse_median),
    jeonseRatio: numberValue(row.jeonse_ratio),
    drawdownFromHigh: numberValue(row.drawdown_from_high),
    transactionHeat: numberValue(row.transaction_heat),
    tradeCount3m: numberValue(row.trade_count_3m),
    tradeCount6m: numberValue(row.trade_count_6m),
    reaccelerationScore: numberValue(row.reacceleration_score),
    liquidityScore: numberValue(row.liquidity_score),
    leaderScore: numberValue(row.leader_score),
    regionWeightedPrice: numberValue(row.region_weighted_price),
    regionTradeCount: numberValue(row.region_trade_count),
    medianBuiltYear: numberValue(row.median_built_year)
  };
}

function parseCsvLine(line: string) {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      out.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  out.push(current);
  return out;
}

function numberValue(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
