import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { logAccess } from "@/server/security/audit";

export const runtime = "nodejs";

export async function GET() {
  const [brokers, listings, leads] = await Promise.all([
    prisma.broker.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.listing.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" } })
  ]);
  const [compliances, photos, checklists] = await Promise.all([
    prisma.listingDisplayCompliance.findMany({ where: { listingId: { in: listings.map((item) => item.id) } } }),
    prisma.listingPhoto.findMany({ where: { listingId: { in: listings.map((item) => item.id) } }, orderBy: { createdAt: "desc" } }),
    prisma.directVerificationChecklist.findMany({ where: { listingId: { in: listings.map((item) => item.id) } } })
  ]);
  await logAccess({
    actorType: "broker",
    action: "list_leads",
    targetType: "Lead",
    purpose: "broker_dashboard"
  });
  return NextResponse.json({
    brokers,
    listings: listings.map((listing) => ({
      ...listing,
      salePrice: Number(listing.salePrice),
      deposit: listing.deposit === null ? null : Number(listing.deposit),
      monthlyRent: listing.monthlyRent === null ? null : Number(listing.monthlyRent),
      managementFee: listing.managementFee === null ? null : Number(listing.managementFee),
      compliance: compliances.find((item) => item.listingId === listing.id),
      photos: photos.filter((item) => item.listingId === listing.id),
      directVerification: checklists.find((item) => item.listingId === listing.id)
    })),
    leads: leads.map((lead) => ({
      ...lead,
      userBudget: lead.userBudget === null ? null : Number(lead.userBudget),
      userCash: lead.userCash === null ? null : Number(lead.userCash),
      userMonthlyIncome: lead.userMonthlyIncome === null ? null : Number(lead.userMonthlyIncome),
      budgetBand: lead.budgetBand,
      contactInfo: lead.contactInfo,
      targetPrice: lead.targetPrice === null ? null : Number(lead.targetPrice)
    }))
  });
}
