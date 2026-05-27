export type FusionProvider =
  | "MOLIT"
  | "KREB"
  | "HUG"
  | "KMAAS"
  | "TRANSPORT"
  | "VWORLD"
  | "JUSO";

export type FusionSourceType = "real" | "seed" | "mock";

export interface FusionDataEvidence {
  provider: FusionProvider;
  datasetName: string;
  sourceType: FusionSourceType;
  rowCount: number;
  fields: string[];
  collectedAt: string;
  usedIn: string[];
  sourceUrl?: string;
  licenseNote?: string;
  rawSnapshotPath?: string;
  normalizedSnapshotPath?: string;
  sha256?: string;
  apiCheckedAt?: string;
  apiStatus?: "ok" | "error" | "skipped";
  note?: string;
}

export interface FusionCreditReadiness {
  canCheckMultiAgencyFusion: boolean;
  reason: string;
  providers: FusionProvider[];
  realProviders: FusionProvider[];
  seedProviders: FusionProvider[];
  missingForStrongerClaim: string[];
  requiredNextStep?: string;
}

export interface KrebRegionIndexSnapshot {
  month: string;
  region: string;
  lawdCode5: string;
  saleIndex: number;
  rentIndex: number;
  saleMom: number;
  rentMom: number;
  volatilityScore: number;
  sourceType: FusionSourceType;
  sourceUrl?: string;
  checkedAt?: string;
}

export interface HugJeonseRiskSnapshot {
  month: string;
  region: string;
  lawdCode5: string;
  guaranteeAccidentRate: number;
  jeonseRiskScore: number;
  riskGrade: string;
  sourceType: FusionSourceType;
  sourceUrl?: string;
  checkedAt?: string;
}

export interface TransportAccessSnapshot {
  region: string;
  legalDong: string;
  lawdCode5: string;
  complexName: string;
  nearestStationDistanceM: number;
  nearestBusStopDistanceM: number;
  transitAccessibilityScore: number;
  commuteAccessScore: number;
  lifeSocAccessScore: number;
  sourceType: FusionSourceType;
  sourceUrl?: string;
  checkedAt?: string;
  provider?: FusionProvider;
}

export interface FusedRegionSignal {
  region: string;
  lawdCode5?: string;
  month: string;
  molitTradeHeat?: number;
  molitJeonseRatio?: number;
  krebMarketStability?: number;
  hugJeonseRiskScore?: number;
  transitAccessibilityScore?: number;
  fusedStabilityScore: number;
  fusedRiskGrade: string;
  fusionConfidence: number;
  realProviderCount: number;
  seedProviderCount: number;
  realProviders: FusionProvider[];
  seedProviders: FusionProvider[];
  sourceType: FusionSourceType;
  evidence: string[];
}
