import type { ExternalListingDraft, ListingSourceAdapter } from "./ListingSourceAdapter";

export class PartnerFeedAdapterMock implements ListingSourceAdapter {
  sourceName = "partner_feed_mock";

  async fetchListings(): Promise<ExternalListingDraft[]> {
    return [
      {
        sourceId: "partner-feed-mock-1",
        title: "직영 검토 후보 mock",
        address: "서울 성동구 성수동",
        region: "서울 성동구",
        propertyType: "officetel",
        transactionType: "monthly_rent",
        salePrice: 780_000_000,
        deposit: 80_000_000,
        monthlyRent: 1_900_000,
        photoLicenseStatus: "declared",
        sourceAttribution: "명시적 제휴 feed 연결 전 mock 데이터"
      }
    ];
  }
}
