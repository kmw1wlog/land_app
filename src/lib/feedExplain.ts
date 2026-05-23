import type { Property } from "@/types";
import { analyzePropertyForUser } from "./calculations";
import { formatKRW } from "./format";

export function explainFeedCard(
  property: Property,
  analysis: ReturnType<typeof analyzePropertyForUser>,
  recommendedPath: string
) {
  return [
    analysis.isAffordableAfterSale
      ? "현재 기준점을 정리하면 예산 범위에 들어오는 후보입니다."
      : `현재 기준 부족 금액이 ${formatKRW(analysis.shortage)}입니다.`,
    `DSR ${analysis.dsrRatio.toFixed(1)}%, LTV ${(analysis.ltvRate * 100).toFixed(0)}% 기준으로 월 부담을 계산했습니다.`,
    property.jeonseRatio >= 55
      ? "전세가율이 높아 필요 현금 부담 관점에서 비교할 만합니다."
      : "전세가율은 낮아 현금 부담을 더 보수적으로 봐야 합니다.",
    property.communityHeatScore >= 70
      ? "최근 커뮤니티 관심도가 높은 후보입니다."
      : `추천 경로는 ${recommendedPath}입니다.`
  ];
}
