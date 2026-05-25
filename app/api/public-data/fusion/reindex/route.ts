import { NextRequest, NextResponse } from "next/server";
import { buildFusionDataEvidence, buildFusedRegionSignals } from "@/server/public-data/fusion/fusionEvidence";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    const token = request.headers.get("x-admin-token");
    if (!process.env.FUSION_ADMIN_TOKEN || token !== process.env.FUSION_ADMIN_TOKEN) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }
  const evidence = buildFusionDataEvidence();
  const signals = buildFusedRegionSignals();
  return NextResponse.json({
    indexed: true,
    evidenceCount: evidence.length,
    fusedSignalCount: signals.length,
    note: "Fusion seed snapshots were refreshed from data/fusion CSV files."
  });
}
