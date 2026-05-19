export function formatKRW(value: number): string {
  const sign = value < 0 ? "-" : "";
  const absolute = Math.abs(value);
  const eok = Math.floor(absolute / 100_000_000);
  const man = Math.round((absolute % 100_000_000) / 10_000);

  if (eok > 0 && man > 0) {
    return `${sign}${eok}.${Math.floor(man / 1000)}억`;
  }

  if (eok > 0) {
    return `${sign}${eok}억`;
  }

  return `${sign}${man.toLocaleString("ko-KR")}만`;
}

export function formatMonthly(value: number): string {
  return `${Math.round(value / 10_000).toLocaleString("ko-KR")}만 원`;
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

export function percent(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}
