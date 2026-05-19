import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const broker = await prisma.broker.update({
    where: { id: body.brokerId },
    data: {
      isVerified: body.status === "verified",
      verificationStatus: body.status ?? "verified"
    }
  });
  return NextResponse.json(broker);
}
