import type {
  Broker,
  Comment,
  CommunityCategory,
  CommunityPost,
  CurrentHome,
  Lead,
  Listing,
  Property,
  PropertyType,
  User,
  UserProfile
} from "@/types";

const now = "2026-05-10T12:00:00.000Z";

export const users: User[] = [
  {
    id: "user-1",
    email: "mover@example.com",
    nickname: "갈아타기러",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "user-2",
    email: "cashflow@example.com",
    nickname: "월세설계자",
    createdAt: now,
    updatedAt: now
  },
  {
    id: "user-3",
    email: "browser@example.com",
    nickname: "그냥구경중",
    createdAt: now,
    updatedAt: now
  }
];

export const sampleProfiles: UserProfile[] = [
  {
    id: "profile-1",
    userId: "user-1",
    monthlyIncome: 4_200_000,
    monthlySavings: 1_500_000,
    cashOnHand: 30_000_000,
    currentRent: 550_000,
    riskPreference: "balanced",
    primaryGoal: "move_up",
    targetMonthlyCashFlow: 3_000_000,
    preferredRegions: ["성동구", "마포구", "광진구"],
    createdAt: now,
    updatedAt: now
  },
  {
    id: "profile-2",
    userId: "user-2",
    monthlyIncome: 7_000_000,
    monthlySavings: 2_400_000,
    cashOnHand: 120_000_000,
    currentRent: 0,
    riskPreference: "aggressive",
    primaryGoal: "cash_flow",
    targetMonthlyCashFlow: 5_000_000,
    preferredRegions: ["수성구", "부산진구", "분당구"],
    createdAt: now,
    updatedAt: now
  },
  {
    id: "profile-3",
    userId: "user-3",
    monthlyIncome: 3_600_000,
    monthlySavings: 900_000,
    cashOnHand: 18_000_000,
    currentRent: 480_000,
    riskPreference: "stable",
    primaryGoal: "just_browsing",
    targetMonthlyCashFlow: 1_000_000,
    preferredRegions: ["노원구", "부천시", "수원시"],
    createdAt: now,
    updatedAt: now
  }
];

export const sampleHomes: CurrentHome[] = [
  {
    id: "home-1",
    userId: "user-1",
    address: "서울 노원구 중계동 12-4",
    region: "노원구",
    propertyType: "apartment",
    purchasePrice: 310_000_000,
    purchaseDate: "2019-04-12",
    estimatedCurrentPrice: 420_000_000,
    loanBalance: 150_000_000,
    interestRate: 4.2,
    occupancyType: "owner_occupied",
    deposit: 0,
    monthlyRent: 0,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "home-2",
    userId: "user-2",
    address: "대구 수성구 범어동 31-2",
    region: "수성구",
    propertyType: "officetel",
    purchasePrice: 240_000_000,
    purchaseDate: "2021-08-21",
    estimatedCurrentPrice: 265_000_000,
    loanBalance: 90_000_000,
    interestRate: 4.6,
    occupancyType: "monthly_rent",
    deposit: 20_000_000,
    monthlyRent: 850_000,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "home-3",
    userId: "user-3",
    address: "경기 부천시 중동 7-9",
    region: "부천시",
    propertyType: "villa",
    purchasePrice: 0,
    purchaseDate: "2024-02-01",
    estimatedCurrentPrice: 0,
    loanBalance: 0,
    interestRate: 0,
    occupancyType: "monthly_rent",
    deposit: 20_000_000,
    monthlyRent: 480_000,
    createdAt: now,
    updatedAt: now
  }
];

const basePropertyRows: Array<[
  region: string,
  type: PropertyType,
  price: number,
  jeonse: number,
  rent: number,
  deposit: number
]> = [
  ["성동구", "apartment", 870_000_000, 540_000_000, 1_750_000, 80_000_000],
  ["마포구", "apartment", 790_000_000, 510_000_000, 1_600_000, 70_000_000],
  ["광진구", "villa", 520_000_000, 330_000_000, 1_150_000, 50_000_000],
  ["노원구", "apartment", 410_000_000, 270_000_000, 900_000, 35_000_000],
  ["수성구", "apartment", 620_000_000, 390_000_000, 1_250_000, 60_000_000],
  ["부산진구", "officetel", 210_000_000, 145_000_000, 760_000, 20_000_000],
  ["분당구", "apartment", 1_180_000_000, 720_000_000, 2_300_000, 120_000_000],
  ["송파구", "apartment", 1_360_000_000, 810_000_000, 2_650_000, 150_000_000],
  ["영등포구", "officetel", 360_000_000, 245_000_000, 1_050_000, 40_000_000],
  ["수원시", "apartment", 390_000_000, 255_000_000, 930_000, 30_000_000],
  ["대전 유성구", "commercial", 680_000_000, 0, 3_200_000, 90_000_000],
  ["인천 연수구", "apartment", 590_000_000, 360_000_000, 1_180_000, 55_000_000],
  ["강남구", "apartment", 2_180_000_000, 1_250_000_000, 4_100_000, 250_000_000],
  ["서초구", "apartment", 1_980_000_000, 1_120_000_000, 3_700_000, 230_000_000],
  ["용산구", "apartment", 1_620_000_000, 910_000_000, 3_050_000, 190_000_000]
];

const baseProperties = basePropertyRows.map(([region, type, price, jeonse, rent, deposit]) => ({
  region,
  type,
  price,
  jeonse,
  rent,
  deposit
}));

export const properties: Property[] = Array.from({ length: 75 }, (_, index) => {
  const base = baseProperties[index % baseProperties.length];
  const cycle = Math.floor(index / baseProperties.length);
  const salePrice = Math.round(base.price * (1 + cycle * 0.045));
  const jeonsePrice = Math.round(base.jeonse * (1 + cycle * 0.03));
  const areaM2 = 42 + ((index * 13) % 74);
  const previousHighPrice = Math.round(salePrice * (1.08 + ((index % 6) * 0.035)));
  const drawdownFromHigh = -Math.round((1 - salePrice / previousHighPrice) * 1000) / 10;
  const isPartnerListing = index % 7 === 0 || index % 11 === 0;
  const isDirectListing = index % 9 === 0;

  return {
    id: `property-${index + 1}`,
    name: `${base.region} ${["리버뷰", "센트럴", "포레", "스테이션", "더퍼스트"][index % 5]} ${
      base.type === "commercial" ? "상가" : base.type === "officetel" ? "오피스텔" : "레지던스"
    }`,
    address: `${base.region} 시나리오로 ${100 + index}`,
    region: base.region,
    lawdCode5: base.region === "수성구" ? "27260" : null,
    legalDongCode10: base.region === "수성구" ? "2726010100" : null,
    pnu: base.region === "수성구" ? `272601010000${String(1 + (index % 80)).padStart(4, "0")}0000` : null,
    propertyType: base.type,
    salePrice,
    jeonsePrice,
    expectedMonthlyRent: Math.round(base.rent * (1 + cycle * 0.04)),
    expectedDeposit: Math.round(base.deposit * (1 + cycle * 0.03)),
    areaM2,
    floor: 2 + ((index * 3) % 28),
    builtYear: 1995 + ((index * 2) % 29),
    pricePerM2: Math.round(salePrice / areaM2),
    previousHighPrice,
    drawdownFromHigh,
    jeonseRatio: jeonsePrice > 0 ? Math.round((jeonsePrice / salePrice) * 1000) / 10 : 0,
    supplyRiskScore: 28 + ((index * 9) % 57),
    vacancyRiskScore: 22 + ((index * 7) % 61),
    growthScore: 45 + ((index * 11) % 48),
    stabilityScore: 42 + ((index * 13) % 48),
    communityHeatScore: 35 + ((index * 17) % 60),
    isDirectListing,
    isPartnerListing,
    isAd: isPartnerListing,
    createdAt: now,
    updatedAt: now
  };
});

export const brokers: Broker[] = [
  {
    id: "broker-1",
    userId: "user-2",
    officeName: "스탠다드 직영 성동센터",
    region: "성동구",
    licenseNumber: "11680-2026-001",
    isVerified: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: "broker-2",
    userId: "user-3",
    officeName: "한강라인 공인중개",
    region: "마포구",
    licenseNumber: "11440-2026-022",
    isVerified: true,
    createdAt: now,
    updatedAt: now
  }
];

export const listings: Listing[] = properties.slice(0, 12).map((property, index) => ({
  id: `listing-${index + 1}`,
  propertyId: property.id,
  brokerId: index % 2 === 0 ? "broker-1" : "broker-2",
  listingType: property.isDirectListing
    ? "direct_verified"
    : property.isPartnerListing
      ? "partner"
      : "normal",
  title: `${property.name} ${property.floor}층 후보`,
  description: "내 상황 기준 시나리오 계산이 완료된 더미 매물입니다.",
  salePrice: property.salePrice,
  deposit: property.expectedDeposit,
  monthlyRent: property.expectedMonthlyRent,
  status: "active",
  isAd: property.isAd,
  adPriority: property.isAd ? 8 - (index % 5) : 0,
  createdAt: now,
  updatedAt: now
}));

const categories: CommunityCategory[] = [
  "resident_review",
  "owner_opinion",
  "buyer_question",
  "broker_comment",
  "deal_report",
  "good_news",
  "bad_news",
  "prediction",
  "move_up_consulting",
  "cash_flow_investment"
];

const categoryTitles: Record<CommunityCategory, string> = {
  resident_review: "실거주 후기",
  owner_opinion: "보유자 의견",
  buyer_question: "매수 대기자 질문",
  broker_comment: "중개사 현장 의견",
  deal_report: "급매 제보",
  good_news: "호재 검증",
  bad_news: "악재 체크",
  prediction: "가격 예측",
  move_up_consulting: "갈아타기 상담",
  cash_flow_investment: "주거비 절감 검토"
};

const badges: CommunityPost["authorBadge"][] = [
  "보유자",
  "실거주자",
  "매수 대기자",
  "중개사",
  "임대인",
  "임차인"
];

export const communityPosts: CommunityPost[] = Array.from({ length: 50 }, (_, index) => {
  const property = properties[index % properties.length];
  const category = categories[index % categories.length];

  return {
    id: `post-${index + 1}`,
    userId: users[index % users.length].id,
    propertyId: index % 3 === 0 ? property.id : undefined,
    region: property.region,
    category,
    title: `${property.region} ${categoryTitles[category]}: ${index % 2 === 0 ? "숫자로 보면 다르게 보입니다" : "현장 분위기 공유"}`,
    content:
      "최근 90일 거래량, 매물 수, 전세가율을 같이 보면 단순 호재보다 가격 체력 확인이 먼저입니다.",
    authorBadge: badges[index % badges.length],
    likes: 3 + ((index * 7) % 80),
    dislikes: index % 6,
    commentCount: 1 + ((index * 5) % 24),
    createdAt: now,
    updatedAt: now
  };
});

export const comments: Comment[] = communityPosts.slice(0, 12).map((post, index) => ({
  id: `comment-${index + 1}`,
  postId: post.id,
  userId: users[(index + 1) % users.length].id,
  content: "전세가율과 매물 수 추이를 같이 보니 판단이 조금 더 선명해지네요.",
  likes: index + 1,
  createdAt: now
}));

export const leads: Lead[] = [
  {
    id: "lead-1",
    userId: "user-1",
    brokerId: "broker-1",
    propertyId: "property-1",
    listingId: "listing-1",
    leadType: "move_up",
    userBudget: 620_000_000,
    userCash: 245_000_000,
    userMonthlyIncome: 4_200_000,
    message: "현재 집 매도 후 갈아타기 가능 후보 상담 희망",
    status: "new",
    createdAt: now,
    updatedAt: now
  }
];
