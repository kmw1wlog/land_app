import type { NormalizedAddressResult, PublicDataTransactionItem } from "../types";
import { buildPnu, parseJibun } from "../utils/pnu";

export function mockNormalizeAddress(inputAddress: string): NormalizedAddressResult {
  const isSuseong = inputAddress.includes("수성구") || inputAddress.includes("범어");
  const legalDongCode10 = isSuseong ? "2726010100" : "1120011400";
  const parsed = parseJibun(inputAddress) ?? {
    mountainFlag: "0" as const,
    bun: "0123",
    ji: "0004"
  };

  return {
    source: "mock",
    inputAddress,
    roadAddress: null,
    jibunAddress: inputAddress,
    legalDongCode10,
    lawdCode5: legalDongCode10.slice(0, 5),
    mountainFlag: parsed.mountainFlag,
    bun: parsed.bun,
    ji: parsed.ji,
    pnu: buildPnu({
      legalDongCode10,
      mountainFlag: parsed.mountainFlag,
      bun: parsed.bun,
      ji: parsed.ji
    }),
    lat: null,
    lng: null,
    warnings: ["Juso 승인키가 없어서 mock 정규화 결과를 사용했습니다."]
  };
}

export function mockTransactions(lawdCode5 = "27260"): PublicDataTransactionItem[] {
  return [
    {
      sourceType: "mock",
      propertyType: "apartment",
      dealType: "trade",
      lawdCode5,
      legalDong: "범어동",
      jibun: "123-4",
      complexName: "범어예시아파트",
      floor: 12,
      areaM2: 84.9,
      dealYear: 2026,
      dealMonth: 3,
      dealDay: 18,
      dealAmount: 650_000_000,
      builtYear: 2015,
      raw: { mock: true }
    },
    {
      sourceType: "mock",
      propertyType: "apartment",
      dealType: "rent",
      lawdCode5,
      legalDong: "범어동",
      jibun: "123-4",
      complexName: "범어예시아파트",
      floor: 8,
      areaM2: 84.9,
      dealYear: 2026,
      dealMonth: 2,
      dealDay: 7,
      deposit: 390_000_000,
      monthlyRent: 0,
      builtYear: 2015,
      raw: { mock: true }
    }
  ];
}
