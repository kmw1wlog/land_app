import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as bonusReadinessGET } from "../app/api/public-data/fusion/bonus-readiness/route";
import { GET as providersGET } from "../app/api/public-data/fusion/providers/route";
import { GET as scoreGET } from "../app/api/public-data/fusion/score/route";

describe("fusion public data APIs", () => {
  it("returns provider readiness with real and seed provider lists", async () => {
    const response = await bonusReadinessGET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.realProviders).toEqual(expect.arrayContaining(["MOLIT", "KREB"]));
    expect(payload.seedProviders).toEqual(expect.arrayContaining(["HUG", "TRANSPORT"]));
    expect(payload.canCheckMultiAgencyFusion).toBe(true);
  });

  it("returns evidence and provider summaries", async () => {
    const response = await providersGET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.providers.MOLIT.sourceType).toBe("real");
    expect(payload.providers.KREB.sourceType).toBe("real");
    expect(payload.evidence.length).toBeGreaterThanOrEqual(4);
  });

  it("returns a region fusion score by lawdCode5", async () => {
    const request = new NextRequest("http://localhost/api/public-data/fusion/score?lawdCode5=27260");
    const response = await scoreGET(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.signal.lawdCode5).toBe("27260");
    expect(payload.signal).toHaveProperty("fusionConfidence");
  });
});
