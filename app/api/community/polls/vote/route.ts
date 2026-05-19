import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    pollId?: string;
    userId?: string;
    choice?: string;
  };
  if (!body.pollId || !body.choice) {
    return NextResponse.json({ error: "pollId and choice are required" }, { status: 400 });
  }
  const vote = await prisma.predictionVote.upsert({
    where: { pollId_userId: { pollId: body.pollId, userId: body.userId ?? "demo-user" } },
    update: { choice: body.choice },
    create: { pollId: body.pollId, userId: body.userId ?? "demo-user", choice: body.choice }
  });
  return NextResponse.json({ vote });
}
