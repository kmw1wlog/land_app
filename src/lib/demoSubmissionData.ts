export const DEMO_MODE_ENABLED = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const demoProfile = {
  monthlyIncome: 4_200_000,
  cashOnHand: 55_000_000,
  monthlySavings: 1_200_000,
  maxComfortableMonthlyPayment: 1_250_000,
  preferredRegions: ["대구 수성구", "서울 성동구"],
  primaryGoal: "buy_home"
};

export const demoCurrentHome = {
  region: "대구 수성구",
  complexName: "현재 전세 보증금",
  estimatedCurrentPrice: 180_000_000,
  loanBalance: 0,
  areaM2: 59.0,
  floor: 8,
  propertyType: "apartment"
};

export const demoLadder = {
  purchasePowerNow: 420_000_000,
  purchasePowerAfterSale: 580_000_000,
  purchasePowerInFiveYears: 820_000_000,
  onePointFiveTarget: 620_000_000
};

export const demoCandidate = {
  label: "구매력 적합 후보",
  region: "대구 수성구 범어동",
  complexName: "범어동 B아파트",
  area: "59㎡급",
  referencePrice: 620_000_000,
  volume30d: 8,
  transactionHeat: 3.1,
  drawdownFromHigh: -14.2,
  jeonseRatio: 64,
  dsr: 36,
  ltv: 58,
  monthlyBurdenDelta: 720_000
};

export const demoComparables = [
  {
    name: "범어동 B아파트",
    price: 620_000_000,
    drawdown: -14.2,
    volume90d: 18,
    jeonseRatio: 64,
    monthlyBurden: 720_000,
    leaderScore: 82
  },
  {
    name: "수성동 C아파트",
    price: 590_000_000,
    drawdown: -9.4,
    volume90d: 9,
    jeonseRatio: 59,
    monthlyBurden: 650_000,
    leaderScore: 71
  },
  {
    name: "성동구 D아파트",
    price: 650_000_000,
    drawdown: -18.1,
    volume90d: 21,
    jeonseRatio: 67,
    monthlyBurden: 790_000,
    leaderScore: 84
  }
];

export const demoCommunityDraft = {
  title: "범어동 B아파트 59㎡급, 첫 주거 구매 후보로 어떤가요?",
  body: [
    "최근 실거래 기준가: 6.2억",
    "최근 90일 거래: 18건",
    "거래 집중도: 3.1배",
    "전고점 대비: -14.2%",
    "전세가율: 64%",
    "현재 구매력 기준 접근 가능 여부: 조건부 가능",
    "",
    "비슷한 가격대 후보와 비교하면 어떻게 보시나요?"
  ].join("\n")
};

export const demoCaptureCards = [
  {
    title: "문제-해결 요약",
    subtitle: "정보는 많은데 내 주거 구매력 답은 없다",
    body: ["단지는 보인다", "내 상황은 따로 계산한다", "지금 어디까지 가능?", "홈패스가 경로를 진단한다"]
  },
  {
    title: "기존 앱 vs 홈패스",
    subtitle: "단지 정보에서 주거 구매력 진단으로",
    body: ["기존: 실거래가·매물·후기", "홈패스: 소득·현금·주거비", "결과: 지금/정리 후/미래 가능 후보"]
  },
  {
    title: "MVP 핵심 화면 4종",
    subtitle: "피드, 내 주거 기준, 비교, 커뮤니티",
    body: ["오늘의 주거 구매력 피드", "내 주거 경로", "같은 돈 비교", "데이터 기반 커뮤니티"]
  },
  {
    title: "데이터/기술 구조도",
    subtitle: "매물 크롤링 없이 공공 실거래 기반",
    body: ["실거래·전월세·건축물대장", "실거래 시그널 엔진", "DSR/LTV·미래 구매력", "주거 구매력 진단"]
  },
  {
    title: "사업화 로드맵",
    subtitle: "MVP에서 파일럿과 리포트로",
    body: ["청년·사회초년생 파일럿", "관심단지 알림", "주거 리스크 리포트", "B2B 상담 연결"]
  }
];
