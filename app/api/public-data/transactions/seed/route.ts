import { NextRequest, NextResponse } from "next/server";
import { seedTransactionsForTargets } from "@/server/public-data/services/realTransactionService";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    lawdCodes?: string[];
    from?: string;
    to?: string;
    propertyTypes?: string[];
    dealTypes?: string[];
    dryRun?: boolean;
    allowLarge?: boolean;
  };

  const result = await seedTransactionsForTargets(body);
  return NextResponse.json(result);
}
