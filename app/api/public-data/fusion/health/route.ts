import { NextResponse } from "next/server";
import { getFusionCreditReadiness, getFusionDataEvidence } from "@/server/public-data/fusion/dataSourceRegistry";
import { getFusionProviderSummary } from "@/server/public-data/fusion/fusionEvidence";

export const runtime = "nodejs";

export async function GET() {
  const evidence = getFusionDataEvidence();
  const readiness = getFusionCreditReadiness(evidence);
  return NextResponse.json({
    providers: getFusionProviderSummary(),
    canCheckMultiAgencyFusion: readiness.canCheckMultiAgencyFusion,
    reason: readiness.reason,
    evidence
  });
}
