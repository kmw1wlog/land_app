import { prisma } from "@/server/db";
import {
  buildFusionDataEvidence,
  buildFusedRegionSignals,
  loadHugJeonseRisk,
  loadKrebRegionIndex,
  loadTransportAccess
} from "@/server/public-data/fusion/fusionEvidence";

async function main() {
  await ensureTables();
  await clearTables();
  const evidence = buildFusionDataEvidence();
  const kreb = loadKrebRegionIndex();
  const hug = loadHugJeonseRisk();
  const transport = loadTransportAccess();
  const fused = buildFusedRegionSignals();

  for (const item of evidence) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO FusionDataSource (id, provider, datasetName, sourceUrl, licenseNote, isRealData, isSeedData, collectedAt, rowCount, fieldSummaryJson, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      `fusion-source:${item.provider}`,
      item.provider,
      item.datasetName,
      null,
      item.note ?? null,
      item.sourceType === "real" ? 1 : 0,
      item.sourceType !== "real" ? 1 : 0,
      item.collectedAt,
      item.rowCount,
      JSON.stringify({
        fields: item.fields,
        usedIn: item.usedIn,
        sourceType: item.sourceType,
        sourceUrl: item.sourceUrl,
        rawSnapshotPath: item.rawSnapshotPath,
        normalizedSnapshotPath: item.normalizedSnapshotPath,
        sha256: item.sha256,
        apiStatus: item.apiStatus
      })
    );
  }

  for (const item of kreb) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO RegionMarketIndexSnapshot (id, provider, region, lawdCode5, month, saleIndex, rentIndex, saleMom, rentMom, volatilityScore, sourceType, createdAt)
       VALUES (?, 'KREB', ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      `kreb:${item.month}:${item.lawdCode5}`,
      item.region,
      item.lawdCode5,
      item.month,
      item.saleIndex,
      item.rentIndex,
      item.saleMom,
      item.rentMom,
      item.volatilityScore,
      item.sourceType
    );
  }

  for (const item of hug) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO HugJeonseRiskSnapshot (id, provider, region, lawdCode5, month, guaranteeAccidentRate, jeonseRiskScore, riskGrade, sourceType, createdAt)
       VALUES (?, 'HUG', ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      `hug:${item.month}:${item.lawdCode5}`,
      item.region,
      item.lawdCode5,
      item.month,
      item.guaranteeAccidentRate,
      item.jeonseRiskScore,
      item.riskGrade,
      item.sourceType
    );
  }

  for (const item of transport) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO TransportAccessSnapshot (id, provider, region, legalDong, lawdCode5, complexName, nearestStationDistanceM, nearestBusStopDistanceM, transitAccessibilityScore, commuteAccessScore, lifeSocAccessScore, sourceType, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      `transport:${item.lawdCode5}:${item.complexName}`,
      item.provider ?? "TRANSPORT",
      item.region,
      item.legalDong,
      item.lawdCode5,
      item.complexName,
      item.nearestStationDistanceM,
      item.nearestBusStopDistanceM,
      item.transitAccessibilityScore,
      item.commuteAccessScore,
      item.lifeSocAccessScore,
      item.sourceType
    );
  }

  for (const item of fused) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO FusedRegionSignalSnapshot (id, region, lawdCode5, month, molitTradeHeat, molitJeonseRatio, krebMarketStability, hugJeonseRiskScore, transitAccessibilityScore, fusedStabilityScore, fusedRiskGrade, evidenceJson, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      `fused:${item.month}:${item.lawdCode5}`,
      item.region,
      item.lawdCode5 ?? null,
      item.month,
      item.molitTradeHeat ?? null,
      item.molitJeonseRatio ?? null,
      item.krebMarketStability ?? null,
      item.hugJeonseRiskScore ?? null,
      item.transitAccessibilityScore ?? null,
      item.fusedStabilityScore,
      item.fusedRiskGrade,
      JSON.stringify({
        evidence: item.evidence,
        fusionConfidence: item.fusionConfidence,
        realProviderCount: item.realProviderCount,
        seedProviderCount: item.seedProviderCount
      })
    );
  }

  console.log(
    JSON.stringify(
      {
        fusionDataSources: evidence.length,
        krebRows: kreb.length,
        hugRows: hug.length,
        transportRows: transport.length,
        fusedSignals: fused.length
      },
      null,
      2
    )
  );
}

async function ensureTables() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS FusionDataSource (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    datasetName TEXT NOT NULL,
    sourceUrl TEXT,
    licenseNote TEXT,
    isRealData INTEGER NOT NULL DEFAULT 0,
    isSeedData INTEGER NOT NULL DEFAULT 1,
    collectedAt TEXT NOT NULL,
    rowCount INTEGER NOT NULL DEFAULT 0,
    fieldSummaryJson TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS RegionMarketIndexSnapshot (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    region TEXT NOT NULL,
    lawdCode5 TEXT,
    month TEXT NOT NULL,
    saleIndex REAL,
    rentIndex REAL,
    saleMom REAL,
    rentMom REAL,
    volatilityScore REAL,
    sourceType TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS HugJeonseRiskSnapshot (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    region TEXT NOT NULL,
    lawdCode5 TEXT,
    month TEXT NOT NULL,
    guaranteeAccidentRate REAL,
    jeonseRiskScore REAL,
    riskGrade TEXT,
    sourceType TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS TransportAccessSnapshot (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    region TEXT NOT NULL,
    legalDong TEXT,
    lawdCode5 TEXT,
    complexName TEXT,
    nearestStationDistanceM REAL,
    nearestBusStopDistanceM REAL,
    transitAccessibilityScore REAL,
    commuteAccessScore REAL,
    lifeSocAccessScore REAL,
    sourceType TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS FusedRegionSignalSnapshot (
    id TEXT PRIMARY KEY,
    region TEXT NOT NULL,
    lawdCode5 TEXT,
    month TEXT NOT NULL,
    molitTradeHeat REAL,
    molitJeonseRatio REAL,
    krebMarketStability REAL,
    hugJeonseRiskScore REAL,
    transitAccessibilityScore REAL,
    fusedStabilityScore REAL NOT NULL,
    fusedRiskGrade TEXT NOT NULL,
    evidenceJson TEXT NOT NULL,
    createdAt TEXT NOT NULL
  )`);
}

async function clearTables() {
  for (const table of [
    "FusionDataSource",
    "RegionMarketIndexSnapshot",
    "HugJeonseRiskSnapshot",
    "TransportAccessSnapshot",
    "FusedRegionSignalSnapshot"
  ]) {
    await prisma.$executeRawUnsafe(`DELETE FROM ${table}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
