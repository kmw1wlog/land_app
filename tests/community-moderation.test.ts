import { describe, expect, it } from "vitest";
import { moderateCommunityText, shouldBlindPost } from "@/server/community/moderation";

describe("community moderation", () => {
  it("hides prohibited guarantee wording and flags claims", () => {
    const result = moderateCommunityText("급매", "확정수익 보장이라는 글은 막아야 한다");
    expect(result.isHidden).toBe(true);
    expect(result.status).toBe("needs_review");
  });

  it("blinds posts after report threshold", () => {
    expect(shouldBlindPost(2)).toBe(false);
    expect(shouldBlindPost(3)).toBe(true);
  });
});
