import { NextRequest, NextResponse } from "next/server";
import { resolveNaverRealEstateLink } from "@/server/external-links/naverRealEstateLinkResolver";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await resolveNaverRealEstateLink({
    lawdCode5: body.lawdCode5,
    legalDongCode10: body.legalDongCode10,
    region: body.region,
    legalDong: body.legalDong,
    complexName: body.complexName,
    propertyType: body.propertyType === "officetel" ? "officetel" : "apartment",
    address: body.address,
    areaBucket: body.areaBucket
  });
  return NextResponse.json(result);
}
