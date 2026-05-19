import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { moderateCommunityText } from "@/server/community/moderation";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const roomId = searchParams.get("roomId") ?? undefined;
  const posts = await prisma.communityPostDb.findMany({
    where: {
      ...(roomId ? { roomId } : {}),
      ...(region ? { region } : {}),
      ...(category ? { category } : {}),
      isHidden: false
    },
    orderBy: [{ likes: "desc" }, { createdAt: "desc" }],
    take: 50
  });
  return NextResponse.json({ posts });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    userId?: string;
    region?: string;
    propertyId?: string;
    category?: string;
    title?: string;
    content?: string;
    authorBadge?: string;
    roomId?: string;
  };

  if (!body.title?.trim() || !body.content?.trim() || !body.category) {
    return NextResponse.json({ error: "title, content, category are required" }, { status: 400 });
  }

  const moderation = moderateCommunityText(body.title, body.content);
  if (body.roomId) {
    const room = await prisma.communityRoom.findUnique({ where: { id: body.roomId } });
    if (room && room.writePolicy !== "all") {
      const membership = await prisma.communityMembership.findUnique({
        where: { roomId_userId: { roomId: body.roomId, userId: body.userId ?? "demo-user" } }
      });
      if (!membership || membership.status !== "approved") {
        return NextResponse.json({ error: "verified membership is required for this room" }, { status: 403 });
      }
    }
  }
  const post = await prisma.communityPostDb.create({
    data: {
      roomId: body.roomId,
      userId: body.userId ?? "demo-user",
      region: body.region,
      propertyId: body.propertyId,
      category: body.category,
      title: body.title,
      content: body.content,
      authorBadge: body.authorBadge ?? "매수 대기자",
      verificationLabel: moderation.verificationLabel,
      moderationStatus: moderation.status,
      isHidden: moderation.isHidden
    }
  });
  return NextResponse.json({ post, moderation });
}
