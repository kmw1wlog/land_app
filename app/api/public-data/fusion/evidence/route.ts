import { NextResponse } from "next/server";
import { getFusionCreditReadiness, getFusionDataEvidence } from "@/server/public-data/fusion/dataSourceRegistry";

export const runtime = "nodejs";

export async function GET() {
  const evidence = getFusionDataEvidence();
  return NextResponse.json({
    readiness: getFusionCreditReadiness(evidence),
    evidence
  });
}
