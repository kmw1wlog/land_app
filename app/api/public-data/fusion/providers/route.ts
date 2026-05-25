import { NextResponse } from "next/server";
import { getFusionCreditReadiness, getFusionDataEvidence } from "@/server/public-data/fusion/dataSourceRegistry";
import { getFusionProviderSummary } from "@/server/public-data/fusion/fusionEvidence";

export const runtime = "nodejs";

export async function GET() {
  const evidence = getFusionDataEvidence();
  return NextResponse.json({
    providers: getFusionProviderSummary(),
    readiness: getFusionCreditReadiness(evidence),
    evidence
  });
}
