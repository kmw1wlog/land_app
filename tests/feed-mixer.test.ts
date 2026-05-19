import { describe, expect, it } from "vitest";
import { properties, sampleHomes, sampleProfiles } from "@/data/dummy";
import { buildMixedFeed } from "@/lib/feedMixer";
import { analyzePropertyForUser } from "@/lib/calculations";
import { explainFeedCard } from "@/lib/feedExplain";

describe("feed mixer", () => {
  it("classifies and mixes cards with explicit reasons", () => {
    const feed = buildMixedFeed(properties, sampleProfiles[0], sampleHomes[0]);
    expect(feed.length).toBeGreaterThan(0);
    expect(feed[0].feedCardType).toBeTruthy();
    expect(feed[0].reason.length).toBeGreaterThan(4);
    expect(new Set(feed.map((item) => item.property.id)).size).toBe(feed.length);
  });

  it("explains why a card appears", () => {
    const property = properties[0];
    const analysis = analyzePropertyForUser(sampleProfiles[0], sampleHomes[0], property);
    const reasons = explainFeedCard(property, analysis, "sell_current_home");
    expect(reasons.length).toBeGreaterThanOrEqual(3);
  });
});
