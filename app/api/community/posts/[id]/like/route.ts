import { NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const post = await prisma.communityPostDb.update({
    where: { id },
    data: { likes: { increment: 1 } }
  });
  return NextResponse.json({ post });
}
