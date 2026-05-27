import { describe, expect, it } from "vitest";
import { getFusionCreditReadiness, getFusionDataEvidence } from "@/server/public-data/fusion/dataSourceRegistry";
import { getIntentRetrievalPlan } from "@/server/rag/contextBuilder";
import type { FusionDataEvidence } from "@/server/public-data/fusion/types";

describe("MOLIT bonus checklist guardrails", () => {
  it("marks the current MOLIT + KREB real fusion evidence as bonus-ready", () => {
    const readiness = getFusionCreditReadiness(getFusionDataEvidence());

    expect(readiness.canCheckMultiAgencyFusion).toBe(true);
    expect(readiness.realProviders).toEqual(expect.arrayContaining(["MOLIT", "KREB"]));
    expect(readiness.seedProviders).toEqual(expect.arrayContaining(["HUG", "TRANSPORT"]));
    expect(readiness.missingForStrongerClaim).toEqual(expect.arrayContaining(["HUG", "KMAAS/TRANSPORT"]));
  });

  it("keeps the multi-agency fusion bonus unchecked for seed-only partner datasets", () => {
    const seedOnlyEvidence: FusionDataEvidence[] = [
      {
        provider: "MOLIT",
        datasetName: "MOLIT real",
        sourceType: "real",
        rowCount: 1,
        fields: ["dealAmount"],
        collectedAt: "2026-05-27T00:00:00.000Z",
        usedIn: ["fused stability score", "RAG complex_signal", "UI evidence badge"]
      },
      {
        provider: "KREB",
        datasetName: "KREB seed",
        sourceType: "seed",
        rowCount: 5,
        fields: ["saleIndex"],
        collectedAt: "2026-05-27T00:00:00.000Z",
        usedIn: ["fused stability score", "RAG kreb_market_index", "comparison UI"]
      }
    ];

    const readiness = getFusionCreditReadiness(seedOnlyEvidence);

    expect(readiness.canCheckMultiAgencyFusion).toBe(false);
    expect(readiness.realProviders).toEqual(["MOLIT"]);
  });

  it("requires fusion evidence in data-source retrieval plans", () => {
    const plan = getIntentRetrievalPlan("data_source");
    const types = plan.sourceMinimums.map((item) => item.sourceType);

    expect(types).toEqual(expect.arrayContaining(["fusion_data", "kreb_market_index", "hug_jeonse_risk", "transport_accessibility", "safety_policy"]));
  });
});
