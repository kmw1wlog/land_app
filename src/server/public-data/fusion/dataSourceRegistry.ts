import { buildFusionDataEvidence } from "./fusionEvidence";
import type { FusionDataEvidence, FusionProvider } from "./types";

export function getFusionDataEvidence() {
  return buildFusionDataEvidence();
}

export function hasRealMultiAgencyFusion(evidence: FusionDataEvidence[] = getFusionDataEvidence()) {
  const realProviders = new Set(
    evidence.filter((item) => item.sourceType === "real" && item.rowCount > 0).map((item) => item.provider)
  );
  return realProviders.has("MOLIT") && ["KREB", "HUG", "KMAAS", "TRANSPORT"].some((provider) => realProviders.has(provider as FusionProvider));
}

export function getFusionCreditReadiness(evidence: FusionDataEvidence[] = getFusionDataEvidence()) {
  const realProviders = evidence
    .filter((item) => item.sourceType === "real" && item.rowCount > 0)
    .map((item) => item.provider);
  const seedProviders = evidence
    .filter((item) => item.sourceType !== "real" && item.rowCount > 0)
    .map((item) => item.provider);
  const canCheckMultiAgencyFusion = hasRealMultiAgencyFusion(evidence);
  return {
    canCheckMultiAgencyFusion,
    reason: canCheckMultiAgencyFusion
      ? `MOLIT와 ${realProviders.filter((provider) => provider !== "MOLIT").join(", ")} 실데이터가 fused stability score에 함께 반영된다.`
      : `현재 실데이터 provider는 ${realProviders.join(", ") || "없음"}이고, ${seedProviders.join(", ") || "추가 provider"}는 seed/mock이므로 주관기관 융합데이터 가점 체크는 보류한다.`,
    providers: realProviders,
    seedProviders
  };
}
