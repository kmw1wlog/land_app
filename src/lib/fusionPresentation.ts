export function getFusionEvidenceBadges() {
  return [
    { provider: "국토부 실거래", label: "기준가/거래량/전세가율", sourceType: "실데이터" },
    { provider: "한국부동산원", label: "지역시장 흐름", sourceType: "실데이터" },
    { provider: "HUG", label: "전세 리스크", sourceType: "시드" },
    { provider: "교통 접근성", label: "직주근접/대중교통", sourceType: "시드" }
  ];
}

export function estimateFusionMetricsForCandidate(candidate?: {
  lawdCode5?: string | null;
  transactionHeat?: number | null;
  jeonseRatio?: number | null;
  drawdownFromHigh?: number | null;
} | null) {
  const lawd = candidate?.lawdCode5 ?? "";
  const regionDefaults: Record<string, { market: number; jeonseRisk: number; transit: number }> = {
    "27260": { market: 76, jeonseRisk: 28, transit: 84 },
    "27140": { market: 68, jeonseRisk: 47, transit: 72 },
    "27230": { market: 63, jeonseRisk: 58, transit: 76 },
    "27110": { market: 72, jeonseRisk: 34, transit: 88 },
    "11200": { market: 70, jeonseRisk: 43, transit: 86 }
  };
  const base = regionDefaults[lawd] ?? { market: 66, jeonseRisk: 50, transit: 70 };
  const molit = Math.min(100, Math.max(0, 55 + (candidate?.transactionHeat ?? 1) * 8 - Math.max(0, ((candidate?.jeonseRatio ?? 65) - 75) * 0.8)));
  const fused = Math.round(molit * 0.4 + base.market * 0.2 + (100 - base.jeonseRisk) * 0.2 + base.transit * 0.2);
  return {
    regionalMarketStability: base.market,
    jeonseRiskScore: base.jeonseRisk,
    transitAccessibilityScore: base.transit,
    fusedStabilityScore: fused,
    fusedRiskGrade: fused >= 75 ? "안정" : fused >= 60 ? "확인 필요" : "보수적 검토",
    fusionConfidence: 0.6,
    realProviderCount: 2,
    seedProviderCount: 2,
    dataConfidenceLabel: "MOLIT/KREB 실데이터 + HUG/교통 시드"
  };
}
