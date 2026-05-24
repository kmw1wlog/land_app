import { NextRequest, NextResponse } from "next/server";
import { getRealEstateAiSignalFeed } from "@/server/ai/realEstateSignalArtifactService";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const payload = getRealEstateAiSignalFeed({
    limit: Number(params.get("limit") ?? 20),
    split: params.get("split") ?? undefined,
    lawdCode: params.get("lawdCode") ?? undefined,
    complexId: params.get("complexId") ?? undefined,
    asofMonth: params.get("asofMonth") ?? undefined,
    minScore: params.has("minScore") ? Number(params.get("minScore")) : undefined
  });

  return NextResponse.json(payload);
}
