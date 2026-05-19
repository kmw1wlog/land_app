import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { userId?: string; reason?: string };
  if (!body.userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  const requestRow = await prisma.userDeletionRequest.create({
    data: { userId: body.userId, reason: body.reason }
  });
  return NextResponse.json({ request: requestRow });
}
