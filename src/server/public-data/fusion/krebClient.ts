import { loadKrebRegionIndex } from "./fusionEvidence";

export type KrebTargetRegion = {
  region: string;
  lawdCode5: string;
  clsFullName: string;
};

export type KrebNormalizedRegionIndex = {
  month: string;
  region: string;
  lawdCode5: string;
  saleIndex: number;
  rentIndex: number;
  saleMom: number;
  rentMom: number;
  volatilityScore: number;
  sourceType: "real";
  sourceUrl: string;
  checkedAt: string;
};

export type KrebApiFetchResult = {
  checkedAt: string;
  sourceUrl: string;
  saleTableId: string;
  rentTableId: string;
  monthFrom: string;
  monthTo: string;
  rows: KrebNormalizedRegionIndex[];
  raw: {
    saleItems: KrebApiItem[];
    rentItems: KrebApiItem[];
    regions: Array<{
      target: KrebTargetRegion;
      saleClsId: string;
      rentClsId: string;
      saleRows: KrebApiDataRow[];
      rentRows: KrebApiDataRow[];
    }>;
  };
};

type KrebApiTableResponse = {
  [key: string]: Array<{ head?: Array<Record<string, unknown>>; row?: unknown[] }>;
};

export type KrebApiItem = {
  STATBL_ID: string;
  ITM_TAG: string;
  ITM_ID: number | string;
  PAR_ITM_ID?: number | string | null;
  ITM_NM: string;
  ITM_FULLNM: string;
  UI_NM?: string | null;
};

export type KrebApiDataRow = {
  STATBL_ID: string;
  DTACYCLE_CD: string;
  WRTTIME_IDTFR_ID: string;
  CLS_ID: number | string;
  CLS_NM: string;
  DTA_VAL: number | string;
  CLS_FULLNM?: string | null;
  WRTTIME_DESC?: string | null;
};

const DEFAULT_RONE_OPEN_API_BASE_URL = "https://www.reb.or.kr/r-one/openapi";
export const KREB_APARTMENT_SALE_INDEX_TABLE_ID = "A_2024_00045";
export const KREB_APARTMENT_RENT_INDEX_TABLE_ID = "A_2024_00050";

export const DEFAULT_KREB_TARGET_REGIONS: KrebTargetRegion[] = [
  { region: "대구 수성구", lawdCode5: "27260", clsFullName: "대구>수성구" },
  { region: "대구 동구", lawdCode5: "27140", clsFullName: "대구>동구" },
  { region: "대구 북구", lawdCode5: "27230", clsFullName: "대구>북구" },
  { region: "대구 중구", lawdCode5: "27110", clsFullName: "대구>중구" },
  { region: "서울 성동구", lawdCode5: "11200", clsFullName: "서울>성동구" }
];

export class KrebClient {
  isConfigured() {
    return Boolean(process.env.KREB_API_KEY || process.env.KREB_SOURCE_URL);
  }

  async getRegionIndexSnapshots() {
    return loadKrebRegionIndex();
  }

  async fetchRegionIndexFromApi(options?: {
    apiKey?: string;
    monthFrom?: string;
    monthTo?: string;
    targetRegions?: KrebTargetRegion[];
  }) {
    return fetchKrebRegionIndexFromRone({
      apiKey: options?.apiKey ?? process.env.KREB_API_KEY,
      monthFrom: options?.monthFrom ?? process.env.KREB_MONTH_FROM ?? "202501",
      monthTo: options?.monthTo ?? process.env.KREB_MONTH_TO ?? process.env.TARGET_MONTH_TO ?? defaultKrebMonthTo(),
      targetRegions: options?.targetRegions ?? DEFAULT_KREB_TARGET_REGIONS
    });
  }
}

export async function fetchKrebRegionIndexFromRone(input: {
  apiKey?: string;
  monthFrom: string;
  monthTo: string;
  targetRegions: KrebTargetRegion[];
}): Promise<KrebApiFetchResult> {
  if (!input.apiKey) {
    throw new Error("KREB_API_KEY is required to fetch R-ONE real data.");
  }

  const checkedAt = new Date().toISOString();
  const sourceUrl = `${DEFAULT_RONE_OPEN_API_BASE_URL}/SttsApiTblData.do`;
  const [saleItems, rentItems] = await Promise.all([
    fetchKrebItems(input.apiKey, KREB_APARTMENT_SALE_INDEX_TABLE_ID),
    fetchKrebItems(input.apiKey, KREB_APARTMENT_RENT_INDEX_TABLE_ID)
  ]);

  const rawRegions = [];
  const normalizedRows: KrebNormalizedRegionIndex[] = [];
  for (const target of input.targetRegions) {
    const saleItem = findKrebRegionItem(saleItems, target);
    const rentItem = findKrebRegionItem(rentItems, target);
    const [saleRows, rentRows] = await Promise.all([
      fetchKrebIndexRows({
        apiKey: input.apiKey,
        statblId: KREB_APARTMENT_SALE_INDEX_TABLE_ID,
        clsId: String(saleItem.ITM_ID),
        monthFrom: input.monthFrom,
        monthTo: input.monthTo
      }),
      fetchKrebIndexRows({
        apiKey: input.apiKey,
        statblId: KREB_APARTMENT_RENT_INDEX_TABLE_ID,
        clsId: String(rentItem.ITM_ID),
        monthFrom: input.monthFrom,
        monthTo: input.monthTo
      })
    ]);
    const row = normalizeKrebRegionRow({
      target,
      saleRows,
      rentRows,
      sourceUrl,
      checkedAt
    });
    normalizedRows.push(row);
    rawRegions.push({
      target,
      saleClsId: String(saleItem.ITM_ID),
      rentClsId: String(rentItem.ITM_ID),
      saleRows,
      rentRows
    });
  }

  return {
    checkedAt,
    sourceUrl,
    saleTableId: KREB_APARTMENT_SALE_INDEX_TABLE_ID,
    rentTableId: KREB_APARTMENT_RENT_INDEX_TABLE_ID,
    monthFrom: input.monthFrom,
    monthTo: input.monthTo,
    rows: normalizedRows,
    raw: {
      saleItems,
      rentItems,
      regions: rawRegions
    }
  };
}

async function fetchKrebItems(apiKey: string, statblId: string) {
  const payload = await requestKrebApi<KrebApiTableResponse>("SttsApiTblItm", {
    Key: apiKey,
    Type: "json",
    pIndex: "1",
    pSize: "1000",
    STATBL_ID: statblId
  });
  return extractKrebRows<KrebApiItem>(payload, "SttsApiTblItm");
}

async function fetchKrebIndexRows(input: {
  apiKey: string;
  statblId: string;
  clsId: string;
  monthFrom: string;
  monthTo: string;
}) {
  const payload = await requestKrebApi<KrebApiTableResponse>("SttsApiTblData", {
    Key: input.apiKey,
    Type: "json",
    pIndex: "1",
    pSize: "1000",
    STATBL_ID: input.statblId,
    DTACYCLE_CD: "MM",
    CLS_ID: input.clsId,
    START_WRTTIME: input.monthFrom,
    END_WRTTIME: input.monthTo
  });
  return extractKrebRows<KrebApiDataRow>(payload, "SttsApiTblData");
}

async function requestKrebApi<T>(endpoint: string, params: Record<string, string>) {
  const url = new URL(`${DEFAULT_RONE_OPEN_API_BASE_URL}/${endpoint}.do`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const response = await fetch(url, { headers: { accept: "application/json" } });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`KREB ${endpoint} failed: ${response.status}`);
  }
  if (/^\s*</.test(text)) {
    throw new Error(`KREB ${endpoint} returned HTML instead of JSON. Check endpoint or API key.`);
  }
  const payload = JSON.parse(text) as T;
  const result = findKrebResult(payload as KrebApiTableResponse);
  const code = String(result?.CODE ?? "");
  if (code && code !== "INFO-000") {
    throw new Error(`KREB ${endpoint} error ${code}: ${String(result?.MESSAGE ?? "unknown")}`);
  }
  return payload;
}

function extractKrebRows<T>(payload: KrebApiTableResponse, rootKey: string) {
  const rows = payload[rootKey]?.find((entry) => Array.isArray(entry.row))?.row;
  return (rows ?? []) as T[];
}

function findKrebResult(payload: KrebApiTableResponse) {
  for (const entries of Object.values(payload)) {
    for (const entry of entries) {
      const result = entry.head?.find((head) => "RESULT" in head)?.RESULT;
      if (result && typeof result === "object") return result as { CODE?: string; MESSAGE?: string };
    }
  }
  return null;
}

function findKrebRegionItem(items: KrebApiItem[], target: KrebTargetRegion) {
  const byFullName = items.find((item) => normalizeKrebName(item.ITM_FULLNM) === normalizeKrebName(target.clsFullName));
  if (byFullName) return byFullName;
  const [parentName, childName] = target.clsFullName.split(">");
  const byParentAndName = items.find(
    (item) => item.ITM_NM === childName && item.ITM_FULLNM?.includes(parentName)
  );
  if (byParentAndName) return byParentAndName;
  throw new Error(`KREB region item not found for ${target.region} (${target.clsFullName}).`);
}

function normalizeKrebRegionRow(input: {
  target: KrebTargetRegion;
  saleRows: KrebApiDataRow[];
  rentRows: KrebApiDataRow[];
  sourceUrl: string;
  checkedAt: string;
}): KrebNormalizedRegionIndex {
  const saleByMonth = indexRowsByMonth(input.saleRows);
  const rentByMonth = indexRowsByMonth(input.rentRows);
  const commonMonths = [...saleByMonth.keys()].filter((month) => rentByMonth.has(month)).sort();
  const latestMonth = commonMonths.at(-1);
  if (!latestMonth) {
    throw new Error(`KREB data has no common sale/rent month for ${input.target.region}.`);
  }
  const previousMonth = commonMonths[commonMonths.length - 2];
  const saleIndex = saleByMonth.get(latestMonth) ?? 0;
  const rentIndex = rentByMonth.get(latestMonth) ?? 0;
  const previousSale = previousMonth ? saleByMonth.get(previousMonth) : undefined;
  const previousRent = previousMonth ? rentByMonth.get(previousMonth) : undefined;
  const saleChanges = monthlyPctChanges(commonMonths.map((month) => saleByMonth.get(month) ?? 0)).slice(-12);

  return {
    month: `${latestMonth.slice(0, 4)}-${latestMonth.slice(4, 6)}`,
    region: input.target.region,
    lawdCode5: input.target.lawdCode5,
    saleIndex: round(saleIndex, 3),
    rentIndex: round(rentIndex, 3),
    saleMom: round(percentChange(saleIndex, previousSale), 3),
    rentMom: round(percentChange(rentIndex, previousRent), 3),
    volatilityScore: round(clamp(standardDeviation(saleChanges) * 45, 5, 95), 1),
    sourceType: "real",
    sourceUrl: input.sourceUrl,
    checkedAt: input.checkedAt
  };
}

function indexRowsByMonth(rows: KrebApiDataRow[]) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const month = String(row.WRTTIME_IDTFR_ID ?? "");
    const value = Number(row.DTA_VAL);
    if (/^\d{6}$/.test(month) && Number.isFinite(value)) {
      map.set(month, value);
    }
  }
  return map;
}

function monthlyPctChanges(values: number[]) {
  const changes: number[] = [];
  for (let index = 1; index < values.length; index += 1) {
    changes.push(percentChange(values[index], values[index - 1]));
  }
  return changes.filter((value) => Number.isFinite(value));
}

function percentChange(current: number, previous?: number) {
  if (!previous) return 0;
  return ((current / previous) - 1) * 100;
}

function standardDeviation(values: number[]) {
  if (!values.length) return 0;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function normalizeKrebName(value?: string | null) {
  return (value ?? "").replace(/\s+/g, "");
}

function defaultKrebMonthTo() {
  const now = new Date();
  const month = now.getUTCMonth();
  const year = now.getUTCFullYear();
  const completeMonth = month <= 0 ? 12 : month;
  const completeYear = month <= 0 ? year - 1 : year;
  return `${completeYear}${String(completeMonth).padStart(2, "0")}`;
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
