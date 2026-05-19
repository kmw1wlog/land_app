import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  const { id, photoId } = await params;
  const body = await request.json();
  const photo = await prisma.listingPhoto.update({
    where: { id: photoId },
    data: {
      listingId: id,
      moderationStatus: body.moderationStatus ?? "approved",
      licenseStatus: body.licenseStatus ?? undefined,
      consentStatus: body.consentStatus ?? undefined
    }
  });
  return NextResponse.json({ photo });
}
