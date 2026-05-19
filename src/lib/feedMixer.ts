import type { CurrentHome, FeedCardType, Property, UserProfile } from "@/types";
import { analyzePropertyForUser } from "./calculations";

export interface MixedFeedCard {
  property: Property;
  feedCardType: FeedCardType;
  reason: string;
  recommendedPath: "save_more" | "sell_current_home" | "convert_to_jeonse" | "convert_to_monthly_rent" | "additional_purchase" | "not_feasible";
  score: number;
}

export function buildMixedFeed(properties: Property[], profile: UserProfile, currentHome?: CurrentHome): MixedFeedCard[] {
  const cards = properties
    .map((property) => {
      const analysis = analyzePropertyForUser(profile, currentHome, property);
      return {
        property,
        score: analysis.recommendationScore,
        ...classifyFeedCard(property, analysis)
      };
    })
    .sort((a, b) => b.score - a.score);

  const realistic = cards.filter((card) =>
    ["realistic_now", "possible_after_sale", "cash_flow", "direct_verified", "partner_ad"].includes(card.feedCardType)
  );
  const future = cards.filter((card) => ["future_goal", "dream"].includes(card.feedCardType));
  const explore = cards.filter((card) => ["community_hot"].includes(card.feedCardType));

  return mixByRatio([
    { items: realistic, take: 7 },
    { items: future, take: 2 },
    { items: explore.length ? explore : cards, take: 1 }
  ]);
}

function classifyFeedCard(
  property: Property,
  analysis: ReturnType<typeof analyzePropertyForUser>
): Pick<MixedFeedCard, "feedCardType" | "reason" | "recommendedPath"> {
  if (property.isAd) {
    return { feedCardType: "partner_ad", reason: "조건을 통과한 제휴 중개사 광고 후보", recommendedPath: "save_more" };
  }
  if (property.isDirectListing) {
    return { feedCardType: "direct_verified", reason: "직영 검증 체크가 붙은 후보", recommendedPath: "sell_current_home" };
  }
  if (analysis.isAffordableNow) {
    return { feedCardType: "realistic_now", reason: "현재 현금과 대출 여력으로 검토 가능한 후보", recommendedPath: "save_more" };
  }
  if (analysis.isAffordableAfterSale) {
    return { feedCardType: "possible_after_sale", reason: "현재 집 매도 시 접근 가능한 갈아타기 후보", recommendedPath: "sell_current_home" };
  }
  if (analysis.monthlyCashFlow > 0) {
    return { feedCardType: "cash_flow", reason: "월 현금흐름 기여 가능성이 있는 후보", recommendedPath: "convert_to_monthly_rent" };
  }
  if (analysis.monthsToReach <= 120) {
    return { feedCardType: "future_goal", reason: "저축 속도 기준 미래 목표 후보", recommendedPath: "save_more" };
  }
  if (property.communityHeatScore >= 82) {
    return { feedCardType: "community_hot", reason: "종토방 관심도가 높은 탐험 후보", recommendedPath: "not_feasible" };
  }
  return { feedCardType: "dream", reason: "상상 포트폴리오에 담아볼 드림 후보", recommendedPath: "not_feasible" };
}

function mixByRatio(groups: Array<{ items: MixedFeedCard[]; take: number }>) {
  const result: MixedFeedCard[] = [];
  const maxLength = Math.max(...groups.map((group) => group.items.length));
  for (let offset = 0; offset < maxLength; offset += 1) {
    for (const group of groups) {
      const start = offset * group.take;
      result.push(...group.items.slice(start, start + group.take));
    }
  }
  return dedupe(result);
}

function dedupe(cards: MixedFeedCard[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    if (seen.has(card.property.id)) return false;
    seen.add(card.property.id);
    return true;
  });
}
