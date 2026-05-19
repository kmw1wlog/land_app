import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET() {
  const today = new Date().toISOString().slice(0, 10);
  const rows = await prisma.apiQuotaDaily.findMany({
    where: { date: today },
    orderBy: { provider: "asc" }
  });
  return NextResponse.json({
    date: today,
    providers: rows.map((row) => ({
      ...row,
      remaining: row.quotaLimit === null ? null : Math.max(0, row.quotaLimit - row.callCount),
      status: row.quotaLimit && row.callCount >= row.quotaLimit ? "exhausted" : "ok"
    }))
  });
}
