import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET(request: Request) {
  const postId = new URL(request.url).searchParams.get("postId");
  if (!postId) return NextResponse.json({ comments: [] });
  const comments = await prisma.communityCommentDb.findMany({
    where: { postId, isHidden: false },
    orderBy: { createdAt: "asc" },
    take: 50
  });
  return NextResponse.json({ comments });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { postId?: string; userId?: string; content?: string };
  if (!body.postId || !body.content?.trim()) {
    return NextResponse.json({ error: "postId and content are required" }, { status: 400 });
  }
  const result = await prisma.$transaction([
    prisma.communityCommentDb.create({
      data: { postId: body.postId, userId: body.userId ?? "demo-user", content: body.content }
    }),
    prisma.communityPostDb.update({
      where: { id: body.postId },
      data: { commentCount: { increment: 1 } }
    })
  ]);
  return NextResponse.json({ comment: result[0] });
}
