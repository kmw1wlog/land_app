import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { getFusionCreditReadiness, getFusionDataEvidence } from "@/server/public-data/fusion/dataSourceRegistry";
import { buildFusedRegionSignals } from "@/server/public-data/fusion/fusionEvidence";

async function main() {
  const evidence = getFusionDataEvidence();
  const readiness = getFusionCreditReadiness(evidence);
  const signals = buildFusedRegionSignals();
  const record = {
    checkedAt: new Date().toISOString(),
    readiness,
    evidence,
    fusedSignals: signals
  };
  mkdirSync(path.join(process.cwd(), "artifacts", "fusion"), { recursive: true });
  writeFileSync(path.join(process.cwd(), "artifacts", "fusion", "fusion-data-verification.json"), JSON.stringify(record, null, 2));
  writeFileSync(path.join(process.cwd(), "docs", "fusion-data-evidence.md"), toEvidenceMarkdown(record));
  writeFileSync(path.join(process.cwd(), "docs", "molit-bonus-checklist.md"), toBonusMarkdown(record));
  console.log(JSON.stringify(record, null, 2));
}

function toEvidenceMarkdown(record: {
  checkedAt: string;
  readiness: ReturnType<typeof getFusionCreditReadiness>;
  evidence: ReturnType<typeof getFusionDataEvidence>;
  fusedSignals: ReturnType<typeof buildFusedRegionSignals>;
}) {
  const realProviders = record.evidence.filter((item) => item.sourceType === "real").map((item) => item.provider).join(", ") || "없음";
  const seedProviders = record.evidence.filter((item) => item.sourceType !== "real").map((item) => `${item.provider}(${item.sourceType})`).join(", ") || "없음";
  return [
    "# 주관기관 융합데이터 증빙",
    "",
    `- checkedAt: ${record.checkedAt}`,
    "",
    "## 현재 체크 가능 여부",
    "",
    `- 주관기관 융합데이터 체크 가능: ${record.readiness.canCheckMultiAgencyFusion}`,
    `- 사유: ${record.readiness.reason}`,
    `- 실제 데이터 provider: ${realProviders}`,
    `- seed/mock provider: ${seedProviders}`,
    "",
    "## 데이터별 사용 위치",
    "",
    "| Provider | Dataset | Real/Seed | Row count | Used in | Notes |",
    "| --- | --- | --- | ---: | --- | --- |",
    ...record.evidence.map(
      (item) =>
        `| ${item.provider} | ${item.datasetName} | ${item.sourceType} | ${item.rowCount} | ${item.usedIn.join(", ")} | ${item.note ?? ""} |`
    ),
    "",
    "## Fused Region Signals",
    "",
    "| Region | Month | Fused score | Grade | Source type | Evidence |",
    "| --- | --- | ---: | --- | --- | --- |",
    ...record.fusedSignals.map(
      (item) => `| ${item.region} | ${item.month} | ${item.fusedStabilityScore} | ${item.fusedRiskGrade} | ${item.sourceType} | ${item.evidence.join(", ")} |`
    ),
    "",
    "seed/mock만으로는 주관기관 융합데이터 가점 박스를 체크하지 않는다."
  ].join("\n");
}

function toBonusMarkdown(record: {
  readiness: ReturnType<typeof getFusionCreditReadiness>;
  evidence: ReturnType<typeof getFusionDataEvidence>;
}) {
  const status = Object.fromEntries(record.evidence.map((item) => [item.provider, item.sourceType]));
  return [
    "# 국토교통 데이터 활용 경진대회 가점 자가체크",
    "",
    "## AI 활용",
    "",
    "체크 가능: 예",
    "",
    "근거:",
    "- AI학습도구: Time-Series Transformer",
    "- AI분석도구: TurboQuant-inspired RAG + Qwen 설명봇",
    "- 단순 검색이 아니라 공공데이터 feature, 구매력 계산, Transformer 산출물, RAG 근거를 결합해 설명",
    "",
    "## 주관기관 융합데이터",
    "",
    `체크 가능: ${record.readiness.canCheckMultiAgencyFusion ? "예" : "아니오"}`,
    "",
    "체크 가능 조건:",
    "- MOLIT 실거래 데이터는 real",
    "- KREB/HUG/KMAAS/TRANSPORT 중 최소 1개 이상이 real",
    "- 해당 데이터가 fused stability score, UI, RAG, AI 설명에 실제 반영됨",
    "",
    "현재 상태:",
    `- MOLIT: ${status.MOLIT ?? "미연동"}`,
    `- KREB: ${status.KREB ?? "미연동"}`,
    `- HUG: ${status.HUG ?? "미연동"}`,
    `- TRANSPORT/KMAAS: ${status.TRANSPORT ?? status.KMAAS ?? "미연동"}`,
    "",
    `최종 제출 시 체크 여부: ${record.readiness.canCheckMultiAgencyFusion}`,
    "",
    "seed/mock만으로는 주관기관 융합데이터 체크하지 않는다. MVP에서는 확장 구현 가능성과 동일 파이프라인 적용 근거로만 제시한다."
  ].join("\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
