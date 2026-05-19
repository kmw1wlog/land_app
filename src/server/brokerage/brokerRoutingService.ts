import { prisma } from "@/server/db";

export type BrokerRoutingInput = {
  userId: string;
  targetRegion: string;
  propertyType?: string;
  leadType: "buy_consulting" | "sell_consulting" | "move_up" | "cash_flow_investment";
  budget?: number;
  targetPrice?: number;
  preferredListingId?: string;
  allowAds: boolean;
  allowDirectVerified: boolean;
};

export type BrokerRoutingResult = {
  brokerId: string;
  officeName: string;
  listingId?: string;
  routingScore: number;
  labels: string[];
};

export async function rankBrokersForLead(input: BrokerRoutingInput): Promise<BrokerRoutingResult[]> {
  const brokers = await prisma.broker.findMany({
    where: {
      region: { contains: input.targetRegion.slice(-3) || input.targetRegion },
      verificationStatus: { not: "rejected" }
    },
    take: 30
  });
  const listings = await prisma.listing.findMany({
    where: {
      status: "active",
      region: { contains: input.targetRegion.slice(-3) || input.targetRegion },
      ...(input.propertyType ? { propertyType: input.propertyType } : {})
    },
    take: 100
  });

  return brokers
    .map((broker) => {
      const brokerListings = listings.filter((listing) => listing.brokerId === broker.id);
      const fitListing = brokerListings.find((listing) => {
        const budgetOk = !input.budget || Number(listing.salePrice) <= input.budget * 1.15;
        const directOk = listing.listingType !== "direct_verified" || input.allowDirectVerified;
        return budgetOk && directOk;
      });
      const listingFitScore = fitListing ? 100 : 35;
      const regionExpertiseScore = broker.region.includes(input.targetRegion) || input.targetRegion.includes(broker.region) ? 100 : 65;
      const responseRateScore = Math.min(100, Math.max(0, broker.responseRate));
      const brokerRatingScore = Math.min(100, broker.rating * 20);
      const verificationScore = broker.isVerified ? 100 : 30;
      const adBoost = input.allowAds && fitListing?.isAd && listingFitScore >= 70 ? 100 : 0;
      const directVerifiedBoost =
        input.allowDirectVerified && fitListing?.listingType === "direct_verified" && listingFitScore >= 70 ? 100 : 0;
      const routingScore =
        regionExpertiseScore * 0.25 +
        listingFitScore * 0.2 +
        responseRateScore * 0.15 +
        brokerRatingScore * 0.15 +
        verificationScore * 0.1 +
        adBoost * 0.1 +
        directVerifiedBoost * 0.1 -
        broker.falseListingPenalty;

      return {
        brokerId: broker.id,
        officeName: broker.officeName,
        listingId: fitListing?.id,
        routingScore: Math.round(routingScore * 10) / 10,
        labels: [
          fitListing?.isAd ? "광고" : "",
          fitListing?.listingType === "direct_verified" ? "직영 검증 매물" : "",
          broker.isVerified ? "인증 중개사" : "인증 대기"
        ].filter(Boolean)
      };
    })
    .filter((item) => item.routingScore >= 40)
    .sort((a, b) => b.routingScore - a.routingScore)
    .slice(0, 5);
}
