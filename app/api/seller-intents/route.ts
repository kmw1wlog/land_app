import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.address) return NextResponse.json({ error: "address is required" }, { status: 400 });
  const intent = await prisma.sellerIntent.create({
    data: {
      userId: body.userId ?? "user-1",
      currentHomeId: body.currentHomeId,
      address: body.address,
      region: body.region,
      expectedPrice: body.expectedPrice ? BigInt(Number(body.expectedPrice)) : null,
      message: body.message,
      photoCount: Number(body.photoCount ?? 0),
      status: "new"
    }
  });
  return NextResponse.json({
    intent: {
      ...intent,
      expectedPrice: intent.expectedPrice === null ? null : Number(intent.expectedPrice)
    },
    notice: "매도 의향은 공개 매물이 아니며, 중개사 또는 직영팀 검증 전까지 피드에 노출되지 않습니다."
  });
}

export async function GET() {
  const intents = await prisma.sellerIntent.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  return NextResponse.json({
    intents: intents.map((intent) => ({
      ...intent,
      expectedPrice: intent.expectedPrice === null ? null : Number(intent.expectedPrice)
    }))
  });
}
