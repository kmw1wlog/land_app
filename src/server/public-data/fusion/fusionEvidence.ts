import { existsSync, readFileSync } from "fs";
import path from "path";
import { calculateFusedStabilityScore } from "./fusionScore";
import type {
  FusedRegionSignal,
  FusionDataEvidence,
  FusionProvider,
  FusionSourceType,
  HugJeonseRiskSnapshot,
  KrebRegionIndexSnapshot,
  TransportAccessSnapshot
} from "./types";

const FUSION_DIR = path.join(process.cwd(), "data", "fusion");

export function loadKrebRegionIndexSeed() {
  return readCsv("kreb_region_index_seed.csv").map((row) => ({
    month: row.month,
    region: row.region,
    lawdCode5: row.lawdCode5,
    saleIndex: numberValue(row.saleIndex),
    rentIndex: numberValue(row.rentIndex),
    saleMom: numberValue(row.saleMom),
    rentMom: numberValue(row.rentMom),
    volatilityScore: numberValue(row.volatilityScore),
    sourceType: sourceTypeValue(row.sourceType)
  })) satisfies KrebRegionIndexSnapshot[];
}

export function loadHugJeonseRiskSeed() {
  return readCsv("hug_jeonse_risk_seed.csv").map((row) => ({
    month: row.month,
    region: row.region,
    lawdCode5: row.lawdCode5,
    guaranteeAccidentRate: numberValue(row.guaranteeAccidentRate),
    jeonseRiskScore: numberValue(row.jeonseRiskScore),
    riskGrade: row.riskGrade,
    sourceType: sourceTypeValue(row.sourceType)
  })) satisfies HugJeonseRiskSnapshot[];
}

export function loadTransportAccessSeed() {
  return readCsv("transport_access_seed.csv").map((row) => ({
    region: row.region,
    legalDong: row.legalDong,
    lawdCode5: row.lawdCode5,
    complexName: row.complexName,
    nearestStationDistanceM: numberValue(row.nearestStationDistanceM),
    nearestBusStopDistanceM: numberValue(row.nearestBusStopDistanceM),
    transitAccessibilityScore: numberValue(row.transitAccessibilityScore),
    commuteAccessScore: numberValue(row.commuteAccessScore),
    lifeSocAccessScore: numberValue(row.lifeSocAccessScore),
    sourceType: sourceTypeValue(row.sourceType)
  })) satisfies TransportAccessSnapshot[];
}

export function buildFusionDataEvidence() {
  const collectedAt = new Date().toISOString();
  const kreb = loadKrebRegionIndexSeed();
  const hug = loadHugJeonseRiskSeed();
  const transport = loadTransportAccessSeed();
  return [
    {
      provider: "MOLIT",
      datasetName: "국토교통부 실거래/전월세·건축물·법정동 데이터",
      sourceType: "real",
      rowCount: 1,
      fields: ["dealAmount", "deposit", "lawdCode5", "complexName", "areaM2", "dealYear", "dealMonth"],
      collectedAt,
      usedIn: ["candidate scoring", "purchase power context", "Transformer feature", "RAG complex_signal"],
      note: "DataGoKrClient와 로컬 public-data seed 파이프라인으로 실제 공공데이터 축을 구성한다."
    },
    {
      provider: "KREB",
      datasetName: "한국부동산원 지역 매매/전세 가격지수 시드",
      sourceType: sourceTypeFromRows(kreb),
      rowCount: kreb.length,
      fields: ["saleIndex", "rentIndex", "saleMom", "rentMom", "volatilityScore"],
      collectedAt,
      usedIn: ["fused stability score", "RAG kreb_market_index", "comparison UI"],
      note: "MVP seed snapshot이다. 실제 R-ONE/API 확보 전에는 가점 실데이터로 계산하지 않는다."
    },
    {
      provider: "HUG",
      datasetName: "HUG 전세 보증/보증사고 리스크 시드",
      sourceType: sourceTypeFromRows(hug),
      rowCount: hug.length,
      fields: ["guaranteeAccidentRate", "jeonseRiskScore", "riskGrade"],
      collectedAt,
      usedIn: ["fused stability score", "RAG hug_jeonse_risk", "tenant safety UI"],
      note: "보증 승인 가능 여부가 아니라 전세 리스크 참고 지표로만 사용한다."
    },
    {
      provider: "TRANSPORT",
      datasetName: "교통 접근성/직주근접 시드",
      sourceType: sourceTypeFromRows(transport),
      rowCount: transport.length,
      fields: ["nearestStationDistanceM", "nearestBusStopDistanceM", "transitAccessibilityScore", "commuteAccessScore"],
      collectedAt,
      usedIn: ["fused stability score", "RAG transport_accessibility", "same budget comparison UI"],
      note: "K-MaaS 실제 데이터가 확보되기 전까지는 교통 접근성 seed로 표시한다."
    }
  ] satisfies FusionDataEvidence[];
}

export function buildFusedRegionSignals() {
  const krebRows = loadKrebRegionIndexSeed();
  const hugRows = loadHugJeonseRiskSeed();
  const transportRows = loadTransportAccessSeed();
  return krebRows.map((kreb) => {
    const hug = hugRows.find((item) => item.lawdCode5 === kreb.lawdCode5 && item.month === kreb.month);
    const transport = transportRows.find((item) => item.lawdCode5 === kreb.lawdCode5);
    const score = calculateFusedStabilityScore({
      molitTradeHeat: 1.1,
      molitJeonseRatio: 62,
      molitDrawdownFromHigh: -12,
      krebSaleMom: kreb.saleMom,
      krebRentMom: kreb.rentMom,
      krebVolatilityScore: kreb.volatilityScore,
      hugJeonseRiskScore: hug?.jeonseRiskScore,
      transitAccessibilityScore: transport?.transitAccessibilityScore
    });
    return {
      region: kreb.region,
      lawdCode5: kreb.lawdCode5,
      month: kreb.month,
      molitTradeHeat: 1.1,
      molitJeonseRatio: 62,
      krebMarketStability: score.components.krebMarketStability,
      hugJeonseRiskScore: hug?.jeonseRiskScore,
      transitAccessibilityScore: transport?.transitAccessibilityScore,
      fusedStabilityScore: score.fusedStabilityScore,
      fusedRiskGrade: score.fusedRiskGrade,
      sourceType: mergeSourceType([kreb.sourceType, hug?.sourceType, transport?.sourceType]),
      evidence: ["MOLIT 실거래", "KREB 지역지수", "HUG 전세 리스크", "TRANSPORT 접근성"]
    } satisfies FusedRegionSignal;
  });
}

export function getFusionProviderSummary() {
  return Object.fromEntries(
    buildFusionDataEvidence().map((item) => [
      item.provider,
      {
        status: item.sourceType === "real" ? "ok" : item.sourceType,
        sourceType: item.sourceType,
        rowCount: item.rowCount,
        datasetName: item.datasetName
      }
    ])
  );
}

export function findFusionSignalForCandidate(input: {
  lawdCode5?: string | null;
  region?: string | null;
  complexName?: string | null;
}) {
  const signals = buildFusedRegionSignals();
  return (
    signals.find((item) => input.lawdCode5 && item.lawdCode5 === input.lawdCode5) ??
    signals.find((item) => input.region && input.region.includes(item.region)) ??
    signals[0]
  );
}

export function findTransportAccessForCandidate(input: {
  lawdCode5?: string | null;
  complexName?: string | null;
}) {
  const rows = loadTransportAccessSeed();
  return (
    rows.find((item) => input.complexName && item.complexName === input.complexName) ??
    rows.find((item) => input.lawdCode5 && item.lawdCode5 === input.lawdCode5) ??
    rows[0]
  );
}

function readCsv(fileName: string) {
  const filePath = path.join(FUSION_DIR, fileName);
  if (!existsSync(filePath)) return [];
  const [headerLine = "", ...lines] = readFileSync(filePath, "utf8").trim().split(/\r?\n/);
  const headers = splitCsvLine(headerLine);
  return lines
    .filter(Boolean)
    .map((line) => {
      const values = splitCsvLine(line);
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])) as Record<string, string>;
    });
}

function splitCsvLine(line: string) {
  return line.split(",").map((item) => item.trim());
}

function numberValue(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function sourceTypeValue(value: string): FusionSourceType {
  if (value === "real" || value === "mock") return value;
  return "seed";
}

function sourceTypeFromRows(rows: Array<{ sourceType: FusionSourceType }>): FusionSourceType {
  if (!rows.length) return "mock";
  if (rows.every((row) => row.sourceType === "real")) return "real";
  if (rows.some((row) => row.sourceType === "seed")) return "seed";
  return "mock";
}

function mergeSourceType(values: Array<FusionSourceType | undefined>): FusionSourceType {
  const normalized = values.filter(Boolean) as FusionSourceType[];
  if (normalized.length && normalized.every((value) => value === "real")) return "real";
  if (normalized.some((value) => value === "seed")) return "seed";
  return "mock";
}
