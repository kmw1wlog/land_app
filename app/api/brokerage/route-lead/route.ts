import { NextRequest, NextResponse } from "next/server";
import { rankBrokersForLead } from "@/server/brokerage/brokerRoutingService";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const results = await rankBrokersForLead(body);
  return NextResponse.json({ results });
}
