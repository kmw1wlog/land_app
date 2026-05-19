import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET() {
  const logs = await prisma.accessAuditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return NextResponse.json({ logs });
}
