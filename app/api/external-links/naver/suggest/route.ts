import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { isAllowedNaverUrl } from "@/server/external-links/naverRealEstateLinkResolver";

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (!body.externalUrl || !isAllowedNaverUrl(body.externalUrl)) {
    return NextResponse.json({ error: "naver.com https URL만 등록할 수 있습니다." }, { status: 400 });
  }
  const mapping = await prisma.externalComplexLinkMapping.create({
    data: {
      provider: "naver",
      lawdCode5: body.lawdCode5,
      legalDongCode10: body.legalDongCode10,
      region: body.region,
      legalDong: body.legalDong,
      complexName: body.complexName,
      propertyType: body.propertyType === "officetel" ? "officetel" : "apartment",
      address: body.address,
      externalUrl: body.externalUrl,
      matchType: "user_submitted",
      accuracyLevel: "exact_mapped_complex",
      verificationStatus: "pending",
      createdByUserId: body.userId ?? "user-1"
    }
  });
  return NextResponse.json({ id: mapping.id, status: mapping.verificationStatus });
}
