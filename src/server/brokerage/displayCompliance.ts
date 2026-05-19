import { prisma } from "@/server/db";
import type { Prisma } from "@prisma/client";

const requiredLabels: Record<string, string> = {
  hasBrokerOfficeName: "중개사무소명",
  hasBrokerRegistrationNo: "중개사무소 등록번호",
  hasBrokerAddress: "중개사무소 주소",
  hasBrokerPhone: "중개사무소 연락처",
  hasAddress: "소재지",
  hasArea: "면적",
  hasPrice: "가격",
  hasPropertyType: "중개대상물 종류",
  hasTransactionType: "거래형태",
  hasFloorInfo: "층수",
  hasMoveInDate: "입주 가능일",
  hasManagementFee: "관리비",
  hasDirection: "방향",
  hasRoomBathInfo: "방/욕실 수",
  hasParkingInfo: "주차 정보",
  hasViolationBuildingFlag: "위반건축물 여부"
};

export async function evaluateListingDisplayCompliance(listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new Error("listing not found");
  const broker = listing.brokerId ? await prisma.broker.findUnique({ where: { id: listing.brokerId } }) : null;

  const flags = {
    hasBrokerOfficeName: Boolean(broker?.officeName || listing.brokerDisplayName),
    hasBrokerRegistrationNo: Boolean(broker?.licenseNumber),
    hasBrokerAddress: Boolean(broker?.address),
    hasBrokerPhone: Boolean(broker?.phone),
    hasAddress: Boolean(listing.address),
    hasArea: Boolean(listing.exclusiveAreaM2 || listing.supplyAreaM2),
    hasPrice: Number(listing.salePrice) > 0 || Number(listing.deposit ?? 0) > 0 || Number(listing.monthlyRent ?? 0) > 0,
    hasPropertyType: Boolean(listing.propertyType),
    hasTransactionType: Boolean(listing.transactionType),
    hasFloorInfo: listing.floor !== null && listing.totalFloors !== null,
    hasMoveInDate: Boolean(listing.moveInDate),
    hasManagementFee: listing.managementFee !== null,
    hasDirection: Boolean(listing.direction),
    hasRoomBathInfo: listing.roomCount !== null && listing.bathroomCount !== null,
    hasParkingInfo: Boolean(listing.parkingInfo),
    hasViolationBuildingFlag: listing.isViolationBuilding !== null
  };
  const missingFields = Object.entries(flags)
    .filter(([, value]) => !value)
    .map(([key]) => requiredLabels[key] ?? key);
  const status = missingFields.length === 0 ? "ready" : "incomplete";

  return prisma.listingDisplayCompliance.upsert({
    where: { listingId },
    update: {
      ...flags,
      status,
      missingFields: missingFields as Prisma.InputJsonValue
    },
    create: {
      listingId,
      ...flags,
      status,
      missingFields: missingFields as Prisma.InputJsonValue
    }
  });
}

export function canExposeListing(input: {
  listingType: string;
  brokerVerified?: boolean;
  complianceStatus?: string;
}) {
  if (input.listingType === "normal") return true;
  return Boolean(input.brokerVerified && input.complianceStatus === "approved");
}
