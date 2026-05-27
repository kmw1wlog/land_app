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
  writeFileSync(path.join(process.cwd(), "docs", "molit-submission-technical-summary.md"), toTechnicalSummaryMarkdown(record));
  writeFileSync(path.join(process.cwd(), "docs", "molit-submission-copy.md"), toSubmissionCopyMarkdown(record));
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
        `| ${item.provider} | ${item.datasetName} | ${item.sourceType} | ${item.rowCount} | ${item.usedIn.join(", ")} | ${[
          item.note,
          item.sourceUrl ? `sourceUrl=${item.sourceUrl}` : undefined,
          item.sha256 ? `sha256=${item.sha256.slice(0, 12)}...` : undefined,
          item.normalizedSnapshotPath ? `path=${item.normalizedSnapshotPath}` : undefined
        ]
          .filter(Boolean)
          .join(" / ")} |`
    ),
    "",
    "## Fused Region Signals",
    "",
    "| Region | Month | Fused score | Grade | Confidence | Source type | Evidence |",
    "| --- | --- | ---: | --- | ---: | --- | --- |",
    ...record.fusedSignals.map(
      (item) => `| ${item.region} | ${item.month} | ${item.fusedStabilityScore} | ${item.fusedRiskGrade} | ${item.fusionConfidence} | ${item.sourceType} | ${item.evidence.join(", ")} |`
    ),
    "",
    record.readiness.canCheckMultiAgencyFusion
      ? "현재 가점 체크 가능 판정은 real provider만 사용한다. seed/mock provider는 보조 설명과 확장 구조로만 표시한다."
      : "seed/mock만으로는 주관기관 융합데이터 가점 박스를 체크하지 않는다."
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
    `필요한 다음 단계: ${record.readiness.requiredNextStep ?? "추가 실데이터 확장"}`,
    `강한 주장에 아직 부족한 provider: ${record.readiness.missingForStrongerClaim.join(", ") || "없음"}`,
    "",
    "seed/mock만으로는 주관기관 융합데이터 체크하지 않는다. MVP에서는 확장 구현 가능성과 동일 파이프라인 적용 근거로만 제시한다."
  ].join("\n");
}

function toTechnicalSummaryMarkdown(record: {
  readiness: ReturnType<typeof getFusionCreditReadiness>;
  evidence: ReturnType<typeof getFusionDataEvidence>;
  fusedSignals: ReturnType<typeof buildFusedRegionSignals>;
}) {
  return [
    "# HomePath 국토교통 제출 기술 요약",
    "",
    "## 공공데이터 활용",
    "",
    "HomePath는 국토교통 실거래/전월세, 법정동, 건축물, 주소/지오코딩 계열 데이터를 중심으로 후보 단지의 기준가, 거래량, 전세가율, 전고점 대비 낙폭, 구매력 판단 지표를 생성한다.",
    "",
    "## 주관기관 융합데이터 현재 상태",
    "",
    `- 체크 가능 여부: ${record.readiness.canCheckMultiAgencyFusion}`,
    `- 사유: ${record.readiness.reason}`,
    `- real providers: ${record.readiness.realProviders.join(", ") || "없음"}`,
    `- seed/mock providers: ${record.readiness.seedProviders.join(", ") || "없음"}`,
    "",
    "## real/seed/mock 구분",
    "",
    ...record.evidence.map(
      (item) =>
        `- ${item.provider}: ${item.sourceType}, rows=${item.rowCount}, usedIn=${item.usedIn.join(", ")}${item.sha256 ? `, sha256=${item.sha256}` : ""}`
    ),
    "",
    "## AI학습도구",
    "",
    "Time-Series Transformer는 단지·면적대별 실거래 시계열과 융합데이터 feature를 함께 받아 거래 재활성화, 가격 안정성, 하락 리스크 신호를 산출한다.",
    "",
    "## AI분석도구",
    "",
    "TurboQuant-inspired RAG는 공공데이터 증빙, Transformer artifact, 단지 signal, 안전정책을 압축 벡터 검색으로 가져오고, Qwen 설명봇은 이 근거와 사용자 구매력 계산을 함께 사용해 자연어 답변을 만든다.",
    "",
    "## 단순 검색이 아닌 이유",
    "",
    "답변은 검색 결과를 그대로 보여주는 방식이 아니라 사용자 월소득·현금·현재 집, 후보 단지 실거래 지표, Transformer 산출물, fusion score, 안전정책을 결합해 의사결정 보조 설명으로 재구성한다.",
    "",
    "## 기대효과",
    "",
    "청년·사회초년생과 1주택자가 호가나 소문이 아니라 공공 실거래와 구매력 기준으로 무리한 선택을 줄이고, 부동산 정보 비대칭을 완화하도록 돕는다."
  ].join("\n");
}

function toSubmissionCopyMarkdown(record: {
  readiness: ReturnType<typeof getFusionCreditReadiness>;
}) {
  const currentCopy = record.readiness.canCheckMultiAgencyFusion
    ? `국토교통 실거래 데이터와 ${record.readiness.realProviders
        .filter((provider) => provider !== "MOLIT")
        .map(providerLabel)
        .join("/")} 공식 실데이터를 실제로 융합하여 단지·지역별 주거 안정성 점수를 산출한다. HUG·교통 접근성은 현재 시드 스냅샷으로 보조 반영하며, 실데이터로 단정하지 않는다.`
    : "MVP에서는 국토교통 실거래 데이터와 한국부동산원·HUG·교통 접근성 데이터 구조를 시드 스냅샷으로 구현했으며, 동일한 fusion pipeline으로 실데이터 연동 시 확장 가능하다.";
  return [
    "# 국토교통 제출서용 문구",
    "",
    "## 현재 상태 문구",
    "",
    currentCopy,
    "",
    "## AI 활용 문구",
    "",
    "HomePath는 Time-Series Transformer, TurboQuant-inspired RAG, Qwen 설명봇을 결합해 공공데이터 근거 기반 주거 구매력·갈아타기 리스크 설명을 제공한다.",
    "",
    "## 금지 표현",
    "",
    "- 매수 추천",
    "- 수익 보장",
    "- 대출 승인 가능",
    "- 투자 타이밍 확정"
  ].join("\n");
}

function providerLabel(provider: string) {
  if (provider === "KREB") return "한국부동산원(KREB)";
  if (provider === "HUG") return "HUG";
  if (provider === "KMAAS") return "K-MaaS";
  if (provider === "TRANSPORT") return "교통 접근성";
  return provider;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
