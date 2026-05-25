import { buildFusionDataEvidence } from "./fusionEvidence";
import type { FusionCreditReadiness, FusionDataEvidence, FusionProvider } from "./types";

export function getFusionDataEvidence() {
  return buildFusionDataEvidence();
}

export function hasRealMultiAgencyFusion(evidence: FusionDataEvidence[] = getFusionDataEvidence()) {
  const realProviders = new Set(
    evidence.filter((item) => item.sourceType === "real" && item.rowCount > 0).map((item) => item.provider)
  );
  const usedProviders = new Set(
    evidence
      .filter((item) => item.usedIn.some((usedIn) => /fused stability score|RAG|UI/i.test(usedIn)))
      .map((item) => item.provider)
  );
  return (
    realProviders.has("MOLIT") &&
    ["KREB", "HUG", "KMAAS", "TRANSPORT"].some(
      (provider) => realProviders.has(provider as FusionProvider) && usedProviders.has(provider as FusionProvider)
    )
  );
}

export function getFusionCreditReadiness(evidence: FusionDataEvidence[] = getFusionDataEvidence()): FusionCreditReadiness {
  const realProviders = evidence
    .filter((item) => item.sourceType === "real" && item.rowCount > 0)
    .map((item) => item.provider);
  const seedProviders = evidence
    .filter((item) => item.sourceType !== "real" && item.rowCount > 0)
    .map((item) => item.provider);
  const canCheckMultiAgencyFusion = hasRealMultiAgencyFusion(evidence);
  const secondaryRealProviders = realProviders.filter((provider) => provider !== "MOLIT");
  const missingForStrongerClaim = ["KREB", "HUG", "KMAAS/TRANSPORT"].filter((label) => {
    if (label === "KMAAS/TRANSPORT") return !realProviders.includes("KMAAS") && !realProviders.includes("TRANSPORT");
    return !realProviders.includes(label as FusionProvider);
  });
  return {
    canCheckMultiAgencyFusion,
    reason: canCheckMultiAgencyFusion
      ? `MOLIT와 ${secondaryRealProviders.join(", ")} 실데이터가 fused stability score, RAG, UI에 함께 반영된다.`
      : `현재 실데이터 provider는 ${realProviders.join(", ") || "없음"}이고, ${seedProviders.join(", ") || "추가 provider"}는 seed/mock이므로 주관기관 융합데이터 가점 체크는 보류한다.`,
    providers: realProviders,
    realProviders,
    seedProviders,
    missingForStrongerClaim,
    requiredNextStep: canCheckMultiAgencyFusion
      ? "HUG 또는 K-MaaS/교통 real provider를 추가하면 다기관 융합 설득력이 더 강해진다."
      : "KREB/HUG/KMAAS/TRANSPORT 중 최소 1개 real dataset을 연결하고 fused score, RAG, UI 사용 위치를 검증해야 한다."
  };
}
