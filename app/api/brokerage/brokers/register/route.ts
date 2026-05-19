import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const broker = await prisma.broker.create({
    data: {
      userId: body.userId ?? "user-1",
      officeName: body.officeName,
      representative: body.representative,
      licenseNumber: body.licenseNumber,
      businessNumber: body.businessNumber,
      region: body.region,
      address: body.address,
      phone: body.phone,
      specialties: body.specialties ?? []
    }
  });
  return NextResponse.json(broker);
}
