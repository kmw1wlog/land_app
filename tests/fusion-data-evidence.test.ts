import { describe, expect, it } from "vitest";
import { getFusionCreditReadiness, getFusionDataEvidence } from "@/server/public-data/fusion/dataSourceRegistry";
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
  });

  it("allows the bonus only when MOLIT and another agency are both real", () => {
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
        usedIn: ["fused stability score"]
      }
    ];

    expect(getFusionCreditReadiness(evidence).canCheckMultiAgencyFusion).toBe(true);
  });
});
