import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client";
import { DataGoKrClient } from "../clients/dataGoKrClient";
import type { BuildingLedgerLookupParams, NormalizedAddressResult } from "../types";
import { asArray, getPath } from "../utils/xml";
import { parseNumber } from "../utils/money";
import { normalizeBunJi } from "../utils/pnu";

const buildingEndpoint =
  process.env.DATA_GO_KR_BUILDING_LEDGER_TITLE_ENDPOINT ||
  "/1613000/BldRgstHubService/getBrTitleInfo";

export async function fetchTotalTitle(params: BuildingLedgerLookupParams) {
  return fetchTitleLike(
    params,
    process.env.DATA_GO_KR_BUILDING_LEDGER_TOTAL_ENDPOINT || "/1613000/BldRgstHubService/getBrRecapTitleInfo",
    "total_title"
  );
}

export async function fetchTitle(params: BuildingLedgerLookupParams) {
  return fetchTitleLike(params, buildingEndpoint, "title");
}

export async function fetchExclusivePart(params: BuildingLedgerLookupParams) {
  return fetchTitleLike(
    params,
    process.env.DATA_GO_KR_BUILDING_LEDGER_EXPOS_ENDPOINT || "/1613000/BldRgstHubService/getBrExposInfo",
    "exclusive_part"
  );
}

export async function fetchFloorOverview(params: BuildingLedgerLookupParams) {
  return fetchTitleLike(
    params,
    process.env.DATA_GO_KR_BUILDING_LEDGER_FLOOR_ENDPOINT || "/1613000/BldRgstHubService/getBrFlrOulnInfo",
    "floor_overview"
  );
}

export async function fetchRegionDistrict(params: BuildingLedgerLookupParams) {
  return fetchTitleLike(
    params,
    process.env.DATA_GO_KR_BUILDING_LEDGER_REGION_ENDPOINT || "/1613000/BldRgstHubService/getBrJijiguInfo",
    "region_district"
  );
}

export async function fetchBuildingLedgerByNormalizedAddress(address: NormalizedAddressResult) {
  if (!address.legalDongCode10 || !address.bun || !address.ji) {
    throw new Error("Normalized address does not include legal dong code and bun/ji");
  }

  return fetchTitle({
    sigunguCd: address.legalDongCode10.slice(0, 5),
    bjdongCd: address.legalDongCode10.slice(5, 10),
    bun: address.bun,
    ji: address.ji,
    pnu: address.pnu
  });
}

async function fetchTitleLike(params: BuildingLedgerLookupParams, endpoint: string, ledgerType: string) {
  const client = new DataGoKrClient();
  const bun = normalizeBunJi(params.bun);
  const ji = normalizeBunJi(params.ji);

  if (!client.isConfigured()) {
    return prisma.buildingLedger.create({
      data: {
        pnu: params.pnu,
        ledgerType,
        sigunguCd: params.sigunguCd,
        bjdongCd: params.bjdongCd,
        bun,
        ji,
        buildingName: "범어예시아파트",
        mainUse: "공동주택",
        approvalDate: "20150601",
        platArea: 2400,
        archArea: 980,
        totalFloorArea: 18000,
        bcRat: 40.8,
        vlRat: 280.4,
        householdCount: 180,
        familyCount: 0,
        parkingCount: 210,
        raw: { mock: true }
      }
    });
  }

  const response = await client.getJson(endpoint, {
    sigunguCd: params.sigunguCd,
    bjdongCd: params.bjdongCd,
    bun,
    ji,
    numOfRows: 10
  });
  const rawItem = asArray(getPath(response.parsed, ["response", "body", "items", "item"]))[0] as
    | Record<string, unknown>
    | undefined;

  const row = rawItem ?? {};
  return prisma.buildingLedger.create({
    data: {
      pnu: params.pnu,
      ledgerType,
      sigunguCd: params.sigunguCd,
      bjdongCd: params.bjdongCd,
      bun,
      ji,
      buildingName: stringOrNull(row.bldNm ?? row.buildingName),
      mainUse: stringOrNull(row.mainPurpsCdNm ?? row.mainUse),
      approvalDate: stringOrNull(row.useAprDay ?? row.approvalDate),
      platArea: parseNumber(row.platArea),
      archArea: parseNumber(row.archArea),
      totalFloorArea: parseNumber(row.totArea ?? row.totalFloorArea),
      bcRat: parseNumber(row.bcRat),
      vlRat: parseNumber(row.vlRat),
      householdCount: parseNumber(row.hhldCnt),
      familyCount: parseNumber(row.fmlyCnt),
      parkingCount: parseNumber(row.indrMechUtcnt ?? row.parkingCount),
      raw: row as Prisma.JsonObject
    }
  });
}

function stringOrNull(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}
