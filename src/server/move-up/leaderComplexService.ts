export function calculateLiquidityScore(input: {
  monthlyTradeAvg: number;
  volume90d: number;
  householdCount?: number | null;
}) {
  let score = input.monthlyTradeAvg >= 2 ? 100 : input.monthlyTradeAvg >= 1 ? 75 : input.volume90d >= 3 ? 60 : 35;
  if (input.householdCount && input.householdCount >= 1000) score += 20;
  else if (input.householdCount && input.householdCount >= 400) score += 12;
  else if (input.householdCount && input.householdCount < 300) score -= 10;
  return Math.max(0, Math.min(100, score));
}

export function calculateLeaderScore(input: {
  referencePrice: number | null;
  regionPeerPrices: number[];
  volume90d: number;
  peerVolume90d: number[];
  liquidityScore: number;
  jeonseRatio?: number | null;
}) {
  const pricePercentile = percentile(input.referencePrice ?? 0, input.regionPeerPrices);
  const volumePercentile = percentile(input.volume90d, input.peerVolume90d);
  const jeonseStabilityScore = input.jeonseRatio ? Math.max(0, Math.min(100, 100 - Math.abs(input.jeonseRatio - 65) * 2)) : 45;
  return Math.round(
    pricePercentile * 0.4 +
      volumePercentile * 0.25 +
      input.liquidityScore * 0.2 +
      jeonseStabilityScore * 0.15
  );
}

export function percentile(value: number, peers: number[]) {
  const valid = peers.filter((item) => Number.isFinite(item) && item > 0).sort((a, b) => a - b);
  if (!valid.length || !value) return 0;
  const below = valid.filter((item) => item <= value).length;
  return Math.round((below / valid.length) * 100);
}
