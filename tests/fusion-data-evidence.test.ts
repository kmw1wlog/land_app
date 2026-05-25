import { describe, expect, it } from "vitest";
import { getFusionCreditReadiness, getFusionDataEvidence } from "@/server/public-data/fusion/dataSourceRegistry";
import { validateRealSourceRows } from "@/server/public-data/fusion/fusionEvidence";
import type { FusionDataEvidence } from "@/server/public-data/fusion/types";

describe("fusion data evidence", () => {
  it("records KREB/HUG/TRANSPORT seed snapshots without granting the multi-agency bonus", () => {
    const evidence = getFusionDataEvidence();
    const readiness = getFusionCreditReadiness(evidence);

    expect(evidence.find((item) => item.provider === "MOLIT")?.sourceType).toBe("real");
    expect(evidence.find((item) => item.provider === "KREB")?.rowCount).toBeGreaterThan(0);
    expect(evidence.find((item) => item.provider === "HUG")?.rowCount).toBeGreaterThan(0);
    expect(evidence.find((item) => item.provider === "TRANSPORT")?.rowCount).toBeGreaterThan(0);
    expect(readiness.canCheckMultiAgencyFusion).toBe(false);
    expect(readiness.reason).toContain("가점 체크는 보류");
    expect(readiness.realProviders).toEqual(["MOLIT"]);
    expect(readiness.requiredNextStep).toContain("real dataset");
    expect(evidence.find((item) => item.provider === "KREB")?.sha256).toBeTruthy();
  });

  it("does not allow the bonus when MOLIT is real but KREB is only seed", () => {
    const evidence: FusionDataEvidence[] = [
      {
        provider: "MOLIT",
        datasetName: "MOLIT real",
        sourceType: "real",
        rowCount: 10,
        fields: ["dealAmount"],
        collectedAt: "2026-05-25T00:00:00.000Z",
        usedIn: ["fused stability score"]
      },
      {
        provider: "KREB",
        datasetName: "KREB seed",
        sourceType: "seed",
        rowCount: 10,
        fields: ["saleIndex"],
        collectedAt: "2026-05-25T00:00:00.000Z",
        usedIn: ["fused stability score"]
      }
    ];

    expect(getFusionCreditReadiness(evidence).canCheckMultiAgencyFusion).toBe(false);
  });

  it("allows the bonus only when MOLIT and another agency are both real and used", () => {
    const evidence: FusionDataEvidence[] = [
      {
        provider: "MOLIT",
        datasetName: "MOLIT real",
        sourceType: "real",
        rowCount: 10,
        fields: ["dealAmount"],
        collectedAt: "2026-05-25T00:00:00.000Z",
        usedIn: ["fused stability score"]
      },
      {
        provider: "KREB",
        datasetName: "KREB real",
        sourceType: "real",
        rowCount: 10,
        fields: ["saleIndex"],
        collectedAt: "2026-05-25T00:00:00.000Z",
        usedIn: ["fused stability score", "RAG kreb_market_index", "comparison UI"]
      }
    ];

    const readiness = getFusionCreditReadiness(evidence);
    expect(readiness.canCheckMultiAgencyFusion).toBe(true);
    expect(readiness.realProviders).toEqual(["MOLIT", "KREB"]);
  });

  it("rejects real CSV rows that are not tagged real", () => {
    expect(() => validateRealSourceRows("KREB", [{ sourceType: "seed" }])).toThrow(/sourceType=real/);
  });
});
