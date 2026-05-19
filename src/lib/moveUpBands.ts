import type { MoveUpTargetBand } from "@/types";

export function buildMoveUpTargetBands(currentHomePrice: number): MoveUpTargetBand[] {
  return [
    band(1.3, "현실적 갈아타기", currentHomePrice, "현재 집보다 한 단계 넓히는 현실 후보군입니다."),
    band(1.5, "상급지 기본 목표", currentHomePrice, "갈아타기 판단의 중심 가격대입니다."),
    band(2.0, "장기 상급지 목표", currentHomePrice, "지금은 상상에 가깝지만 계속 추적할 장기 목표입니다.")
  ];
}

export function findMoveUpBand(price: number | null | undefined, currentHomePrice: number) {
  if (!price || currentHomePrice <= 0) return null;
  return buildMoveUpTargetBands(currentHomePrice).find((item) => price >= item.targetMinPrice && price <= item.targetMaxPrice) ?? null;
}

function band(multiplier: 1.3 | 1.5 | 2.0, label: string, currentHomePrice: number, description: string): MoveUpTargetBand {
  const target = currentHomePrice * multiplier;
  const width = target * 0.05;
  return {
    multiplier,
    label,
    currentHomePrice,
    targetMinPrice: Math.round(target - width),
    targetMaxPrice: Math.round(target + width),
    description
  };
}
