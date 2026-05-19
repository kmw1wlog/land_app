export const DEMO_MODE_ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const demoProfile = {
  monthlyIncome: 6_500_000,
  cashOnHand: 120_000_000,
  monthlySavings: 1_500_000,
  maxComfortableMonthlyPayment: 1_800_000,
  preferredRegions: ["대구 수성구", "서울 성동구"],
  primaryGoal: "move_up"
};

export const demoCurrentHome = {
  region: "대구 수성구",
  complexName: "범어동 A아파트",
  estimatedCurrentPrice: 800_000_000,
  loanBalance: 200_000_000,
  areaM2: 84.9,
  floor: 12,
  propertyType: "apartment"
};

export const demoLadder = {
  purchasePowerNow: 820_000_000,
  purchasePowerAfterSale: 1_160_000_000,
  purchasePowerInFiveYears: 1_310_000_000,
  onePointFiveTarget: 1_200_000_000
};

export const demoCandidate = {
  label: "1.5배 후보",
  region: "대구 수성구 범어동",
  complexName: "범어동 B아파트",
  area: "84㎡급",
  referencePrice: 1_190_000_000,
  volume30d: 8,
  transactionHeat: 3.1,
  drawdownFromHigh: -14.2,
  jeonseRatio: 64,
  dsr: 38,
  ltv: 61,
  monthlyBurdenDelta: 820_000
};

export const demoComparables = [
  {
    name: "범어동 B아파트",
    price: 1_190_000_000,
    drawdown: -14.2,
    volume90d: 18,
    jeonseRatio: 64,
    monthlyBurden: 820_000,
    leaderScore: 82
  },
  {
    name: "수성동 C아파트",
    price: 1_150_000_000,
    drawdown: -9.4,
    volume90d: 9,
    jeonseRatio: 59,
    monthlyBurden: 740_000,
    leaderScore: 71
  },
  {
    name: "성동구 D아파트",
    price: 1_230_000_000,
    drawdown: -18.1,
    volume90d: 21,
    jeonseRatio: 67,
    monthlyBurden: 910_000,
    leaderScore: 84
  }
];

export const demoCommunityDraft = {
  title: "범어동 B아파트 84㎡급, 갈아타기 후보로 어떤가요?",
  body: [
    "최근 실거래 기준가: 11.9억",
    "최근 90일 거래: 18건",
    "거래 집중도: 3.1배",
    "전고점 대비: -14.2%",
    "전세가율: 64%",
    "현재 집 매도 시 접근 가능 여부: 가능",
    "",
    "비슷한 가격대 후보와 비교하면 어떻게 보시나요?"
  ].join("\n")
};

export const demoCaptureCards = [
  {
    title: "문제-해결 요약",
    subtitle: "정보는 많은데 내 답은 없다",
    body: ["단지는 보인다", "내 상황은 따로 계산한다", "집 팔면 어디까지?", "앱이 사다리를 그린다"]
  },
  {
    title: "기존 앱 vs 우리 앱",
    subtitle: "단지 정보에서 내 가능성 계산으로",
    body: ["기존: 실거래가·매물·후기", "우리: 현재 집·월급·현금", "결과: 지금/매도/미래 가능 후보"]
  },
  {
    title: "MVP 핵심 화면 4종",
    subtitle: "피드, 내 집, 비교, 종토방",
    body: ["오늘의 갈아타기 피드", "내 집 사다리", "같은 돈 비교", "데이터 기반 종토방"]
  },
  {
    title: "데이터/기술 구조도",
    subtitle: "매물 크롤링 없이 공공 실거래 기반",
    body: ["실거래·전월세·건축물대장", "실거래 시그널 엔진", "DSR/LTV·미래 구매력", "갈아타기 피드"]
  },
  {
    title: "사업화 로드맵",
    subtitle: "MVP에서 파일럿과 리포트로",
    body: ["지역 파일럿", "관심단지 알림", "단건 리포트", "B2B 리드 연결"]
  }
];
