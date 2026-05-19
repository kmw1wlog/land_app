import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client";
import { VWorldClient } from "../clients/vworldClient";
import { parseNumber } from "../utils/money";

export async function fetchLandInfoByPnu(pnu: string) {
  const existing = await prisma.landInfo.findUnique({ where: { pnu } });
  if (existing) return existing;

  const [cadastral, landUse, publicPrice] = await Promise.allSettled([
    fetchCadastralByPnu(pnu),
    fetchLandUseInfo(pnu),
    fetchPublicLandPrice(pnu)
  ]);
  const cadastralData = cadastral.status === "fulfilled" ? firstRecord(cadastral.value) : {};
  const landUseData = landUse.status === "fulfilled" ? firstRecord(landUse.value) : {};
  const publicPriceData = publicPrice.status === "fulfilled" ? firstRecord(publicPrice.value) : {};

  return prisma.landInfo.upsert({
    where: { pnu },
    update: {
      landCategory: text(cadastralData.jibunJigaNm ?? cadastralData.lndcgrCodeNm ?? cadastralData.landCategory),
      landArea: parseNumber(cadastralData.parea ?? cadastralData.landArea ?? cadastralData.pnuArea),
      useDistrict: text(landUseData.useDistrict ?? landUseData.prposArea1Nm ?? landUseData.spfc),
      officialLandPrice: parseNumber(publicPriceData.pblntfPclnd ?? publicPriceData.officialLandPrice),
      officialLandPriceBaseDate: text(publicPriceData.stdrYear ?? publicPriceData.baseDate),
      raw: {
        cadastral: storageSafe(cadastral),
        landUse: storageSafe(landUse),
        publicPrice: storageSafe(publicPrice)
      } as Prisma.InputJsonValue
    },
    create: {
      pnu,
      landCategory: text(cadastralData.jibunJigaNm ?? cadastralData.lndcgrCodeNm ?? cadastralData.landCategory),
      landArea: parseNumber(cadastralData.parea ?? cadastralData.landArea ?? cadastralData.pnuArea),
      useDistrict: text(landUseData.useDistrict ?? landUseData.prposArea1Nm ?? landUseData.spfc),
      officialLandPrice: parseNumber(publicPriceData.pblntfPclnd ?? publicPriceData.officialLandPrice),
      officialLandPriceBaseDate: text(publicPriceData.stdrYear ?? publicPriceData.baseDate),
      raw: {
        cadastral: storageSafe(cadastral),
        landUse: storageSafe(landUse),
        publicPrice: storageSafe(publicPrice)
      } as Prisma.InputJsonValue
    }
  });
}

export async function fetchCadastralByPnu(pnu: string) {
  const client = new VWorldClient();
  if (!client.isConfigured()) throw new Error("VWORLD_API_KEY is not configured");
  return client.getJson(process.env.VWORLD_CADASTRAL_ENDPOINT || "/req/data", {
    service: "data",
    request: "GetFeature",
    data: "LP_PA_CBND_BUBUN",
    attrFilter: `pnu:=:${pnu}`,
    size: 1
  });
}

export async function fetchLandUseInfo(pnu: string) {
  const client = new VWorldClient();
  if (!client.isConfigured()) throw new Error("VWORLD_API_KEY is not configured");
  return client.getJson(process.env.VWORLD_LAND_USE_ENDPOINT || "/req/data", {
    service: "data",
    request: "GetFeature",
    data: process.env.VWORLD_LAND_USE_DATASET || "LT_C_UQ111",
    attrFilter: `pnu:=:${pnu}`,
    size: 1
  });
}

export async function fetchPublicLandPrice(pnu: string) {
  const client = new VWorldClient();
  if (!client.isConfigured()) throw new Error("VWORLD_API_KEY is not configured");
  return client.getJson(process.env.VWORLD_PUBLIC_LAND_PRICE_ENDPOINT || "/req/data", {
    service: "data",
    request: "GetFeature",
    data: process.env.VWORLD_PUBLIC_LAND_PRICE_DATASET || "LT_C_AA60",
    attrFilter: `pnu:=:${pnu}`,
    size: 1
  });
}

function firstRecord(value: unknown): Record<string, unknown> {
  const maybe = value as {
    response?: { result?: { featureCollection?: { features?: Array<{ properties?: Record<string, unknown> }> } } };
  };
  return maybe.response?.result?.featureCollection?.features?.[0]?.properties ?? {};
}

function storageSafe(result: PromiseSettledResult<unknown>) {
  if (result.status === "rejected") {
      return { status: "error", message: result.reason instanceof Error ? result.reason.message : String(result.reason) };
  }
  const record = firstRecord(result.value);
  return Object.keys(record).length > 0
    ? { status: "ok", properties: JSON.parse(JSON.stringify(record)) as Prisma.InputJsonObject }
    : { status: "empty" };
}

function text(value: unknown) {
  const result = String(value ?? "").trim();
  return result ? result : null;
}
