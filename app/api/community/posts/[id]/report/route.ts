import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { shouldBlindPost } from "@/server/community/moderation";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as { userId?: string; reason?: string };
  const result = await prisma.$transaction(async (tx) => {
    await tx.communityReport.create({
      data: {
        postId: id,
        userId: body.userId ?? "demo-user",
        reason: body.reason
      }
    });
    const post = await tx.communityPostDb.update({
      where: { id },
      data: { reportCount: { increment: 1 } }
    });
    if (shouldBlindPost(post.reportCount)) {
      return tx.communityPostDb.update({
        where: { id },
        data: { isHidden: true, moderationStatus: "blinded_by_reports" }
      });
    }
    return post;
  });
  return NextResponse.json({ post: result });
}
