import { describe, expect, it } from "vitest";
import { sanitizeLeadPayloadByConsent } from "@/server/brokerage/leadConsentPolicy";

describe("lead consent policy", () => {
  it("does not include financial or current-home details with basic consent only", () => {
    const payload = sanitizeLeadPayloadByConsent({
      userBudget: 800_000_000,
      userCash: 90_000_000,
      userMonthlyIncome: 5_000_000,
      budgetBand: "8억~9억",
      currentHomeSummary: { address: "대구 수성구", loanBalance: 120_000_000 }
    });

    expect(payload.budgetBand).toBe("8억~9억");
    expect(payload.userCash).toBeNull();
    expect(payload.userMonthlyIncome).toBeNull();
    expect(payload.currentHomeSummary).toEqual({});
  });

  it("includes sensitive fields only when the matching consent exists", () => {
    const payload = sanitizeLeadPayloadByConsent({
      userCash: 90_000_000,
      userMonthlyIncome: 5_000_000,
      contactInfo: "010-0000-0000",
      currentHomeSummary: { address: "대구 수성구", loanBalance: 120_000_000 },
      consents: {
        financialInfo: true,
        currentHomeInfo: true,
        contactInfo: true
      }
    });

    expect(payload.userCash?.toString()).toBe("90000000");
    expect(payload.userMonthlyIncome?.toString()).toBe("5000000");
    expect(payload.currentHomeSummary).toEqual({ address: "대구 수성구", loanBalance: 120_000_000 });
    expect(payload.contactInfo).toBe("010-0000-0000");
  });
});
