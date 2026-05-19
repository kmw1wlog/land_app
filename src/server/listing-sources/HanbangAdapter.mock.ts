import type { ExternalListingDraft, ListingSourceAdapter } from "./ListingSourceAdapter";

export class HanbangAdapterMock implements ListingSourceAdapter {
  sourceName = "hanbang_mock";

  async fetchListings(): Promise<ExternalListingDraft[]> {
    return [
      {
        sourceId: "hanbang-mock-1",
        title: "수성구 제휴 매물 mock",
        address: "대구 수성구 범어동",
        region: "대구 수성구",
        propertyType: "apartment",
        transactionType: "sale",
        salePrice: 620_000_000,
        deposit: 0,
        monthlyRent: 0,
        photoLicenseStatus: "declared",
        sourceAttribution: "제휴 API 연결 전 mock 데이터"
      }
    ];
  }
}
