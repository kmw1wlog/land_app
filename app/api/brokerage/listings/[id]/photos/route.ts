import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { saveListingPhotoFile } from "@/server/media/mediaStorage";
import { validateListingPhotoUpload } from "@/server/media/photoPolicy";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const photos = await prisma.listingPhoto.findMany({
    where: { listingId: id, moderationStatus: { not: "rejected" } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });
  return NextResponse.json({ photos });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing) return NextResponse.json({ error: "listing not found" }, { status: 404 });
  const broker = listing.brokerId ? await prisma.broker.findUnique({ where: { id: listing.brokerId } }) : null;
  if (!broker?.isVerified) {
    return NextResponse.json({ error: "verified broker is required for photo upload" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  const errors = validateListingPhotoUpload(file);
  if (errors.length) return NextResponse.json({ error: errors.join(" ") }, { status: 400 });

  const stored = await saveListingPhotoFile({ listingId: id, file });
  const photo = await prisma.listingPhoto.create({
    data: {
      listingId: id,
      ...stored,
      roomType: String(form.get("roomType") || "exterior"),
      caption: String(form.get("caption") || ""),
      sourceType: String(form.get("sourceType") || "broker_upload"),
      copyrightOwner: String(form.get("copyrightOwner") || broker.officeName),
      licenseStatus: "declared",
      consentStatus: String(form.get("consentStatus") || "owner_confirmed"),
      moderationStatus: "pending"
    }
  });
  return NextResponse.json({ photo });
}
