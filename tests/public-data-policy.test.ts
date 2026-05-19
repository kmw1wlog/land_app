import { describe, expect, it } from "vitest";
import { shouldPersistMockTransactions } from "@/server/public-data/services/realTransactionService";
import { areaBucketOf, normalizeComplexName } from "@/server/public-data/services/valuationService";

describe("public data persistence policy", () => {
  it("stores mock transactions only in mock mode", () => {
    expect(shouldPersistMockTransactions("mock")).toBe(true);
    expect(shouldPersistMockTransactions("live")).toBe(false);
    expect(shouldPersistMockTransactions("mixed")).toBe(false);
  });

  it("normalizes names and area buckets for valuation fallback", () => {
    expect(normalizeComplexName("범어 예시 아파트")).toBe("범어예시");
    expect(areaBucketOf(84.9)).toBe("85");
  });
});
