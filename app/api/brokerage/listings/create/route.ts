import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { evaluateListingDisplayCompliance } from "@/server/brokerage/displayCompliance";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const broker = body.brokerId ? await prisma.broker.findUnique({ where: { id: body.brokerId } }) : null;
  if ((body.listingType === "partner" || body.listingType === "direct_verified") && !broker?.isVerified) {
    return NextResponse.json({ error: "partner/direct_verified listings require verified broker" }, { status: 400 });
  }

  const listing = await prisma.listing.create({
    data: {
      propertyId: body.propertyId,
      brokerId: body.brokerId,
      listingType: body.listingType ?? "normal",
      title: body.title,
      description: body.description,
      address: body.address,
      region: body.region,
      propertyType: body.propertyType,
      transactionType: body.transactionType,
      exclusiveAreaM2: body.exclusiveAreaM2 ? Number(body.exclusiveAreaM2) : null,
      supplyAreaM2: body.supplyAreaM2 ? Number(body.supplyAreaM2) : null,
      floor: body.floor ? Number(body.floor) : null,
      totalFloors: body.totalFloors ? Number(body.totalFloors) : null,
      direction: body.direction,
      moveInDate: body.moveInDate,
      managementFee: body.managementFee ? BigInt(Number(body.managementFee)) : null,
      roomCount: body.roomCount ? Number(body.roomCount) : null,
      bathroomCount: body.bathroomCount ? Number(body.bathroomCount) : null,
      parkingInfo: body.parkingInfo,
      isViolationBuilding: typeof body.isViolationBuilding === "boolean" ? body.isViolationBuilding : null,
      ownerMandateStatus: body.ownerMandateStatus ?? (body.ownerConsentConfirmed ? "confirmed" : "pending"),
      salePrice: BigInt(Number(body.salePrice)),
      deposit: body.deposit ? BigInt(Number(body.deposit)) : null,
      monthlyRent: body.monthlyRent ? BigInt(Number(body.monthlyRent)) : null,
      status: body.status ?? "active",
      verificationStatus: "pending",
      isAd: Boolean(body.isAd || body.listingType === "partner"),
      adProduct: body.adProduct,
      adPriority: Number(body.adPriority ?? 0),
      ownerConsentConfirmed: Boolean(body.ownerConsentConfirmed),
      brokerDisplayName: broker?.officeName,
      requiredDisplayInfo: body.requiredDisplayInfo ?? {},
      riskWarnings: body.riskWarnings ?? ["참고용 분석이며 실제 권리관계 확인이 필요합니다."]
    }
  });
  const compliance = await evaluateListingDisplayCompliance(listing.id);
  if (listing.listingType === "direct_verified") {
    await prisma.directVerificationChecklist.upsert({
      where: { listingId: listing.id },
      update: {},
      create: { listingId: listing.id }
    });
  }
  return NextResponse.json({
    ...listing,
    salePrice: Number(listing.salePrice),
    deposit: listing.deposit === null ? null : Number(listing.deposit),
    monthlyRent: listing.monthlyRent === null ? null : Number(listing.monthlyRent),
    managementFee: listing.managementFee === null ? null : Number(listing.managementFee),
    compliance
  });
}
