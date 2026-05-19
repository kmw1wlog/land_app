import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { evaluateListingDisplayCompliance } from "@/server/brokerage/displayCompliance";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const listing = await prisma.listing.update({
    where: { id: body.listingId },
    data: {
      verificationStatus: body.status ?? "verified",
      status: body.status === "rejected" ? "rejected" : "active"
    }
  });
  let compliance = await evaluateListingDisplayCompliance(listing.id);
  if (body.complianceStatus) {
    compliance = await prisma.listingDisplayCompliance.update({
      where: { listingId: listing.id },
      data: { status: body.complianceStatus }
    });
  }
  return NextResponse.json({
    ...listing,
    salePrice: Number(listing.salePrice),
    deposit: listing.deposit === null ? null : Number(listing.deposit),
    monthlyRent: listing.monthlyRent === null ? null : Number(listing.monthlyRent),
    compliance
  });
}
