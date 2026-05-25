import { describe, expect, it } from "vitest";
import { getFusionCreditReadiness, getFusionDataEvidence } from "@/server/public-data/fusion/dataSourceRegistry";
import { getIntentRetrievalPlan } from "@/server/rag/contextBuilder";

describe("MOLIT bonus checklist guardrails", () => {
  it("keeps the multi-agency fusion bonus unchecked for seed-only partner datasets", () => {
    const readiness = getFusionCreditReadiness(getFusionDataEvidence());

    expect(readiness.canCheckMultiAgencyFusion).toBe(false);
    expect(readiness.seedProviders).toEqual(expect.arrayContaining(["KREB", "HUG", "TRANSPORT"]));
  });

  it("requires fusion evidence in data-source retrieval plans", () => {
    const plan = getIntentRetrievalPlan("data_source");
    const types = plan.sourceMinimums.map((item) => item.sourceType);

    expect(types).toEqual(expect.arrayContaining(["fusion_data", "kreb_market_index", "hug_jeonse_risk", "transport_accessibility", "safety_policy"]));
  });
});
