import { NextRequest, NextResponse } from "next/server";
import { buildFusedRegionSignals } from "@/server/public-data/fusion/fusionEvidence";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const lawdCode5 = request.nextUrl.searchParams.get("lawdCode5");
  const region = request.nextUrl.searchParams.get("region");
  const signals = buildFusedRegionSignals();
  const filtered = signals.filter((item) => {
    if (lawdCode5) return item.lawdCode5 === lawdCode5;
    if (region) return item.region.includes(region) || region.includes(item.region);
    return true;
  });
  return NextResponse.json({
    count: filtered.length,
    signals: filtered
  });
}
