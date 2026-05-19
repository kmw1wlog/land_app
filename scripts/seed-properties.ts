import { prisma } from "@/server/db";
import { listings, properties } from "@/data/dummy";

async function main() {
  for (const property of properties) {
    const data = {
      name: property.name,
      address: property.address,
      region: property.region,
      lawdCode5: property.lawdCode5,
      legalDongCode10: property.legalDongCode10,
      pnu: property.pnu,
      propertyType: property.propertyType,
      salePrice: BigInt(property.salePrice),
      jeonsePrice: BigInt(property.jeonsePrice),
      expectedMonthlyRent: BigInt(property.expectedMonthlyRent),
      expectedDeposit: BigInt(property.expectedDeposit),
      areaM2: property.areaM2,
      floor: property.floor,
      builtYear: property.builtYear,
      pricePerM2: property.pricePerM2,
      previousHighPrice: BigInt(property.previousHighPrice),
      drawdownFromHigh: property.drawdownFromHigh,
      jeonseRatio: property.jeonseRatio,
      supplyRiskScore: property.supplyRiskScore,
      vacancyRiskScore: property.vacancyRiskScore,
      growthScore: property.growthScore,
      stabilityScore: property.stabilityScore,
      communityHeatScore: property.communityHeatScore,
      isDirectListing: property.isDirectListing,
      isPartnerListing: property.isPartnerListing,
      isAd: property.isAd,
      source: "dummy_seed"
    };
    await prisma.property.upsert({
      where: { id: property.id },
      update: data,
      create: {
        id: property.id,
        ...data
      }
    });
  }

  for (const listing of listings) {
    const data = {
      propertyId: listing.propertyId,
      brokerId: listing.brokerId,
      listingType: listing.listingType,
      title: listing.title,
      description: listing.description,
      address: properties.find((item) => item.id === listing.propertyId)?.address,
      region: properties.find((item) => item.id === listing.propertyId)?.region,
      propertyType: properties.find((item) => item.id === listing.propertyId)?.propertyType,
      transactionType: "sale",
      exclusiveAreaM2: properties.find((item) => item.id === listing.propertyId)?.areaM2,
      supplyAreaM2: properties.find((item) => item.id === listing.propertyId)?.areaM2 ? properties.find((item) => item.id === listing.propertyId)!.areaM2 * 1.32 : undefined,
      floor: properties.find((item) => item.id === listing.propertyId)?.floor,
      totalFloors: 29,
      direction: "남동향",
      moveInDate: "협의",
      managementFee: BigInt(220_000),
      roomCount: 3,
      bathroomCount: 2,
      parkingInfo: "세대당 1.2대",
      isViolationBuilding: false,
      ownerMandateStatus: listing.listingType === "normal" ? "pending" : "confirmed",
      salePrice: BigInt(listing.salePrice),
      deposit: BigInt(listing.deposit),
      monthlyRent: BigInt(listing.monthlyRent),
      status: listing.status,
      isAd: listing.isAd,
      adPriority: listing.adPriority
    };
    const saved = await prisma.listing.upsert({
      where: { id: listing.id },
      update: data,
      create: {
        id: listing.id,
        ...data
      }
    });
    await prisma.listingDisplayCompliance.upsert({
      where: { listingId: saved.id },
      update: {
        hasBrokerOfficeName: true,
        hasBrokerRegistrationNo: listing.listingType !== "normal",
        hasBrokerAddress: true,
        hasBrokerPhone: true,
        hasAddress: true,
        hasArea: true,
        hasPrice: true,
        hasPropertyType: true,
        hasTransactionType: true,
        hasFloorInfo: true,
        hasMoveInDate: true,
        hasManagementFee: true,
        hasDirection: true,
        hasRoomBathInfo: true,
        hasParkingInfo: true,
        hasViolationBuildingFlag: true,
        status: listing.listingType === "normal" ? "ready" : "approved",
        missingFields: []
      },
      create: {
        listingId: saved.id,
        hasBrokerOfficeName: true,
        hasBrokerRegistrationNo: listing.listingType !== "normal",
        hasBrokerAddress: true,
        hasBrokerPhone: true,
        hasAddress: true,
        hasArea: true,
        hasPrice: true,
        hasPropertyType: true,
        hasTransactionType: true,
        hasFloorInfo: true,
        hasMoveInDate: true,
        hasManagementFee: true,
        hasDirection: true,
        hasRoomBathInfo: true,
        hasParkingInfo: true,
        hasViolationBuildingFlag: true,
        status: listing.listingType === "normal" ? "ready" : "approved",
        missingFields: []
      }
    });
    if (listing.listingType === "direct_verified") {
      await prisma.directVerificationChecklist.upsert({
        where: { listingId: saved.id },
        update: { buildingLedgerChecked: "passed", valuationChecked: "passed", priceReasonableness: "pending" },
        create: { listingId: saved.id, buildingLedgerChecked: "passed", valuationChecked: "passed", priceReasonableness: "pending" }
      });
    }
  }

  console.log(JSON.stringify({ properties: properties.length, listings: listings.length }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
