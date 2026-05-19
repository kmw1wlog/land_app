import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

const defaultRooms = [
  { roomType: "public_region", region: "대구 수성구", name: "수성구 공개 토론", visibility: "public", writePolicy: "all" },
  { roomType: "verified_property", region: "대구 수성구", name: "인증 단지방", visibility: "verified_only", writePolicy: "verified_only" },
  { roomType: "owner_only", region: "대구 수성구", name: "보유자방", visibility: "private", writePolicy: "owner_only" },
  { roomType: "broker_qna", region: "대구 수성구", name: "중개사 Q&A", visibility: "public", writePolicy: "broker_only" }
];

export async function GET(request: NextRequest) {
  const roomKey = request.nextUrl.searchParams.get("roomKey");
  if (roomKey) {
    const [lawdCode5, propertyType, ...nameParts] = roomKey.split(":");
    const complexName = nameParts.join(":");
    let room = await prisma.communityRoom.findFirst({
      where: { roomType: "public_property", propertyId: roomKey }
    });
    if (!room) {
      room = await prisma.communityRoom.create({
        data: {
          roomType: "public_property",
          propertyId: roomKey,
          region: lawdCode5,
          name: `${complexName || "단지"} ${propertyType} 토론방`,
          description: "실거래 기반 단지/면적대 후보에서 연결된 토론방입니다.",
          visibility: "public",
          writePolicy: "all"
        }
      });
    }
    return NextResponse.json({ room, rooms: [room] });
  }
  let rooms = await prisma.communityRoom.findMany({ orderBy: { createdAt: "asc" }, take: 50 });
  if (rooms.length === 0) {
    await prisma.communityRoom.createMany({ data: defaultRooms });
    rooms = await prisma.communityRoom.findMany({ orderBy: { createdAt: "asc" }, take: 50 });
  }
  return NextResponse.json({ rooms });
}
