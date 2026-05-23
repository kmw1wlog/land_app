import { describe, expect, it } from "vitest";
import { canExposeListing } from "@/server/brokerage/displayCompliance";
import { publicPhotoAllowed, validateListingPhotoUpload } from "@/server/media/photoPolicy";

describe("listing display and photo policy", () => {
  it("blocks partner/direct public exposure before compliance approval", () => {
    expect(canExposeListing({ listingType: "partner", brokerVerified: true, complianceStatus: "ready" })).toBe(false);
    expect(canExposeListing({ listingType: "direct_verified", brokerVerified: true, complianceStatus: "approved" })).toBe(true);
  });

  it("shows only approved and rights-cleared photos", () => {
    expect(publicPhotoAllowed({ moderationStatus: "approved", licenseStatus: "declared", consentStatus: "owner_confirmed" })).toBe(true);
    expect(publicPhotoAllowed({ moderationStatus: "pending", licenseStatus: "declared", consentStatus: "owner_confirmed" })).toBe(false);
    expect(publicPhotoAllowed({ moderationStatus: "approved", licenseStatus: "rejected", consentStatus: "owner_confirmed" })).toBe(false);
  });

  it("validates image upload type and size", () => {
    const file = { type: "text/plain", size: 1 };
    expect(validateListingPhotoUpload(file).length).toBeGreaterThan(0);
  });
});
