export type PublicDataStatus = "ok" | "partial" | "error" | "mock";

export interface NormalizedAddressResult {
  id?: string;
  source: "juso" | "legal_dong_db" | "mock" | "manual";
  inputAddress: string;
  roadAddress: string | null;
  jibunAddress: string | null;
  legalDongCode10: string | null;
  lawdCode5: string | null;
  mountainFlag: "0" | "1" | null;
  bun: string | null;
  ji: string | null;
  pnu: string | null;
  lat: number | null;
  lng: number | null;
  warnings: string[];
}

export interface PublicDataTransactionItem {
  externalKey?: string;
  sourceType: string;
  propertyType: string;
  dealType: string;
  lawdCode5: string;
  legalDongCode10?: string | null;
  pnu?: string | null;
  legalDong?: string | null;
  jibun?: string | null;
  complexName?: string | null;
  buildingName?: string | null;
  floor?: number | null;
  areaM2?: number | null;
  dealYear?: number | null;
  dealMonth?: number | null;
  dealDay?: number | null;
  dealAmount?: number | null;
  deposit?: number | null;
  monthlyRent?: number | null;
  builtYear?: number | null;
  raw?: unknown;
}

export interface SeedWriteStats {
  inserted: number;
  updated: number;
  skipped: number;
}

export interface SeedEndpointResult extends SeedWriteStats {
  lawdCode: string;
  month: string;
  propertyType: string;
  dealType: string;
  status: "ok" | "error" | "dry_run";
  sourceType: string;
  failed?: string;
}

export interface BuildingLedgerLookupParams {
  sigunguCd: string;
  bjdongCd: string;
  bun: string;
  ji: string;
  pnu?: string | null;
}

export interface PublicDataTargetConfig {
  regions: string[];
  lawdCodes: string[];
  monthFrom: string;
  monthTo: string;
}
