export type RiskPreference = "stable" | "balanced" | "aggressive";
export type EstimateAccuracy = "rough" | "public_data_based" | "user_verified" | "expert_reviewed";

export type PrimaryGoal =
  | "buy_home"
  | "move_up"
  | "cash_flow"
  | "multi_home"
  | "commercial_real_estate"
  | "just_browsing";

export type PropertyType =
  | "apartment"
  | "officetel"
  | "villa"
  | "house"
  | "commercial"
  | "land";

export type OccupancyType =
  | "owner_occupied"
  | "jeonse"
  | "monthly_rent"
  | "vacant";

export type ListingType = "normal" | "partner" | "direct_verified";

export type ScenarioType =
  | "hold"
  | "sell_now"
  | "sell_later"
  | "convert_to_jeonse"
  | "convert_to_monthly_rent"
  | "move_up"
  | "additional_purchase"
  | "cash_flow_plan";

export type CommunityCategory =
  | "owner_opinion"
  | "resident_review"
  | "buyer_question"
  | "broker_comment"
  | "deal_report"
  | "good_news"
  | "bad_news"
  | "prediction"
  | "move_up_consulting"
  | "cash_flow_investment";

export interface User {
  id: string;
  email: string;
  nickname: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  monthlyIncome: number;
  monthlySavings: number;
  cashOnHand: number;
  currentRent: number;
  riskPreference: RiskPreference;
  primaryGoal: PrimaryGoal;
  targetMonthlyCashFlow: number;
  preferredRegions: string[];
  createdAt: string;
  updatedAt: string;
}

export interface UserFinancialPlan {
  annualIncomeGrowthRate: number;
  monthlySavingsGrowthRate: number;
  expectedBonusPerYear: number;
  maxComfortableMonthlyPayment: number;
  parentalSupport: number;
  targetHomePrice: number;
  targetRegion: string;
  targetHorizonYears: number;
  targetMonthlyCashFlow: number;
}

export interface CurrentHome {
  id: string;
  userId: string;
  address: string;
  region: string;
  propertyType: Exclude<PropertyType, "land">;
  purchasePrice: number;
  purchaseDate: string;
  estimatedCurrentPrice: number;
  loanBalance: number;
  interestRate: number;
  occupancyType: OccupancyType;
  deposit: number;
  monthlyRent: number;
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  name: string;
  address: string;
  region: string;
  lawdCode5?: string | null;
  legalDongCode10?: string | null;
  pnu?: string | null;
  propertyType: PropertyType;
  salePrice: number;
  jeonsePrice: number;
  expectedMonthlyRent: number;
  expectedDeposit: number;
  areaM2: number;
  floor: number;
  builtYear: number;
  pricePerM2: number;
  previousHighPrice: number;
  drawdownFromHigh: number;
  jeonseRatio: number;
  supplyRiskScore: number;
  vacancyRiskScore: number;
  growthScore: number;
  stabilityScore: number;
  communityHeatScore: number;
  isDirectListing: boolean;
  isPartnerListing: boolean;
  isAd: boolean;
  photoUrls?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Listing {
  id: string;
  propertyId: string;
  brokerId?: string;
  listingType: ListingType;
  title: string;
  description: string;
  salePrice: number;
  deposit: number;
  monthlyRent: number;
  status: "active" | "reserved" | "closed";
  isAd: boolean;
  adPriority: number;
  createdAt: string;
  updatedAt: string;
}

export interface Scenario {
  id: string;
  userId: string;
  currentHomeId?: string;
  targetPropertyId?: string;
  scenarioType: ScenarioType;
  assumptions: Record<string, unknown>;
  result: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SwipeEvent {
  id: string;
  userId: string;
  propertyId: string;
  action: "pass" | "save" | "calculate" | "community" | "contact";
  createdAt: string;
}

export interface VirtualPortfolioItem {
  id: string;
  userId: string;
  propertyId: string;
  sourceType?: "complex_signal" | "property" | "external_link" | "partner_listing" | "direct_verified";
  complexSignalId?: string;
  complexName?: string;
  region?: string;
  areaBucket?: AreaBucket;
  floorBand?: FloorBand;
  referencePrice?: number;
  referenceDate?: string;
  reason?: string;
  virtualPurchasePrice: number;
  virtualPurchaseDate: string;
  virtualInvestmentAmount: number;
  memo: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityPost {
  id: string;
  userId: string;
  propertyId?: string;
  region?: string;
  category: CommunityCategory;
  title: string;
  content: string;
  authorBadge: "보유자" | "실거주자" | "매수 대기자" | "중개사" | "임대인" | "임차인";
  likes: number;
  dislikes: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  content: string;
  likes: number;
  createdAt: string;
}

export interface Broker {
  id: string;
  userId: string;
  officeName: string;
  region: string;
  licenseNumber: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Lead {
  id: string;
  userId: string;
  brokerId?: string;
  propertyId?: string;
  listingId?: string;
  leadType:
    | "buy_consulting"
    | "sell_consulting"
    | "move_up"
    | "cash_flow_investment"
    | "direct_brokerage";
  userBudget: number;
  userCash: number;
  userMonthlyIncome: number;
  message: string;
  status: "new" | "contacted" | "closed" | "rejected";
  createdAt: string;
  updatedAt: string;
}

export interface PropertyAnalysis {
  investmentAmount: number;
  requiredCash: number;
  shortage: number;
  isAffordableNow: boolean;
  isAffordableAfterSale: boolean;
  monthsToReach: number;
  monthlyDebtPayment: number;
  monthlyCashFlow: number;
  fiveYearNetWorthChange: number;
  recommendationScore: number;
  loanLimit: number;
  dsrLimit: number;
  ltvLimit: number;
  ltvRate: number;
  dsrRatio: number;
  regulationNotes: string[];
  accuracy: {
    price: EstimateAccuracy;
    tax: EstimateAccuracy;
    loan: EstimateAccuracy;
    listing: "seed" | "broker_declared" | "direct_checked" | "public_data_based";
  };
}

export type FeedCardType =
  | "realistic_now"
  | "possible_after_sale"
  | "future_goal"
  | "cash_flow"
  | "dream"
  | "community_hot"
  | "direct_verified"
  | "partner_ad";

export type DiscoveryCardType =
  | "hot_complex"
  | "discount_complex"
  | "jeonse_ratio_complex"
  | "future_affordable"
  | "current_home_moveup"
  | "officetel_cash_flow"
  | "community_hot";

export type FloorBand = "low" | "mid" | "high" | "unknown";

export type AreaBucket =
  | "under_40"
  | "59"
  | "74"
  | "84"
  | "101"
  | "over_101"
  | "officetel_under_30"
  | "officetel_30_45"
  | "officetel_45_60"
  | "officetel_over_60";

export interface ComplexSignalCandidate {
  id: string;
  sourceType: "complex_signal";
  cardType: DiscoveryCardType;
  lawdCode5: string;
  legalDongCode10?: string | null;
  region: string;
  legalDong?: string | null;
  complexName: string;
  propertyType: "apartment" | "officetel";
  areaBucket: AreaBucket;
  floorBand: FloorBand;
  referencePrice: number | null;
  referencePriceLabel: string;
  referencePriceMethod:
    | "time_weighted_trimmed_mean"
    | "time_weighted_median"
    | "median"
    | "insufficient_data";
  recentMedianPrice?: number | null;
  recentWeightedPrice?: number | null;
  lowFloorPrice?: number | null;
  midFloorPrice?: number | null;
  highFloorPrice?: number | null;
  recentJeonseMedian?: number | null;
  previousHighPrice?: number | null;
  drawdownFromHigh?: number | null;
  jeonseRatio?: number | null;
  volume30d: number;
  volume90d: number;
  previous90dVolume: number;
  baselineMonthlyVolume?: number | null;
  transactionHeat: number;
  reaccelerationScore: number;
  inventoryLikelihoodScore: number;
  latestTradeDate?: string | null;
  floorPriceSummary?: {
    low?: number | null;
    mid?: number | null;
    high?: number | null;
    selectedBand: FloorBand;
    warning?: string | null;
  };
  moveUp?: {
    targetMultiplierBand: 1.3 | 1.5 | 2.0 | null;
    isInTargetBand: boolean;
    priceBandLabel: string;
    moveUpFitScore: number;
    sellabilityScore: number;
    leaderScore: number;
    liquidityScore: number;
    lowFloorWarning?: string | null;
    checklist: {
      priceBandPass: boolean;
      liquidityPass: boolean;
      leaderPass: boolean;
      transportPass: boolean | null;
      schoolPass: boolean | null;
      floorPass: boolean;
    };
  };
  userFit: {
    possibleNow: boolean;
    possibleAfterSellingCurrentHome: boolean;
    yearsToReach: number | null;
    shortageNow: number | null;
    monthlyBurdenDelta: number | null;
    dsrRatio?: number | null;
    ltvRate?: number | null;
    ltvLimit?: number | null;
    dsrLimit?: number | null;
    regulationNotes?: string[];
  };
  scores: {
    recommendationScore: number;
    affordabilityFit: number;
    regionFit: number;
    transactionHeatScore: number;
    drawdownOpportunityScore: number;
    jeonseRatioScore: number;
    reaccelerationScore: number;
    communityHeatScore: number;
    inventoryLikelihoodScore: number;
  };
  externalLinks: {
    naverSearchUrl: string;
    accuracyLevel:
      | "exact_mapped_complex"
      | "address_search"
      | "complex_name_search"
      | "region_search";
  };
  reasons: string[];
  disclaimer: string;
}

export interface MoveUpTargetBand {
  multiplier: 1.3 | 1.5 | 2.0;
  label: string;
  currentHomePrice: number;
  targetMinPrice: number;
  targetMaxPrice: number;
  description: string;
}

export interface PriceBandComparison {
  base: ComplexSignalCandidate;
  comparables: Array<{
    candidate: ComplexSignalCandidate;
    comparisonScore: number;
    betterPoints: string[];
    worsePoints: string[];
  }>;
}

export interface TargetPathResult {
  targetPropertyId?: string;
  targetName: string;
  targetPrice: number;
  possibleNow: boolean;
  possibleAfterSellingCurrentHome: boolean;
  yearsToReachBySavingOnly: number | null;
  yearsToReachWithHomeSale: number | null;
  yearsToReachWithJeonseStrategy: number | null;
  monthlyPaymentAtPurchase: number;
  shortageNow: number;
  recommendedPath:
    | "save_more"
    | "sell_current_home"
    | "convert_to_jeonse"
    | "convert_to_monthly_rent"
    | "additional_purchase"
    | "not_feasible";
  explanation: string[];
}

export interface ScenarioResult {
  label: string;
  scenarioType: ScenarioType;
  initialCashNeeded: number;
  monthlyCashFlow: number;
  debtBurden: number;
  afterTaxNetWorth: number;
  fiveYearExpectedReturn: number;
  risk: "낮음" | "중간" | "높음";
  fitScore: number;
  notes: string[];
}
