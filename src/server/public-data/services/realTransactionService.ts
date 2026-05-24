import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client";
import { DataGoKrClient } from "../clients/dataGoKrClient";
import { mockTransactions } from "../adapters/mockPublicDataAdapter";
import type {
  PublicDataTransactionItem,
  SeedEndpointResult,
  SeedWriteStats
} from "../types";
import { getPublicDataMode, getTargetConfig } from "../utils/env";
import { monthRange } from "../utils/dateRange";
import { asArray, getPath } from "../utils/xml";
import { parseKoreanMoneyToWon, parseNumber } from "../utils/money";
import { sha256 } from "../utils/hash";
import { buildPnu, parseJibun } from "../utils/pnu";

type TransactionEndpointKey =
  | "apartmentTrade"
  | "apartmentRent"
  | "officetelTrade"
  | "officetelRent"
  | "rowHouseTrade"
  | "rowHouseRent"
  | "detachedHouseTrade"
  | "detachedHouseRent"
  | "commercialTrade"
  | "landTrade";

const endpoints: Record<TransactionEndpointKey, string> = {
  apartmentTrade:
    process.env.DATA_GO_KR_APARTMENT_TRADE_ENDPOINT ||
    "/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade",
  apartmentRent:
    process.env.DATA_GO_KR_APARTMENT_RENT_ENDPOINT ||
    "/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent",
  officetelTrade:
    process.env.DATA_GO_KR_OFFICETEL_TRADE_ENDPOINT ||
    "/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade",
  officetelRent:
    process.env.DATA_GO_KR_OFFICETEL_RENT_ENDPOINT ||
    "/1613000/RTMSDataSvcOffiRent/getRTMSDataSvcOffiRent",
  rowHouseTrade:
    process.env.DATA_GO_KR_ROWHOUSE_TRADE_ENDPOINT ||
    "/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade",
  rowHouseRent:
    process.env.DATA_GO_KR_ROWHOUSE_RENT_ENDPOINT ||
    "/1613000/RTMSDataSvcRHRent/getRTMSDataSvcRHRent",
  detachedHouseTrade:
    process.env.DATA_GO_KR_DETACHED_TRADE_ENDPOINT ||
    "/1613000/RTMSDataSvcSHTrade/getRTMSDataSvcSHTrade",
  detachedHouseRent:
    process.env.DATA_GO_KR_DETACHED_RENT_ENDPOINT ||
    "/1613000/RTMSDataSvcSHRent/getRTMSDataSvcSHRent",
  commercialTrade:
    process.env.DATA_GO_KR_COMMERCIAL_TRADE_ENDPOINT ||
    "/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade",
  landTrade:
    process.env.DATA_GO_KR_LAND_TRADE_ENDPOINT ||
    "/1613000/RTMSDataSvcLandTrade/getRTMSDataSvcLandTrade"
};

const endpointMeta: Record<
  TransactionEndpointKey,
  { propertyType: string; dealType: string }
> = {
  apartmentTrade: { propertyType: "apartment", dealType: "trade" },
  apartmentRent: { propertyType: "apartment", dealType: "rent" },
  officetelTrade: { propertyType: "officetel", dealType: "trade" },
  officetelRent: { propertyType: "officetel", dealType: "rent" },
  rowHouseTrade: { propertyType: "row_house", dealType: "trade" },
  rowHouseRent: { propertyType: "row_house", dealType: "rent" },
  detachedHouseTrade: { propertyType: "detached_house", dealType: "trade" },
  detachedHouseRent: { propertyType: "detached_house", dealType: "rent" },
  commercialTrade: { propertyType: "commercial", dealType: "trade" },
  landTrade: { propertyType: "land", dealType: "trade" }
};

const TRANSACTION_PAGE_SIZE = 1000;
const MAX_TRANSACTION_PAGES = 30;

export async function fetchApartmentTrade(lawdCode5: string, dealYmd: string) {
  return fetchTransactions("apartmentTrade", lawdCode5, dealYmd);
}

export async function fetchApartmentRent(lawdCode5: string, dealYmd: string) {
  return fetchTransactions("apartmentRent", lawdCode5, dealYmd);
}

export async function fetchOfficetelTrade(lawdCode5: string, dealYmd: string) {
  return fetchTransactions("officetelTrade", lawdCode5, dealYmd);
}

export async function fetchOfficetelRent(lawdCode5: string, dealYmd: string) {
  return fetchTransactions("officetelRent", lawdCode5, dealYmd);
}

export async function fetchRowHouseTrade(lawdCode5: string, dealYmd: string) {
  return fetchTransactions("rowHouseTrade", lawdCode5, dealYmd);
}

export async function fetchRowHouseRent(lawdCode5: string, dealYmd: string) {
  return fetchTransactions("rowHouseRent", lawdCode5, dealYmd);
}

export async function fetchDetachedHouseTrade(lawdCode5: string, dealYmd: string) {
  return fetchTransactions("detachedHouseTrade", lawdCode5, dealYmd);
}

export async function fetchDetachedHouseRent(lawdCode5: string, dealYmd: string) {
  return fetchTransactions("detachedHouseRent", lawdCode5, dealYmd);
}

export async function fetchCommercialTrade(lawdCode5: string, dealYmd: string) {
  return fetchTransactions("commercialTrade", lawdCode5, dealYmd);
}

export async function fetchLandTrade(lawdCode5: string, dealYmd: string) {
  return fetchTransactions("landTrade", lawdCode5, dealYmd);
}

export async function seedTransactionsForTargets(options?: {
  lawdCodes?: string[];
  from?: string;
  to?: string;
  propertyTypes?: string[];
  dealTypes?: string[];
  dryRun?: boolean;
  allowLarge?: boolean;
}) {
  const target = getTargetConfig();
  const mode = getPublicDataMode();
  const lawdCodes = options?.lawdCodes?.length ? options.lawdCodes : target.lawdCodes;
  const months = monthRange(options?.from ?? target.monthFrom, options?.to ?? target.monthTo);
  const propertyTypes = options?.propertyTypes ?? ["apartment"];
  const dealTypes = options?.dealTypes ?? ["trade", "rent"];

  if (!options?.allowLarge && (lawdCodes.length > 1 || months.length > 3)) {
    return {
      mode,
      summary: { inserted: 0, updated: 0, skipped: 0, failed: 1 },
      results: [],
      error: "Seed range is limited to 1 lawdCode x 3 months unless allowLarge=true"
    };
  }

  const results: SeedEndpointResult[] = [];
  for (const lawdCode of lawdCodes) {
    for (const month of months) {
      const keys = requestedEndpointKeys(propertyTypes, dealTypes);
      for (const key of keys) {
        results.push(await fetchTransactions(key, lawdCode, month, { dryRun: options?.dryRun }));
      }
    }
  }

  return {
    mode,
    summary: {
      inserted: results.reduce((sum, item) => sum + item.inserted, 0),
      updated: results.reduce((sum, item) => sum + item.updated, 0),
      skipped: results.reduce((sum, item) => sum + item.skipped, 0),
      failed: results.filter((item) => item.status === "error").length
    },
    results
  };
}

export function shouldPersistMockTransactions(mode: string) {
  return mode === "mock";
}

function requestedEndpointKeys(propertyTypes: string[], dealTypes: string[]) {
  return (Object.keys(endpointMeta) as TransactionEndpointKey[]).filter((key) => {
    const meta = endpointMeta[key];
    return propertyTypes.includes(meta.propertyType) && dealTypes.includes(meta.dealType);
  });
}

async function fetchTransactions(
  endpointKey: TransactionEndpointKey,
  lawdCode5: string,
  dealYmd: string,
  options: { dryRun?: boolean } = {}
): Promise<SeedEndpointResult> {
  const client = new DataGoKrClient();
  const mode = getPublicDataMode();
  const meta = endpointMeta[endpointKey];
  const baseResult = {
    lawdCode: lawdCode5,
    month: dealYmd,
    propertyType: meta.propertyType,
    dealType: meta.dealType,
    sourceType: endpointKey
  };

  if (!client.isConfigured()) {
    if (shouldPersistMockTransactions(mode)) {
      const stats = await saveTransactions(mockTransactions(lawdCode5), options);
      return { ...baseResult, ...stats, status: options.dryRun ? "dry_run" : "ok" };
    }
    return {
      ...baseResult,
      inserted: 0,
      updated: 0,
      skipped: 0,
      status: "error",
      failed: "DATA_GO_KR_SERVICE_KEY is not configured"
    };
  }

  try {
    const rawItems: unknown[] = [];
    let pageNo = 1;
    let totalPages = 1;
    do {
      const response = await client.getXml(endpoints[endpointKey], {
        LAWD_CD: lawdCode5,
        DEAL_YMD: dealYmd,
        numOfRows: TRANSACTION_PAGE_SIZE,
        pageNo
      });
      rawItems.push(...asArray(getPath(response.parsed, ["response", "body", "items", "item"])));
      const totalCount = Number(getPath(response.parsed, ["response", "body", "totalCount"]) ?? rawItems.length);
      totalPages = Math.max(1, Math.ceil(totalCount / TRANSACTION_PAGE_SIZE));
      pageNo += 1;
    } while (pageNo <= totalPages && pageNo <= MAX_TRANSACTION_PAGES);

    const normalized = rawItems.map((item) =>
      withExternalKey(
        normalizeTransactionItem(item as Record<string, unknown>, {
          sourceType: endpointKey,
          propertyType: meta.propertyType,
          dealType: meta.dealType,
          lawdCode5
        })
      )
    );
    const stats = await saveTransactions(normalized, options);
    return { ...baseResult, ...stats, status: options.dryRun ? "dry_run" : "ok" };
  } catch (error) {
    if (shouldPersistMockTransactions(mode)) {
      const fallback = mockTransactions(lawdCode5).map((item) =>
        withExternalKey({
          ...item,
          sourceType: `${endpointKey}:mock`,
          raw: {
            error: error instanceof Error ? error.message : String(error),
            fallback: true
          }
        })
      );
      const stats = await saveTransactions(fallback, options);
      return { ...baseResult, ...stats, status: options.dryRun ? "dry_run" : "ok" };
    }

    return {
      ...baseResult,
      inserted: 0,
      updated: 0,
      skipped: 0,
      status: "error",
      failed: error instanceof Error ? error.message : String(error)
    };
  }
}

function normalizeTransactionItem(
  item: Record<string, unknown>,
  base: Pick<PublicDataTransactionItem, "sourceType" | "propertyType" | "dealType" | "lawdCode5">
): PublicDataTransactionItem {
  const dealAmount =
    parseKoreanMoneyToWon(item.거래금액 ?? item.dealAmount ?? item.거래금액만원) ?? null;
  const deposit = parseKoreanMoneyToWon(item.보증금액 ?? item.deposit) ?? null;
  const monthlyRent = parseKoreanMoneyToWon(item.월세금액 ?? item.monthlyRent) ?? null;

  return {
    ...base,
    legalDong: stringOrNull(item.법정동 ?? item.umdNm),
    jibun: stringOrNull(item.지번 ?? item.jibun),
    complexName: stringOrNull(item.아파트 ?? item.단지 ?? item.aptNm),
    buildingName: stringOrNull(item.건물명 ?? item.buildingName ?? item.아파트),
    floor: parseNumber(item.층 ?? item.floor),
    areaM2: parseNumber(item.전용면적 ?? item.excluUseAr ?? item.area),
    dealYear: parseNumber(item.년 ?? item.dealYear),
    dealMonth: parseNumber(item.월 ?? item.dealMonth),
    dealDay: parseNumber(item.일 ?? item.dealDay),
    dealAmount,
    deposit,
    monthlyRent,
    builtYear: parseNumber(item.건축년도 ?? item.buildYear),
    raw: item
  };
}

function withExternalKey(item: PublicDataTransactionItem): PublicDataTransactionItem {
  const parts = [
    item.sourceType,
    item.propertyType,
    item.dealType,
    item.lawdCode5,
    item.legalDong,
    item.jibun,
    item.complexName,
    item.buildingName,
    item.areaM2,
    item.floor,
    item.dealYear,
    item.dealMonth,
    item.dealDay,
    item.dealAmount,
    item.deposit,
    item.monthlyRent
  ];
  return {
    ...item,
    externalKey: sha256(parts.map((part) => String(part ?? "")).join("|"))
  };
}

async function saveTransactions(
  items: PublicDataTransactionItem[],
  options: { dryRun?: boolean } = {}
): Promise<SeedWriteStats> {
  const stats = { inserted: 0, updated: 0, skipped: 0 };
  const identityCache = new Map<string, { legalDongCode10: string | null; pnu: string | null }>();

  if (options.dryRun) {
    return { inserted: items.length, updated: 0, skipped: 0 };
  }

  for (const item of items) {
    const identity = await enrichTransactionIdentity(item, identityCache);
    const externalKey = item.externalKey ?? withExternalKey(item).externalKey;
    if (!externalKey) {
      stats.skipped += 1;
      continue;
    }

    const data = {
      sourceType: item.sourceType,
      propertyType: item.propertyType,
      dealType: item.dealType,
      lawdCode5: item.lawdCode5,
      legalDongCode10: item.legalDongCode10 ?? identity.legalDongCode10,
      pnu: item.pnu ?? identity.pnu,
      legalDong: item.legalDong,
      jibun: item.jibun,
      complexName: item.complexName,
      buildingName: item.buildingName,
      floor: item.floor,
      areaM2: item.areaM2,
      dealYear: item.dealYear,
      dealMonth: item.dealMonth,
      dealDay: item.dealDay,
      dealAmount: item.dealAmount,
      deposit: item.deposit,
      monthlyRent: item.monthlyRent,
      builtYear: item.builtYear,
      raw: item.raw as Prisma.InputJsonValue
    };
    const existing = await prisma.realTransaction.findUnique({ where: { externalKey } });

    if (existing) {
      await prisma.$transaction([
        prisma.realTransaction.update({ where: { externalKey }, data }),
        prisma.realTransactionAudit.create({
          data: {
            externalKey,
            action: "upsert_update",
            before: existing as unknown as Prisma.InputJsonValue,
            after: data as Prisma.InputJsonValue
          }
        })
      ]);
      stats.updated += 1;
    } else {
      await prisma.$transaction([
        prisma.realTransaction.create({
          data: {
            externalKey,
            ...data
          },
          select: { id: true }
        }),
        prisma.realTransactionAudit.create({
          data: {
            externalKey,
            action: "insert",
            after: data as Prisma.InputJsonValue
          }
        })
      ]);
      stats.inserted += 1;
    }
  }

  return stats;
}

async function enrichTransactionIdentity(
  item: PublicDataTransactionItem,
  cache: Map<string, { legalDongCode10: string | null; pnu: string | null }>
) {
  if (item.legalDongCode10 || item.pnu) {
    return { legalDongCode10: item.legalDongCode10 ?? null, pnu: item.pnu ?? null };
  }

  const key = [item.lawdCode5, item.legalDong, item.jibun].join("|");
  const cached = cache.get(key);
  if (cached) return cached;

  const parsedJibun = parseJibun(item.jibun);
  let legalDongCode10: string | null = null;
  let pnu: string | null = null;

  if (item.legalDong) {
    const legalDong = await prisma.legalDongCode.findFirst({
      where: {
        lawdCode5: item.lawdCode5,
        isActive: true,
        OR: [
          { fullName: { contains: item.legalDong.trim() } },
          { eupmyeon: { contains: item.legalDong.trim() } },
          { ri: { contains: item.legalDong.trim() } }
        ]
      },
      orderBy: { fullName: "asc" }
    });
    legalDongCode10 = legalDong?.code10 ?? null;
  }

  if (legalDongCode10 && parsedJibun) {
    pnu = buildPnu({
      legalDongCode10,
      mountainFlag: parsedJibun.mountainFlag,
      bun: parsedJibun.bun,
      ji: parsedJibun.ji
    });
  }

  const result = { legalDongCode10, pnu };
  cache.set(key, result);
  return result;
}

function stringOrNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}
