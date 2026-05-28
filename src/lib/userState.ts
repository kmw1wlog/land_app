import type { CurrentHome, PrimaryGoal, UserFinancialPlan, UserProfile } from "@/types";

export type UserHousingPosition = "first_home_buyer" | "owner_move_up" | "renter_planning" | "market_browser";

export interface UserStateSummary {
  position: UserHousingPosition;
  goal: PrimaryGoal;
  goalLabel: string;
  housingLabel: string;
  headline: string;
  shortSummary: string;
  currentHomeIsOwned: boolean;
  mortgageHomeCount: number;
  isFirstTimeBuyer: boolean;
}

export const goalLabels: Record<PrimaryGoal, string> = {
  buy_home: "첫 주거 구매",
  move_up: "현재 주거 기준점 정리 후 이동",
  cash_flow: "주거비 부담 줄이기",
  multi_home: "가족 확장 대비",
  commercial_real_estate: "생활권/직주근접 검토",
  just_browsing: "시장 둘러보기"
};

export const goalUi: Record<
  PrimaryGoal,
  {
    headerBadge: string;
    feedTitle: string;
    feedSubtitle: string;
    feedMixLabel: string;
    primaryMetricLabel: string;
    secondaryMetricLabel: string;
    pathTitle: string;
    pathSubtitle: string;
    myHomeTitle: string;
    myHomeSubtitle: string;
    chatIntro: string;
    suggestedQuestions: string[];
  }
> = {
  buy_home: {
    headerBadge: "첫 주택 구매 모드",
    feedTitle: "첫 주택 구매 피드",
    feedSubtitle: "무주택/임차 기준에서 현금, 월소득, 대출 부담으로 접근 가능한 실거래 후보를 먼저 보여줍니다.",
    feedMixLabel: "첫 매수 가능성 70% · 5년 준비 30%",
    primaryMetricLabel: "첫 매수 여력",
    secondaryMetricLabel: "목표가 부족액",
    pathTitle: "첫 주택 구매 경로",
    pathSubtitle: "현재 현금·월저축·목표 기간 기준으로 첫 집까지의 부족액과 준비 루트를 계산합니다.",
    myHomeTitle: "내 현재 주거 상태",
    myHomeSubtitle: "보유 주택 매도가 아니라 전월세 보증금, 월 주거비, 현금 여력을 기준으로 첫 구매 가능성을 봅니다.",
    chatIntro: "첫 주택 구매 기준으로 내 현금, 월소득, 현재 주거비와 목표 지역을 먼저 확인한 뒤 설명합니다.",
    suggestedQuestions: [
      "첫 주택 구매 기준으로 내 현재 상태를 확인해줘",
      "내 월급과 현금으로 지금 가능한 가격대는?",
      "첫 집 후보를 볼 때 가장 먼저 확인할 리스크는?",
      "5년 안에 목표 집에 가려면 부족액이 얼마야?",
      "데이터 출처와 KREB 반영 여부를 설명해줘"
    ]
  },
  move_up: {
    headerBadge: "갈아타기 진단 모드",
    feedTitle: "갈아타기 후보 피드",
    feedSubtitle: "현재 주거 기준점, 세후 정리 현금, 미래 구매력을 기준으로 이동 가능한 후보를 보여줍니다.",
    feedMixLabel: "정리 후 접근 70% · 미래 접근 30%",
    primaryMetricLabel: "현재 매수 여력",
    secondaryMetricLabel: "정리 후 구매력",
    pathTitle: "내 주거 경로",
    pathSubtitle: "현재·정리 후·미래 구매력 안에서 어디까지 가능한지 봅니다.",
    myHomeTitle: "내 주거 기준점",
    myHomeSubtitle: "보유 주택, 전세 보증금, 월세 기준을 현재 조건으로 환산해 주거 이동 가능성을 계산합니다.",
    chatIntro: "현재 집 정리 여부와 갈아타기 예산을 구분해서 설명합니다.",
    suggestedQuestions: [
      "현재 집을 정리하면 어디까지 가능해?",
      "왜 이 후보가 떴어?",
      "같은 예산이면 어디가 더 안전해?",
      "이 결과는 매수 추천이야?",
      "데이터 출처는 뭐야?"
    ]
  },
  cash_flow: {
    headerBadge: "주거비 부담 완화 모드",
    feedTitle: "주거비 부담 완화 피드",
    feedSubtitle: "월 주거비와 현금흐름 부담을 낮추는 후보를 우선해 보여줍니다.",
    feedMixLabel: "월부담 완화 70% · 안정성 30%",
    primaryMetricLabel: "월부담 기준 여력",
    secondaryMetricLabel: "현금흐름 여유",
    pathTitle: "주거비 조정 경로",
    pathSubtitle: "월 부담을 줄이는 선택지와 장기 구매력을 함께 봅니다.",
    myHomeTitle: "내 주거비 기준점",
    myHomeSubtitle: "현재 월세/대출 부담을 기준으로 주거비 완화 가능성을 계산합니다.",
    chatIntro: "월 주거비, 저축액, 현금흐름 부담을 먼저 확인한 뒤 설명합니다.",
    suggestedQuestions: [
      "내 주거비 부담을 줄이는 방향으로 설명해줘",
      "월 부담이 너무 커지지 않는 후보는?",
      "전세가율과 월부담 리스크를 같이 봐줘",
      "이 결과는 매수 추천이야?",
      "데이터 출처는 뭐야?"
    ]
  },
  multi_home: {
    headerBadge: "가족 확장 대비 모드",
    feedTitle: "가족 확장 대비 피드",
    feedSubtitle: "면적, 생활권 안정성, 장기 월부담을 함께 고려한 후보를 보여줍니다.",
    feedMixLabel: "생활 안정성 70% · 장기 확장 30%",
    primaryMetricLabel: "현재 가능 예산",
    secondaryMetricLabel: "확장 목표 부족액",
    pathTitle: "가족 확장 주거 경로",
    pathSubtitle: "현재 예산과 미래 필요 면적을 함께 놓고 준비 경로를 계산합니다.",
    myHomeTitle: "내 생활권 기준점",
    myHomeSubtitle: "현재 주거비와 생활권 기준을 바탕으로 가족 확장 대비 여력을 봅니다.",
    chatIntro: "가족 확장에 필요한 면적·월부담·생활권 리스크를 함께 확인합니다.",
    suggestedQuestions: [
      "가족 확장 기준으로 내 상태를 확인해줘",
      "같은 예산에서 면적과 안정성을 어떻게 봐야 해?",
      "5년 뒤 확장 가능성을 설명해줘",
      "이 결과는 매수 추천이야?",
      "데이터 출처는 뭐야?"
    ]
  },
  commercial_real_estate: {
    headerBadge: "생활권/직주근접 검토 모드",
    feedTitle: "생활권/직주근접 피드",
    feedSubtitle: "교통 접근성, 생활권 안정성, 주거비 부담을 함께 보는 후보를 보여줍니다.",
    feedMixLabel: "직주근접 70% · 주거 안정성 30%",
    primaryMetricLabel: "생활권 예산",
    secondaryMetricLabel: "접근성 보조점수",
    pathTitle: "생활권 검토 경로",
    pathSubtitle: "교통 접근성과 예산을 함께 놓고 주거 선택지를 비교합니다.",
    myHomeTitle: "내 생활권 기준점",
    myHomeSubtitle: "현재 생활권과 이동 부담을 기준으로 직주근접 선택지를 봅니다.",
    chatIntro: "직주근접, 교통 접근성, 주거 안정성 근거를 함께 확인합니다.",
    suggestedQuestions: [
      "직주근접 기준으로 내 상태를 확인해줘",
      "교통 접근성과 예산을 같이 비교해줘",
      "생활권 데이터 출처는 뭐야?",
      "이 결과는 매수 추천이야?",
      "같은 예산이면 어디가 더 안정적이야?"
    ]
  },
  just_browsing: {
    headerBadge: "시장 둘러보기 모드",
    feedTitle: "시장 둘러보기 피드",
    feedSubtitle: "관심 지역의 실거래 흐름과 리스크를 가볍게 비교할 수 있게 보여줍니다.",
    feedMixLabel: "시장 흐름 70% · 내 조건 참고 30%",
    primaryMetricLabel: "참고 구매력",
    secondaryMetricLabel: "목표가 간격",
    pathTitle: "시장 관찰 경로",
    pathSubtitle: "당장 결정하지 않고 관심 지역의 가격대와 리스크를 살펴봅니다.",
    myHomeTitle: "내 참고 기준점",
    myHomeSubtitle: "입력한 조건을 참고 기준으로만 두고 시장 흐름을 관찰합니다.",
    chatIntro: "시장 둘러보기 기준으로 단정 없이 데이터 흐름과 확인 항목을 설명합니다.",
    suggestedQuestions: [
      "시장 둘러보기 기준으로 어디를 봐야 해?",
      "거래가 활발한 후보와 리스크를 같이 설명해줘",
      "데이터 출처는 뭐야?",
      "이 결과는 매수 추천이야?",
      "내 조건을 넣으면 뭐가 달라져?"
    ]
  }
};

export function hasOwnedCurrentHome(currentHome?: CurrentHome | null) {
  if (!currentHome) return false;
  return (
    currentHome.occupancyType === "owner_occupied" &&
    (currentHome.estimatedCurrentPrice > 0 || currentHome.purchasePrice > 0)
  );
}

export function isFirstHomeBuyer(profile: UserProfile, currentHome?: CurrentHome | null) {
  return profile.primaryGoal === "buy_home" || !hasOwnedCurrentHome(currentHome);
}

export function getMortgageHomeCount(profile: UserProfile, currentHome?: CurrentHome | null) {
  if (isFirstHomeBuyer(profile, currentHome)) return 0;
  return hasOwnedCurrentHome(currentHome) ? 1 : 0;
}

export function analyzeUserState(
  profile: UserProfile,
  currentHome?: CurrentHome | null,
  financialPlan?: UserFinancialPlan
): UserStateSummary {
  const currentHomeIsOwned = hasOwnedCurrentHome(currentHome);
  const isFirst = isFirstHomeBuyer(profile, currentHome);
  const position: UserHousingPosition =
    profile.primaryGoal === "buy_home"
      ? "first_home_buyer"
      : currentHomeIsOwned
        ? "owner_move_up"
        : profile.primaryGoal === "just_browsing"
          ? "market_browser"
          : "renter_planning";
  const goalLabel = goalLabels[profile.primaryGoal];
  const housingLabel = currentHomeIsOwned
    ? `${currentHome?.region ?? "현재 주거"} 보유 기준`
    : currentHome?.occupancyType === "jeonse"
      ? `${currentHome.region} 전세 거주 기준`
      : currentHome?.occupancyType === "monthly_rent"
        ? `${currentHome.region} 월세/임차 기준`
        : "무주택/임차 기준";
  const targetText = financialPlan ? `${financialPlan.targetRegion} ${Math.round(financialPlan.targetHomePrice / 100000000)}억대` : "목표 주거";
  const headline =
    position === "first_home_buyer"
      ? `${targetText} 첫 구매 가능성 진단`
      : position === "owner_move_up"
        ? `${housingLabel} 갈아타기 진단`
        : `${housingLabel} 주거 선택지 진단`;

  return {
    position,
    goal: profile.primaryGoal,
    goalLabel,
    housingLabel,
    headline,
    shortSummary: `${goalLabel} · ${housingLabel}`,
    currentHomeIsOwned,
    mortgageHomeCount: getMortgageHomeCount(profile, currentHome),
    isFirstTimeBuyer: isFirst
  };
}

export function firstHomeCurrentHomeDefaults(region = "대구 수성구"): Partial<CurrentHome> {
  return {
    address: `${region} 임차 거주`,
    region,
    propertyType: "apartment",
    purchasePrice: 0,
    estimatedCurrentPrice: 0,
    loanBalance: 0,
    interestRate: 0,
    occupancyType: "monthly_rent",
    deposit: 30_000_000,
    monthlyRent: 550_000
  };
}

export function goalFinancialPlanDefaults(goal: PrimaryGoal, profile: UserProfile): Partial<UserFinancialPlan> {
  const targetRegion = profile.preferredRegions[0] ?? "대구 수성구";
  if (goal === "buy_home") {
    return {
      targetRegion,
      targetHomePrice: 650_000_000,
      targetHorizonYears: 5,
      maxComfortableMonthlyPayment: 1_500_000,
      targetMonthlyCashFlow: 0
    };
  }
  if (goal === "move_up") {
    return {
      targetRegion,
      targetHomePrice: 950_000_000,
      targetHorizonYears: 5,
      maxComfortableMonthlyPayment: 2_000_000
    };
  }
  if (goal === "cash_flow") {
    return {
      targetRegion,
      targetHomePrice: 450_000_000,
      targetHorizonYears: 3,
      maxComfortableMonthlyPayment: 1_200_000,
      targetMonthlyCashFlow: Math.max(profile.currentRent, 800_000)
    };
  }
  return { targetRegion };
}
