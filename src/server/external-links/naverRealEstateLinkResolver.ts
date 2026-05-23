import { prisma } from "@/server/db";

type AccuracyLevel = "exact_mapped_complex" | "address_search" | "complex_name_search" | "region_search";

export async function resolveNaverRealEstateLink(input: {
  lawdCode5?: string | null;
  legalDongCode10?: string | null;
  region?: string | null;
  legalDong?: string | null;
  complexName: string;
  propertyType: "apartment" | "officetel";
  address?: string | null;
  areaBucket?: string | null;
}): Promise<{
  url: string;
  accuracyLevel: AccuracyLevel;
  source: "manual_mapping" | "user_mapping" | "generated_search";
  label: string;
}> {
  const mapping = await prisma.externalComplexLinkMapping.findFirst({
    where: {
      provider: "naver",
      verificationStatus: "verified",
      lawdCode5: input.lawdCode5 ?? undefined,
      complexName: input.complexName,
      propertyType: input.propertyType
    },
    orderBy: { updatedAt: "desc" }
  });

  if (mapping && isAllowedNaverUrl(mapping.externalUrl)) {
    return {
      url: mapping.externalUrl,
      accuracyLevel: "exact_mapped_complex",
      source: mapping.matchType === "manual_admin" ? "manual_mapping" : "user_mapping",
      label: "외부 사이트에서 매물 확인"
    };
  }

  const queryParts = input.address
    ? [input.address, input.complexName]
    : input.region || input.legalDong
      ? [input.region, input.legalDong, input.complexName, "부동산"]
      : [input.complexName, "부동산"];
  const query = queryParts.filter(Boolean).join(" ");

  return {
    url: `https://search.naver.com/search.naver?query=${encodeURIComponent(query)}`,
    accuracyLevel: input.address ? "address_search" : input.region ? "complex_name_search" : "region_search",
    source: "generated_search",
    label: "외부 사이트에서 매물 확인"
  };
}

export function isAllowedNaverUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && (parsed.hostname === "naver.com" || parsed.hostname.endsWith(".naver.com"));
  } catch {
    return false;
  }
}
