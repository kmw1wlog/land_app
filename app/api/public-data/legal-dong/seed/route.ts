import { NextRequest, NextResponse } from "next/server";
import { seedLegalDongCodes } from "@/server/public-data/services/legalDongService";
import { getTargetConfig } from "@/server/public-data/utils/env";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { lawdCodes?: string[] };
  const target = getTargetConfig();
  const result = await seedLegalDongCodes(body.lawdCodes ?? target.lawdCodes);
  return NextResponse.json(result);
}
