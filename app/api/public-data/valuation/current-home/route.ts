import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { normalizeAddress } from "@/server/public-data/services/addressNormalizeService";
import { estimateCurrentHomeValue } from "@/server/public-data/services/valuationService";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    address?: string;
    normalizedAddressId?: string;
    lawdCode5?: string;
    pnu?: string;
    complexName?: string;
    buildingName?: string;
    areaM2?: number;
    propertyType?: string;
  };

  try {
    let lawdCode5 = body.lawdCode5;
    let normalizedAddressId = body.normalizedAddressId;
    let pnu = body.pnu;

    if (body.address) {
      const normalized = await normalizeAddress(body.address);
      lawdCode5 = normalized.lawdCode5 ?? undefined;
      normalizedAddressId = normalized.id;
      pnu = normalized.pnu ?? undefined;
    }

    if (!lawdCode5) {
      return NextResponse.json({ error: "lawdCode5 or address is required" }, { status: 400 });
    }

    const transactionCount = await prisma.realTransaction.count({
      where: { lawdCode5, propertyType: body.propertyType ?? "apartment" }
    });

    const snapshot = await estimateCurrentHomeValue({
      normalizedAddressId,
      pnu,
      lawdCode5,
      complexName: body.complexName,
      buildingName: body.buildingName,
      areaM2: body.areaM2,
      propertyType: body.propertyType ?? "apartment"
    });

    const recentTrade = await prisma.realTransaction.findMany({
      where: { lawdCode5, dealType: "trade", propertyType: body.propertyType ?? "apartment" },
      orderBy: [{ dealYear: "desc" }, { dealMonth: "desc" }, { dealDay: "desc" }],
      take: 5
    });
    const recentRent = await prisma.realTransaction.findMany({
      where: { lawdCode5, dealType: "rent", propertyType: body.propertyType ?? "apartment" },
      orderBy: [{ dealYear: "desc" }, { dealMonth: "desc" }, { dealDay: "desc" }],
      take: 5
    });

    return NextResponse.json({
      snapshot,
      transactionCount,
      recentTrade: recentTrade.map(serializeTransaction),
      recentRent: recentRent.map(serializeTransaction),
      notice: "참고용 추정치이며 실제 시세·세금·대출한도와 다를 수 있습니다."
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "valuation failed" },
      { status: 500 }
    );
  }
}

function serializeTransaction(item: {
  [key: string]: unknown;
  dealAmount: bigint | number | null;
  deposit: bigint | number | null;
  monthlyRent: bigint | number | null;
}) {
  return {
    ...item,
    dealAmount: item.dealAmount === null ? null : Number(item.dealAmount),
    deposit: item.deposit === null ? null : Number(item.deposit),
    monthlyRent: item.monthlyRent === null ? null : Number(item.monthlyRent)
  };
}
