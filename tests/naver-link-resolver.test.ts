import { beforeEach, describe, expect, test, vi } from "vitest";

const findFirst = vi.fn();

vi.mock("@/server/db", () => ({
  prisma: {
    externalComplexLinkMapping: {
      findFirst
    }
  }
}));

describe("naver real estate link resolver", () => {
  beforeEach(() => {
    findFirst.mockReset();
  });

  test("uses verified mapping as exact mapped complex", async () => {
    findFirst.mockResolvedValue({
      externalUrl: "https://new.land.naver.com/complexes/123",
      matchType: "manual_admin"
    });
    const { resolveNaverRealEstateLink } = await import("@/server/external-links/naverRealEstateLinkResolver");
    const result = await resolveNaverRealEstateLink({
      lawdCode5: "27260",
      region: "대구 수성구",
      complexName: "범어 테스트아파트",
      propertyType: "apartment"
    });
    expect(result.accuracyLevel).toBe("exact_mapped_complex");
    expect(result.url).toContain("naver.com");
  });

  test("falls back to generated search URL without fetching naver", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    findFirst.mockResolvedValue(null);
    const { resolveNaverRealEstateLink } = await import("@/server/external-links/naverRealEstateLinkResolver");
    const result = await resolveNaverRealEstateLink({
      lawdCode5: "27260",
      region: "대구 수성구",
      legalDong: "범어동",
      complexName: "범어 테스트아파트",
      propertyType: "apartment"
    });
    expect(result.source).toBe("generated_search");
    expect(result.url).toContain("search.naver.com");
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  test("rejects non-naver domains", async () => {
    const { isAllowedNaverUrl } = await import("@/server/external-links/naverRealEstateLinkResolver");
    expect(isAllowedNaverUrl("https://new.land.naver.com/complexes/123")).toBe(true);
    expect(isAllowedNaverUrl("https://example.com/complexes/123")).toBe(false);
    expect(isAllowedNaverUrl("http://naver.com/unsafe")).toBe(false);
  });
});
