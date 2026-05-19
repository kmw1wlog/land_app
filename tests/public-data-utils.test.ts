import { describe, expect, it } from "vitest";
import { monthRange } from "@/server/public-data/utils/dateRange";
import { normalizeServiceKeyForUrlSearchParams } from "@/server/public-data/utils/env";
import { parseKoreanMoneyToWon } from "@/server/public-data/utils/money";
import { buildPnu, normalizeBunJi, splitPnu } from "@/server/public-data/utils/pnu";
import { median } from "@/server/public-data/services/valuationService";

describe("public data utilities", () => {
  it("normalizes raw and encoded service keys without double encoding", () => {
    const raw = "abc/def+ghi=";
    const encoded = "abc%2Fdef%2Bghi%3D";
    const rawUrl = new URL("https://example.com");
    const encodedUrl = new URL("https://example.com");

    rawUrl.searchParams.set("serviceKey", normalizeServiceKeyForUrlSearchParams(raw));
    encodedUrl.searchParams.set("serviceKey", normalizeServiceKeyForUrlSearchParams(encoded));

    expect(rawUrl.toString()).toContain("serviceKey=abc%2Fdef%2Bghi%3D");
    expect(encodedUrl.toString()).toContain("serviceKey=abc%2Fdef%2Bghi%3D");
  });

  it("normalizes bun/ji to four digits", () => {
    expect(normalizeBunJi("123")).toBe("0123");
    expect(normalizeBunJi("4")).toBe("0004");
    expect(normalizeBunJi(null)).toBe("0000");
  });

  it("builds and splits PNU", () => {
    const pnu = buildPnu({
      legalDongCode10: "2726010100",
      mountainFlag: "0",
      bun: "123",
      ji: "4"
    });

    expect(pnu).toBe("2726010100001230004");
    expect(splitPnu(pnu)).toEqual({
      legalDongCode10: "2726010100",
      mountainFlag: "0",
      bun: "0123",
      ji: "0004"
    });
  });

  it("generates inclusive month ranges", () => {
    expect(monthRange("202511", "202602")).toEqual(["202511", "202512", "202601", "202602"]);
  });

  it("parses public transaction money strings", () => {
    expect(parseKoreanMoneyToWon("65,000")).toBe(650_000_000);
    expect(parseKoreanMoneyToWon("6억 5,000")).toBe(650_000_000);
  });

  it("calculates median comparable values", () => {
    expect(median([30, 10, 20])).toBe(20);
    expect(median([10, 40, 20, 30])).toBe(25);
    expect(median([])).toBeNull();
  });
});
