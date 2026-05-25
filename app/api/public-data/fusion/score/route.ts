import { NextRequest, NextResponse } from "next/server";
import { findFusionSignalForCandidate } from "@/server/public-data/fusion/fusionEvidence";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const lawdCode5 = request.nextUrl.searchParams.get("lawdCode5");
  const region = request.nextUrl.searchParams.get("region");
  const signal = findFusionSignalForCandidate({ lawdCode5, region });
  if (!signal) {
    return NextResponse.json({ error: "fusion signal not found" }, { status: 404 });
  }
  return NextResponse.json({ signal });
}
