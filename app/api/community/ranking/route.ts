import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET() {
  const rows = await prisma.communityPostDb.groupBy({
    by: ["userId"],
    _sum: { likes: true, commentCount: true },
    orderBy: { _sum: { likes: "desc" } },
    take: 10
  });
  return NextResponse.json({
    ranking: rows.map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      score: (row._sum.likes ?? 0) * 2 + (row._sum.commentCount ?? 0)
    }))
  });
}
