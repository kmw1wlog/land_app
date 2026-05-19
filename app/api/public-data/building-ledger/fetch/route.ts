import { NextRequest, NextResponse } from "next/server";
import { normalizeAddress } from "@/server/public-data/services/addressNormalizeService";
import { fetchBuildingLedgerByNormalizedAddress, fetchTitle } from "@/server/public-data/services/buildingLedgerService";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    address?: string;
    sigunguCd?: string;
    bjdongCd?: string;
    bun?: string;
    ji?: string;
    pnu?: string;
  };

  try {
    if (body.address) {
      const normalized = await normalizeAddress(body.address);
      const ledger = await fetchBuildingLedgerByNormalizedAddress(normalized);
      return NextResponse.json({ normalized, ledger });
    }

    if (!body.sigunguCd || !body.bjdongCd || !body.bun || !body.ji) {
      return NextResponse.json(
        { error: "address or sigunguCd/bjdongCd/bun/ji is required" },
        { status: 400 }
      );
    }

    const ledger = await fetchTitle({
      sigunguCd: body.sigunguCd,
      bjdongCd: body.bjdongCd,
      bun: body.bun,
      ji: body.ji,
      pnu: body.pnu
    });
    return NextResponse.json({ ledger });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "building ledger fetch failed" },
      { status: 500 }
    );
  }
}
