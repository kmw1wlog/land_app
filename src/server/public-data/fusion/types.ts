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
  note?: string;
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
}

export interface HugJeonseRiskSnapshot {
  month: string;
  region: string;
  lawdCode5: string;
  guaranteeAccidentRate: number;
  jeonseRiskScore: number;
  riskGrade: string;
  sourceType: FusionSourceType;
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
  sourceType: FusionSourceType;
  evidence: string[];
}
