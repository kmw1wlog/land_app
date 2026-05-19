import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { rankBrokersForLead } from "@/server/brokerage/brokerRoutingService";
import { sanitizeLeadPayloadByConsent } from "@/server/brokerage/leadConsentPolicy";
import { logAccess } from "@/server/security/audit";

export const runtime = "nodejs";

const consentText =
  "상담 연결을 위해 선택한 중개사 또는 직영 상담팀에 관심지역, 상담유형, 희망 예산대, 입력한 메시지가 전달됩니다.";

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (body.consentGiven !== true) {
    return NextResponse.json({ error: "consentGiven must be true" }, { status: 400 });
  }
  const sanitized = sanitizeLeadPayloadByConsent(body);

  const routing = await rankBrokersForLead({
    userId: body.userId ?? "user-1",
    targetRegion: body.targetRegion ?? "대구 수성구",
    propertyType: body.propertyType,
    leadType: body.leadType ?? "move_up",
    budget: body.userBudget ?? body.targetPrice,
    targetPrice: body.targetPrice,
    preferredListingId: body.listingId,
    allowAds: true,
    allowDirectVerified: true
  });
  const top = routing[0];

  const [lead] = await prisma.$transaction([
    prisma.lead.create({
    data: {
      userId: body.userId ?? "user-1",
      brokerId: body.brokerId ?? top?.brokerId,
      listingId: body.listingId ?? top?.listingId,
      propertyId: body.propertyId,
      leadType: body.leadType ?? "move_up",
      consentGiven: true,
      consentText,
      userBudget: sanitized.userBudget,
      userCash: sanitized.userCash,
      userMonthlyIncome: sanitized.userMonthlyIncome,
      budgetBand: sanitized.budgetBand,
      contactInfo: sanitized.contactInfo,
      targetRegion: body.targetRegion,
      targetPrice: body.targetPrice ? BigInt(Number(body.targetPrice)) : null,
      currentHomeSummary: sanitized.currentHomeSummary as never,
      message: body.message,
      routingScore: top?.routingScore,
      status: "routed"
    }
    }),
    prisma.consentRecord.create({
      data: {
        userId: body.userId ?? "user-1",
        consentType: "broker_lead_basic",
        consentText,
        granted: true
      }
    }),
    ...(sanitized.consents.financialInfo
      ? [
          prisma.consentRecord.create({
            data: {
              userId: body.userId ?? "user-1",
              consentType: "broker_lead_financial_info",
              consentText: "월소득과 보유 현금을 상담 연결에 함께 전달하는 데 동의합니다.",
              granted: true
            }
          })
        ]
      : []),
    ...(sanitized.consents.currentHomeInfo
      ? [
          prisma.consentRecord.create({
            data: {
              userId: body.userId ?? "user-1",
              consentType: "broker_lead_current_home_info",
              consentText: "현재 집 주소/추정가/대출잔액 요약을 상담 연결에 함께 전달하는 데 동의합니다.",
              granted: true
            }
          })
        ]
      : []),
    ...(sanitized.consents.contactInfo
      ? [
          prisma.consentRecord.create({
            data: {
              userId: body.userId ?? "user-1",
              consentType: "broker_lead_contact_info",
              consentText: "연락처를 상담 연결에 함께 전달하는 데 동의합니다.",
              granted: true
            }
          })
        ]
      : [])
  ]);
  await logAccess({
    actorId: body.userId ?? "user-1",
    actorType: "user",
    action: "create_lead",
    targetType: "Lead",
    targetId: lead.id,
    purpose: "brokerage_consulting_request",
    metadata: { leadType: lead.leadType, targetRegion: lead.targetRegion }
  });
  return NextResponse.json({
    lead: {
      ...lead,
      userBudget: lead.userBudget === null ? null : Number(lead.userBudget),
      userCash: lead.userCash === null ? null : Number(lead.userCash),
      userMonthlyIncome: lead.userMonthlyIncome === null ? null : Number(lead.userMonthlyIncome),
      budgetBand: lead.budgetBand,
      contactInfo: lead.contactInfo,
      targetPrice: lead.targetPrice === null ? null : Number(lead.targetPrice)
    },
    routing
  });
}
