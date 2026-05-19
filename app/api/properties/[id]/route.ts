import { NextResponse } from "next/server";
import { properties as dummyProperties } from "@/data/dummy";
import { prisma } from "@/server/db";
import type { PropertyType } from "@/types";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) {
    const fallback = process.env.APP_ENV === "production" ? null : dummyProperties.find((item) => item.id === id);
    if (!fallback) return NextResponse.json({ error: "property not found" }, { status: 404 });
    return NextResponse.json({ source: "dummy_fallback", property: fallback });
  }
  const listings = await prisma.listing.findMany({ where: { propertyId: id, status: "active" } });
  const photos = await prisma.listingPhoto.findMany({
    where: {
      listingId: { in: listings.map((listing) => listing.id) },
      moderationStatus: "approved",
      licenseStatus: { not: "rejected" },
      consentStatus: { in: ["owner_confirmed", "tenant_confirmed", "not_required"] }
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
  });
  return NextResponse.json({
    source: "db",
    property: {
      ...property,
      propertyType: property.propertyType as PropertyType,
      salePrice: Number(property.salePrice),
      jeonsePrice: Number(property.jeonsePrice),
      expectedMonthlyRent: Number(property.expectedMonthlyRent),
      expectedDeposit: Number(property.expectedDeposit),
      previousHighPrice: Number(property.previousHighPrice),
      createdAt: property.createdAt.toISOString(),
      updatedAt: property.updatedAt.toISOString(),
      photoUrls: photos.map((photo) => photo.thumbnailUrl || photo.url).filter(Boolean)
    },
    listings: listings.map((listing) => ({
      ...listing,
      salePrice: Number(listing.salePrice),
      deposit: listing.deposit === null ? null : Number(listing.deposit),
      monthlyRent: listing.monthlyRent === null ? null : Number(listing.monthlyRent),
      managementFee: listing.managementFee === null ? null : Number(listing.managementFee)
    }))
  });
}
