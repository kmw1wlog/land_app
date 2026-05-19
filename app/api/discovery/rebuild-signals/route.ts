import { NextRequest, NextResponse } from "next/server";
import { buildComplexSignalSnapshots } from "@/server/signals/complexSignalService";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const lawdCodes = Array.isArray(body.lawdCodes) && body.lawdCodes.length ? body.lawdCodes : ["27260"];
  const propertyTypes = Array.isArray(body.propertyTypes) && body.propertyTypes.length ? body.propertyTypes : ["apartment", "officetel"];
  const monthsBack = Number(body.monthsBack ?? 36);
  const result = await buildComplexSignalSnapshots({ lawdCodes, propertyTypes, monthsBack });
  return NextResponse.json(result);
}
