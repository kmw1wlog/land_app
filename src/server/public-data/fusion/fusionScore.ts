export function calculateFusedStabilityScore(input: {
  molitTradeHeat?: number;
  molitJeonseRatio?: number;
  molitDrawdownFromHigh?: number;
  krebSaleMom?: number;
  krebRentMom?: number;
  krebVolatilityScore?: number;
  hugJeonseRiskScore?: number;
  transitAccessibilityScore?: number;
  sourceTypes?: {
    molit?: "real" | "seed" | "mock";
    kreb?: "real" | "seed" | "mock";
    hug?: "real" | "seed" | "mock";
    transport?: "real" | "seed" | "mock";
  };
}) {
  const molit = clamp(
    55 +
      normalizeTradeHeat(input.molitTradeHeat) * 18 +
      normalizeJeonseRatio(input.molitJeonseRatio) * 14 +
      normalizeDrawdown(input.molitDrawdownFromHigh) * 8,
    0,
    100
  );
  const kreb = clamp(
    70 +
      clamp(input.krebSaleMom ?? 0, -1.5, 1.5) * 8 +
      clamp(input.krebRentMom ?? 0, -1.5, 1.5) * 4 -
      clamp(input.krebVolatilityScore ?? 45, 0, 100) * 0.35,
    0,
    100
  );
  const hug = clamp(100 - clamp(input.hugJeonseRiskScore ?? 55, 0, 100), 0, 100);
  const transport = clamp(input.transitAccessibilityScore ?? 55, 0, 100);
  const score = Math.round(molit * 0.4 + kreb * 0.2 + hug * 0.2 + transport * 0.2);
  const confidence = calculateFusionConfidence(input.sourceTypes);

  return {
    fusedStabilityScore: score,
    fusedRiskGrade: gradeFromScore(score),
    fusionConfidence: confidence.fusionConfidence,
    realProviderCount: confidence.realProviderCount,
    seedProviderCount: confidence.seedProviderCount,
    components: {
      molitTradeStability: Math.round(molit),
      krebMarketStability: Math.round(kreb),
      hugTenantSafety: Math.round(hug),
      transportAccessibility: Math.round(transport)
    }
  };
}

export function calculateFusionConfidence(sourceTypes?: {
  molit?: "real" | "seed" | "mock";
  kreb?: "real" | "seed" | "mock";
  hug?: "real" | "seed" | "mock";
  transport?: "real" | "seed" | "mock";
}) {
  const normalized = {
    molit: sourceTypes?.molit ?? "real",
    kreb: sourceTypes?.kreb ?? "seed",
    hug: sourceTypes?.hug ?? "seed",
    transport: sourceTypes?.transport ?? "seed"
  };
  const weights = { molit: 0.4, kreb: 0.2, hug: 0.2, transport: 0.2 };
  const entries = Object.entries(normalized) as Array<[keyof typeof weights, "real" | "seed" | "mock"]>;
  const fusionConfidence = entries.reduce((sum, [key, sourceType]) => sum + (sourceType === "real" ? weights[key] : 0), 0);
  return {
    fusionConfidence: Number(fusionConfidence.toFixed(2)),
    realProviderCount: entries.filter(([, sourceType]) => sourceType === "real").length,
    seedProviderCount: entries.filter(([, sourceType]) => sourceType === "seed").length
  };
}

function normalizeTradeHeat(value?: number) {
  if (typeof value !== "number") return 0;
  return clamp(value, 0, 3) / 3;
}

function normalizeJeonseRatio(value?: number) {
  if (typeof value !== "number") return 0;
  const ratio = value > 1 ? value : value * 100;
  if (ratio < 45) return 0.2;
  if (ratio <= 70) return 1;
  if (ratio <= 85) return 0.45;
  return 0.1;
}

function normalizeDrawdown(value?: number) {
  if (typeof value !== "number") return 0;
  const abs = Math.abs(value);
  if (abs < 5) return 0.55;
  if (abs <= 18) return 1;
  if (abs <= 30) return 0.55;
  return 0.25;
}

export function gradeFromScore(score: number) {
  if (score >= 75) return "안정";
  if (score >= 60) return "확인 필요";
  if (score >= 45) return "보수적 검토";
  return "데이터 부족";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
