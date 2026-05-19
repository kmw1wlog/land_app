export interface ExternalListingDraft {
  sourceId: string;
  title: string;
  address: string;
  region: string;
  propertyType: string;
  transactionType: string;
  salePrice: number;
  deposit?: number;
  monthlyRent?: number;
  photoLicenseStatus: "declared" | "verified" | "rejected";
  sourceAttribution: string;
}

export interface ListingSourceAdapter {
  sourceName: string;
  fetchListings(): Promise<ExternalListingDraft[]>;
}
