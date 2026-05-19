import { NextResponse } from "next/server";
import type { Property, PropertyType } from "@/types";
import { properties as dummyProperties } from "@/data/dummy";
import { prisma } from "@/server/db";

export async function GET() {
  try {
    const dbProperties = await prisma.property.findMany({
      orderBy: [{ isDirectListing: "desc" }, { isAd: "desc" }, { communityHeatScore: "desc" }],
      take: 150
    });

    if (dbProperties.length === 0) {
      return NextResponse.json({ source: "dummy_fallback", properties: dummyProperties });
    }

    const listings = await prisma.listing.findMany({
      where: {
        status: { in: ["active", "pending"] },
        propertyId: { in: dbProperties.map((property) => property.id) }
      },
      orderBy: [{ adPriority: "desc" }, { updatedAt: "desc" }]
    });
    const photos = await prisma.listingPhoto.findMany({
      where: {
        listingId: { in: listings.map((listing) => listing.id) },
        moderationStatus: "approved",
        licenseStatus: { not: "rejected" },
        consentStatus: { in: ["owner_confirmed", "tenant_confirmed", "not_required"] }
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });
    const listingByProperty = new Map<string, (typeof listings)[number]>();
    for (const listing of listings) {
      if (listing.propertyId && !listingByProperty.has(listing.propertyId)) {
        listingByProperty.set(listing.propertyId, listing);
      }
    }

    const properties = dbProperties.map<Property>((property) => {
      const listing = listingByProperty.get(property.id);
      const photoUrls = listing
        ? photos.filter((photo) => photo.listingId === listing.id).map((photo) => photo.thumbnailUrl || photo.url).filter((url): url is string => Boolean(url))
        : [];
      return {
        id: property.id,
        name: property.name,
        address: property.address,
        region: property.region,
        lawdCode5: property.lawdCode5,
        legalDongCode10: property.legalDongCode10,
        pnu: property.pnu,
        propertyType: property.propertyType as PropertyType,
        salePrice: Number(property.salePrice),
        jeonsePrice: Number(property.jeonsePrice),
        expectedMonthlyRent: Number(property.expectedMonthlyRent),
        expectedDeposit: Number(property.expectedDeposit),
        areaM2: property.areaM2,
        floor: property.floor,
        builtYear: property.builtYear,
        pricePerM2: property.pricePerM2,
        previousHighPrice: Number(property.previousHighPrice),
        drawdownFromHigh: property.drawdownFromHigh,
        jeonseRatio: property.jeonseRatio,
        supplyRiskScore: property.supplyRiskScore,
        vacancyRiskScore: property.vacancyRiskScore,
        growthScore: property.growthScore,
        stabilityScore: property.stabilityScore,
        communityHeatScore: property.communityHeatScore,
        isDirectListing: property.isDirectListing || listing?.listingType === "direct_verified",
        isPartnerListing: property.isPartnerListing || listing?.listingType === "partner",
        isAd: property.isAd || Boolean(listing?.isAd),
        photoUrls,
        createdAt: property.createdAt.toISOString(),
        updatedAt: property.updatedAt.toISOString()
      };
    });

    return NextResponse.json({ source: "db", count: properties.length, properties });
  } catch (error) {
    return NextResponse.json(
      {
        source: "dummy_fallback",
        warning: error instanceof Error ? error.message : String(error),
        properties: dummyProperties
      },
      { status: 200 }
    );
  }
}
