export interface PricePoint {
  price: number | null | undefined;
  dealDate: Date;
  floor?: number | null;
}

export function calculateTimeWeightedPrice(
  transactions: PricePoint[],
  options: { halfLifeDays?: number; trimRatio?: number } = {}
): {
  price: number | null;
  method: "time_weighted_trimmed_mean" | "time_weighted_median" | "median" | "insufficient_data";
  count: number;
  warnings: string[];
} {
  const halfLifeDays = options.halfLifeDays ?? 120;
  const trimRatio = options.trimRatio ?? 0.1;
  const valid = transactions
    .filter((item) => Number(item.price) > 0 && item.dealDate instanceof Date && !Number.isNaN(item.dealDate.getTime()))
    .map((item) => ({ price: Number(item.price), dealDate: item.dealDate }))
    .sort((a, b) => a.price - b.price);

  if (valid.length === 0) {
    return { price: null, method: "insufficient_data", count: 0, warnings: ["유효한 실거래가가 없습니다."] };
  }

  if (valid.length < 3) {
    return {
      price: median(valid.map((item) => item.price)),
      method: "median",
      count: valid.length,
      warnings: ["거래가 3건 미만이라 중위값을 사용했습니다."]
    };
  }

  const latest = new Date(Math.max(...valid.map((item) => item.dealDate.getTime())));
  const trimmed = valid.length >= 10 ? trim(valid, trimRatio) : valid;
  const weighted = trimmed.map((item) => {
    const ageDays = Math.max(0, (latest.getTime() - item.dealDate.getTime()) / 86_400_000);
    const weight = Math.exp((-Math.log(2) * ageDays) / halfLifeDays);
    return { ...item, weight };
  });
  const weightSum = weighted.reduce((sum, item) => sum + item.weight, 0);
  if (weightSum <= 0) {
    return { price: median(valid.map((item) => item.price)), method: "time_weighted_median", count: valid.length, warnings: [] };
  }

  return {
    price: Math.round(weighted.reduce((sum, item) => sum + item.price * item.weight, 0) / weightSum),
    method: valid.length >= 10 ? "time_weighted_trimmed_mean" : "time_weighted_median",
    count: valid.length,
    warnings: valid.length < 6 ? ["거래 표본이 적어 기준가 신뢰도가 낮습니다."] : []
  };
}

export function median(values: number[]) {
  const sorted = values.filter((value) => value > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[middle - 1] + sorted[middle]) / 2) : sorted[middle];
}

function trim<T>(items: T[], ratio: number) {
  const trimCount = Math.floor(items.length * ratio);
  return items.slice(trimCount, items.length - trimCount);
}
