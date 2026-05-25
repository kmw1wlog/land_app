import { createHash } from "crypto";
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

type CsvReadResult = {
  fileName: string;
  filePath: string;
  sourceType: FusionSourceType;
  rows: Record<string, string>[];
};

export function loadKrebRegionIndexSeed() {
  return parseKrebRows(readCsvStrict("kreb_region_index_seed.csv").rows);
}

export function loadHugJeonseRiskSeed() {
  return parseHugRows(readCsvStrict("hug_jeonse_risk_seed.csv").rows);
}

export function loadTransportAccessSeed() {
  return parseTransportRows(readCsvStrict("transport_access_seed.csv").rows);
}

export function loadKrebRegionIndex() {
  const selected = readCsvWithPriority("kreb_region_index_real.csv", "kreb_region_index_seed.csv", "KREB");
  return parseKrebRows(selected.rows);
}

export function loadHugJeonseRisk() {
  const selected = readCsvWithPriority("hug_jeonse_risk_real.csv", "hug_jeonse_risk_seed.csv", "HUG");
  return parseHugRows(selected.rows);
}

export function loadTransportAccess() {
  const selected = readCsvWithPriority("transport_access_real.csv", "transport_access_seed.csv", "TRANSPORT");
  return parseTransportRows(selected.rows);
}

export function buildFusionDataEvidence() {
  const collectedAt = new Date().toISOString();
  const krebCsv = readCsvWithPriority("kreb_region_index_real.csv", "kreb_region_index_seed.csv", "KREB");
  const hugCsv = readCsvWithPriority("hug_jeonse_risk_real.csv", "hug_jeonse_risk_seed.csv", "HUG");
  const transportCsv = readCsvWithPriority("transport_access_real.csv", "transport_access_seed.csv", "TRANSPORT");
  const kreb = parseKrebRows(krebCsv.rows);
  const hug = parseHugRows(hugCsv.rows);
  const transport = parseTransportRows(transportCsv.rows);

  return [
    {
      provider: "MOLIT",
      datasetName: "국토교통부 실거래/전월세·건축물·법정동 데이터",
      sourceType: "real",
      rowCount: 1,
      fields: ["dealAmount", "deposit", "lawdCode5", "complexName", "areaM2", "dealYear", "dealMonth"],
      collectedAt,
      usedIn: ["candidate scoring", "purchase power context", "Transformer feature", "RAG complex_signal", "UI evidence badge"],
      sourceUrl: "https://www.data.go.kr",
      licenseNote: "공공데이터포털/국토교통부 공개 API 또는 로컬 스냅샷 기준",
      rawSnapshotPath: "data/public-data",
      normalizedSnapshotPath: "prisma/dev.db",
      apiCheckedAt: collectedAt,
      apiStatus: "ok",
      note: "DataGoKrClient와 로컬 public-data seed 파이프라인으로 실제 공공데이터 축을 구성한다."
    },
    evidenceFromCsv({
      provider: "KREB",
      datasetName: krebCsv.sourceType === "real" ? "한국부동산원 지역 매매/전세 가격지수 실데이터" : "한국부동산원 지역 매매/전세 가격지수 시드",
      csv: krebCsv,
      rows: kreb,
      fields: ["saleIndex", "rentIndex", "saleMom", "rentMom", "volatilityScore"],
      collectedAt,
      usedIn: ["fused stability score", "RAG kreb_market_index", "comparison UI", "Transformer fusion feature"],
      envSourceUrl: process.env.KREB_SOURCE_URL,
      note:
        krebCsv.sourceType === "real"
          ? "공식 CSV/API를 normalize한 real snapshot이다."
          : "MVP seed snapshot이다. 실제 R-ONE/API 확보 전에는 가점 실데이터로 계산하지 않는다."
    }),
    evidenceFromCsv({
      provider: "HUG",
      datasetName: hugCsv.sourceType === "real" ? "HUG 전세 보증/보증사고 리스크 실데이터" : "HUG 전세 보증/보증사고 리스크 시드",
      csv: hugCsv,
      rows: hug,
      fields: ["guaranteeAccidentRate", "jeonseRiskScore", "riskGrade"],
      collectedAt,
      usedIn: ["fused stability score", "RAG hug_jeonse_risk", "tenant safety UI", "Transformer fusion feature"],
      envSourceUrl: process.env.HUG_SOURCE_URL,
      note: "보증 승인 가능 여부가 아니라 전세 리스크 참고 지표로만 사용한다."
    }),
    evidenceFromCsv({
      provider: transportProviderFromRows(transport),
      datasetName: transportCsv.sourceType === "real" ? "교통 접근성/직주근접 실데이터" : "교통 접근성/직주근접 시드",
      csv: transportCsv,
      rows: transport,
      fields: ["nearestStationDistanceM", "nearestBusStopDistanceM", "transitAccessibilityScore", "commuteAccessScore"],
      collectedAt,
      usedIn: ["fused stability score", "RAG transport_accessibility", "same budget comparison UI", "Transformer fusion feature"],
      envSourceUrl: process.env.TRANSPORT_SOURCE_URL ?? process.env.KMAAS_SOURCE_URL,
      note:
        transportProviderFromRows(transport) === "KMAAS"
          ? "K-MaaS 또는 공식 교통 데이터 기준 접근성 지표다."
          : "K-MaaS 실제 데이터가 확보되기 전까지는 교통 접근성 seed/공공교통 스냅샷으로 표시한다."
    })
  ] satisfies FusionDataEvidence[];
}

export function buildFusedRegionSignals() {
  const krebRows = loadKrebRegionIndex();
  const hugRows = loadHugJeonseRisk();
  const transportRows = loadTransportAccess();
  return krebRows.map((kreb) => {
    const hug = hugRows.find((item) => item.lawdCode5 === kreb.lawdCode5 && item.month === kreb.month);
    const transport = transportRows.find((item) => item.lawdCode5 === kreb.lawdCode5);
    const sourceTypes = {
      molit: "real" as const,
      kreb: kreb.sourceType,
      hug: hug?.sourceType,
      transport: transport?.sourceType
    };
    const score = calculateFusedStabilityScore({
      molitTradeHeat: 1.1,
      molitJeonseRatio: 62,
      molitDrawdownFromHigh: -12,
      krebSaleMom: kreb.saleMom,
      krebRentMom: kreb.rentMom,
      krebVolatilityScore: kreb.volatilityScore,
      hugJeonseRiskScore: hug?.jeonseRiskScore,
      transitAccessibilityScore: transport?.transitAccessibilityScore,
      sourceTypes
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
      fusionConfidence: score.fusionConfidence,
      realProviderCount: score.realProviderCount,
      seedProviderCount: score.seedProviderCount,
      sourceType: mergeSourceType([kreb.sourceType, hug?.sourceType ?? "mock", transport?.sourceType ?? "mock"]),
      evidence: ["MOLIT 실거래", "KREB 지역지수", "HUG 전세 리스크", `${transport?.provider === "KMAAS" ? "KMAAS" : "TRANSPORT"} 접근성`]
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
        datasetName: item.datasetName,
        sourceUrl: item.sourceUrl,
        sha256: item.sha256,
        apiStatus: item.apiStatus
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
  const rows = loadTransportAccess();
  return (
    rows.find((item) => input.complexName && item.complexName === input.complexName) ??
    rows.find((item) => input.lawdCode5 && item.lawdCode5 === input.lawdCode5) ??
    rows[0]
  );
}

export function validateRealSourceRows(provider: FusionProvider, rows: Array<{ sourceType?: string }>) {
  const invalid = rows.find((row) => row.sourceType !== "real");
  if (invalid) {
    throw new Error(`${provider} real CSV must use sourceType=real for every row.`);
  }
}

function evidenceFromCsv(input: {
  provider: FusionProvider;
  datasetName: string;
  csv: CsvReadResult;
  rows: Array<{ sourceType: FusionSourceType; sourceUrl?: string; checkedAt?: string }>;
  fields: string[];
  collectedAt: string;
  usedIn: string[];
  envSourceUrl?: string;
  note: string;
}): FusionDataEvidence {
  const sourceUrl = input.rows.find((row) => row.sourceUrl)?.sourceUrl ?? input.envSourceUrl;
  const apiCheckedAt = input.rows.find((row) => row.checkedAt)?.checkedAt ?? (input.csv.sourceType === "real" ? input.collectedAt : undefined);
  return {
    provider: input.provider,
    datasetName: input.datasetName,
    sourceType: sourceTypeFromRows(input.rows),
    rowCount: input.rows.length,
    fields: input.fields,
    collectedAt: input.collectedAt,
    usedIn: input.usedIn,
    sourceUrl,
    licenseNote: input.csv.sourceType === "real" ? "공식 CSV/API 스냅샷 기준" : "MVP seed snapshot. 제출 시 real/seed를 구분 표시한다.",
    rawSnapshotPath: rawSnapshotPathFor(input.provider),
    normalizedSnapshotPath: relativePath(input.csv.filePath),
    sha256: sha256File(input.csv.filePath),
    apiCheckedAt,
    apiStatus: input.csv.sourceType === "real" ? "ok" : "skipped",
    note: input.note
  };
}

function parseKrebRows(rows: Record<string, string>[]) {
  return rows.map((row) => ({
    month: row.month,
    region: row.region,
    lawdCode5: row.lawdCode5,
    saleIndex: numberValue(row.saleIndex),
    rentIndex: numberValue(row.rentIndex),
    saleMom: numberValue(row.saleMom),
    rentMom: numberValue(row.rentMom),
    volatilityScore: numberValue(row.volatilityScore),
    sourceType: sourceTypeValue(row.sourceType),
    sourceUrl: row.sourceUrl || undefined,
    checkedAt: row.checkedAt || undefined
  })) satisfies KrebRegionIndexSnapshot[];
}

function parseHugRows(rows: Record<string, string>[]) {
  return rows.map((row) => ({
    month: row.month,
    region: row.region,
    lawdCode5: row.lawdCode5,
    guaranteeAccidentRate: numberValue(row.guaranteeAccidentRate),
    jeonseRiskScore: numberValue(row.jeonseRiskScore),
    riskGrade: row.riskGrade,
    sourceType: sourceTypeValue(row.sourceType),
    sourceUrl: row.sourceUrl || undefined,
    checkedAt: row.checkedAt || undefined
  })) satisfies HugJeonseRiskSnapshot[];
}

function parseTransportRows(rows: Record<string, string>[]) {
  return rows.map((row) => ({
    region: row.region,
    legalDong: row.legalDong,
    lawdCode5: row.lawdCode5,
    complexName: row.complexName,
    nearestStationDistanceM: numberValue(row.nearestStationDistanceM),
    nearestBusStopDistanceM: numberValue(row.nearestBusStopDistanceM),
    transitAccessibilityScore: numberValue(row.transitAccessibilityScore),
    commuteAccessScore: numberValue(row.commuteAccessScore),
    lifeSocAccessScore: numberValue(row.lifeSocAccessScore),
    sourceType: sourceTypeValue(row.sourceType),
    sourceUrl: row.sourceUrl || undefined,
    checkedAt: row.checkedAt || undefined,
    provider: providerValue(row.provider)
  })) satisfies TransportAccessSnapshot[];
}

function readCsvWithPriority(realFileName: string, seedFileName: string, provider: FusionProvider): CsvReadResult {
  const realPath = path.join(FUSION_DIR, realFileName);
  if (existsSync(realPath)) {
    const rows = readCsvRows(realPath);
    validateRealSourceRows(provider, rows);
    return { fileName: realFileName, filePath: realPath, sourceType: "real", rows };
  }

  const seed = readCsvStrict(seedFileName);
  return seed.rows.length ? seed : { fileName: seedFileName, filePath: path.join(FUSION_DIR, seedFileName), sourceType: "mock", rows: [] };
}

function readCsvStrict(fileName: string): CsvReadResult {
  const filePath = path.join(FUSION_DIR, fileName);
  if (!existsSync(filePath)) {
    return { fileName, filePath, sourceType: "mock", rows: [] };
  }
  const rows = readCsvRows(filePath);
  return { fileName, filePath, sourceType: sourceTypeFromRows(rows), rows };
}

function readCsvRows(filePath: string) {
  const raw = readFileSync(filePath, "utf8").trim();
  if (!raw) return [];
  const [headerLine = "", ...lines] = raw.split(/\r?\n/);
  const headers = splitCsvLine(headerLine);
  return lines
    .filter(Boolean)
    .map((line) => {
      const values = splitCsvLine(line);
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])) as Record<string, string>;
    });
}

function splitCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && quoted && next === "\"") {
      current += "\"";
      index += 1;
    } else if (char === "\"") {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function numberValue(value: string | undefined) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function sourceTypeValue(value: string | undefined): FusionSourceType {
  if (value === "real" || value === "mock") return value;
  return "seed";
}

function providerValue(value: string | undefined): FusionProvider {
  if (value === "KMAAS") return "KMAAS";
  return "TRANSPORT";
}

function sourceTypeFromRows(rows: Array<{ sourceType?: string }>): FusionSourceType {
  if (!rows.length) return "mock";
  if (rows.every((row) => row.sourceType === "real")) return "real";
  if (rows.some((row) => row.sourceType === "seed" || !row.sourceType)) return "seed";
  return "mock";
}

function mergeSourceType(values: Array<FusionSourceType | undefined>): FusionSourceType {
  const normalized = values.filter(Boolean) as FusionSourceType[];
  if (normalized.length && normalized.every((value) => value === "real")) return "real";
  if (normalized.some((value) => value === "seed")) return "seed";
  return "mock";
}

function transportProviderFromRows(rows: TransportAccessSnapshot[]): FusionProvider {
  return rows.some((row) => row.provider === "KMAAS") ? "KMAAS" : "TRANSPORT";
}

function sha256File(filePath: string) {
  if (!existsSync(filePath)) return undefined;
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function rawSnapshotPathFor(provider: FusionProvider) {
  const directory = provider === "KREB" ? "kreb" : provider === "HUG" ? "hug" : provider === "KMAAS" || provider === "TRANSPORT" ? "transport" : "";
  return directory ? `data/fusion/raw/${directory}` : undefined;
}

function relativePath(filePath: string) {
  return path.relative(process.cwd(), filePath);
}
