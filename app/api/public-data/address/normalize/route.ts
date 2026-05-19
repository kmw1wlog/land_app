import { NextRequest, NextResponse } from "next/server";
import { normalizeAddress } from "@/server/public-data/services/addressNormalizeService";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { address?: string };
  if (!body.address?.trim()) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  try {
    const result = await normalizeAddress(body.address.trim());
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "address normalize failed" },
      { status: 500 }
    );
  }
}
