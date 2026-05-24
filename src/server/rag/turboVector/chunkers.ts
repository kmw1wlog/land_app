import { existsSync, readFileSync } from "fs";
import path from "path";
import { prisma } from "@/server/db";
import { formatKRW } from "@/lib/format";
import { getRealEstateAiSignalFeed } from "@/server/ai/realEstateSignalArtifactService";
import type { RagChunk } from "./types";

const DOC_TARGETS = [
  "README.md",
  "docs/homepath-molit-submission-update.md",
  "docs/demo-recording-guide.md",
  "artifacts/model_outputs/transformer_metrics.json",
  "artifacts/model_outputs/feature_manifest.json"
];

export async function buildHomePathRagChunks() {
  const chunks: RagChunk[] = [
    ...buildDocumentChunks(),
    ...buildSafetyAndFaqChunks(),
    ...buildAiArtifactChunks(),
    ...(await buildComplexSignalChunks())
  ];
  return chunks;
}

function buildDocumentChunks(): RagChunk[] {
  const chunks: RagChunk[] = [];
  for (const relativePath of DOC_TARGETS) {
    const absolutePath = path.join(process.cwd(), relativePath);
    if (!existsSync(absolutePath)) continue;
    const raw = readFileSync(absolutePath, "utf8");
    const text =
      relativePath.endsWith(".json")
        ? compactJsonForRag(raw)
        : raw;
    chunks.push(
      ...splitText(text, 1400).map((part, index) => ({
        id: `doc:${relativePath}:${index}`,
        sourceType: relativePath.includes("model_outputs") ? "model_artifact" : "doc",
        sourceId: relativePath,
        title: `${relativePath} #${index + 1}`,
        text: part,
        metadata: {
          path: relativePath,
          chunkIndex: index
        }
      } satisfies RagChunk))
    );
  }
  return chunks;
}

function buildSafetyAndFaqChunks(): RagChunk[] {
  return [
    {
      id: "safety:decision-support",
      sourceType: "safety_policy",
      title: "홈패스 안전 원칙",
      text:
        "홈패스는 매수 추천, 특정 단지 매입 권유, 수익 보장, 대출 승인 보장을 하지 않는다. 모든 답변은 공공 실거래 데이터와 사용자 입력을 바탕으로 한 참고용 의사결정 보조 설명이어야 한다.",
      metadata: { policy: "decision_support_only" }
    },
    {
      id: "faq:why-candidate",
      sourceType: "faq",
      title: "왜 후보가 떴나요?",
      text:
        "후보는 최근 실거래 기준가, 거래량, 거래 집중도, 전고점 대비 하락률, 전세가율, 사용자 구매력, DSR/LTV 참고값, Transformer 회복/재활성화/하락 리스크 신호를 함께 보고 설명한다.",
      metadata: { intent: "candidate_reason" }
    },
    {
      id: "faq:data-source",
      sourceType: "faq",
      title: "데이터 출처",
      text:
        "홈패스는 국토교통부 실거래 공개 데이터, 법정동 코드, 건축물대장/공공데이터 연계 결과, 앱 내부 계산 로직, Transformer 모델 산출물을 함께 사용한다.",
      metadata: { intent: "data_source" }
    },
    {
      id: "faq:purchase-power",
      sourceType: "faq",
      title: "구매력은 어떻게 설명하나요?",
      text:
        "구매력 질문은 현재 보유 현금과 대출 추정 한도로 본 현재 구매력, 현재 집 매각 후 순현금을 반영한 정리 후 예산, 소득·저축 증가를 가정한 미래 구매력을 나눠 설명한다. DSR/LTV는 참고값이며 대출 승인 보장이 아니다.",
      metadata: { intent: "purchase_power" }
    },
    {
      id: "faq:same-budget-comparison",
      sourceType: "faq",
      title: "같은 예산 후보 비교 기준",
      text:
        "같은 예산 후보 비교는 단일 승자를 고르지 않고 거래량, 거래 집중도, 전세가율, 전고점 대비 낙폭, Transformer 회복/하락 리스크 신호, 사용자 현금흐름 부담을 함께 본다. 위험성향이 낮으면 보수적 해석을 먼저 둔다.",
      metadata: { intent: "comparison" }
    },
    {
      id: "faq:risk-check",
      sourceType: "faq",
      title: "리스크 체크 기준",
      text:
        "리스크 설명은 하락 리스크 확률, 전세가율 급등, 거래 부재, 공급·공실 가능성, 금리와 대출 부담, 실제 매물과 실거래 기준가의 차이를 점검한다. 위험 신호가 있어도 매수·매도 지시가 아니라 확인 조건으로 제시한다.",
      metadata: { intent: "risk_check" }
    },
    {
      id: "faq:current-home",
      sourceType: "faq",
      title: "현재 집을 넣은 경우 설명 기준",
      text:
        "사용자가 현재 집을 입력하면 추정가, 매입가, 대출잔액, 매각 후 순현금, 보유·매도·전세/월세 전환 선택지를 구분해 설명한다. 세금·법률·대출 조건은 확답하지 않고 추가 확인 항목으로 둔다.",
      metadata: { intent: "purchase_power" }
    }
  ];
}

function buildAiArtifactChunks(): RagChunk[] {
  const feed = getRealEstateAiSignalFeed({ limit: 40 });
  return feed.signals.map((signal, index) => ({
    id: `model-signal:${signal.id}:${signal.asofMonth}`,
    sourceType: "model_artifact",
    sourceId: signal.id,
    title: `Transformer AI signal ${signal.complexName}`,
    text:
      `${signal.complexName} ${signal.areaBucket}는 ${signal.asofMonth} 기준 AI 후보점수 ${signal.ai.candidateScore}점이다. ` +
      `회복 확률 ${percent(signal.ai.probabilityFutureRecovery)}, 거래 재활성화 확률 ${percent(signal.ai.probabilityTransactionReactivation)}, ` +
      `하락 리스크 확률 ${percent(signal.ai.probabilityDownsideRisk)}로 산출됐다. ` +
      `백테스트 관측 3개월 수익률은 ${percent(signal.observedOutcomeForBacktest.futureReturn)}다.`,
    metadata: {
      source: "transformer_predictions",
      complexName: signal.complexName,
      lawdCode5: signal.lawdCode5,
      areaBucket: signal.areaBucket,
      aiScore: signal.ai.candidateScore,
      rank: index + 1
    }
  }));
}

async function buildComplexSignalChunks(): Promise<RagChunk[]> {
  const snapshots = await prisma.complexSignalSnapshot
    .findMany({
      orderBy: [{ recommendationScore: "desc" }, { transactionHeat: "desc" }],
      take: 120
    })
    .catch(() => []);

  if (!snapshots.length) {
    return buildArtifactBackedComplexSignalChunks();
  }

  return snapshots.map((snapshot) => ({
    id: `complex-signal:${snapshot.id}`,
    sourceType: "complex_signal",
    sourceId: snapshot.id,
    title: `${snapshot.complexName} ${snapshot.areaBucket}`,
    text:
      `${snapshot.region ?? snapshot.legalDong ?? snapshot.lawdCode5} ${snapshot.complexName} ${snapshot.areaBucket} ${snapshot.floorBand} 후보. ` +
      `최근 실거래 기준가 ${snapshot.referencePrice ? formatKRW(Number(snapshot.referencePrice)) : "부족"}, ` +
      `90일 거래 ${snapshot.volume90d}건, 30일 거래 ${snapshot.volume30d}건, 거래 집중도 ${(snapshot.transactionHeat ?? 0).toFixed(2)}배, ` +
      `전고점 대비 ${snapshot.drawdownFromHigh?.toFixed(1) ?? "미상"}%, 전세가율 ${snapshot.jeonseRatio?.toFixed(1) ?? "미상"}%, ` +
      `추천 점수 ${(snapshot.recommendationScore ?? 0).toFixed(1)}, 유동성 ${(snapshot.liquidityScore ?? 0).toFixed(1)}, 대장성 ${(snapshot.leaderScore ?? 0).toFixed(1)}.`,
    metadata: {
      complexName: snapshot.complexName,
      lawdCode5: snapshot.lawdCode5,
      region: snapshot.region,
      areaBucket: snapshot.areaBucket,
      floorBand: snapshot.floorBand,
      recommendationScore: snapshot.recommendationScore
    }
  }));
}

function buildArtifactBackedComplexSignalChunks(): RagChunk[] {
  const feed = getRealEstateAiSignalFeed({ limit: 40 });
  return feed.signals.map((signal, index) => ({
    id: `complex-signal-artifact:${signal.id}:${signal.asofMonth}`,
    sourceType: "complex_signal",
    sourceId: signal.id,
    title: `${signal.complexName} ${signal.areaBucket}`,
    text:
      `${lawdRegionLabel(signal.lawdCode5)} ${signal.complexName} ${signal.areaBucket} 후보. ` +
      `최근 추정 기준가 ${signal.observedOutcomeForBacktest.currentPrice ? formatKRW(signal.observedOutcomeForBacktest.currentPrice) : "부족"}, ` +
      `최근 3개월 거래 ${signal.observedOutcomeForBacktest.currentTrade3m ?? "미상"}건, ` +
      `향후 거래수 예측 ${signal.observedOutcomeForBacktest.futureTradeCount ?? "미상"}건, ` +
      `관측 3개월 수익률 ${percent(signal.observedOutcomeForBacktest.futureReturn)}, ` +
      `AI 후보점수 ${signal.ai.candidateScore ?? "미상"}점. ` +
      `실거래 snapshot 테이블이 비어 있어 Transformer artifact에서 만든 후보 지표 fallback이다.`,
    metadata: {
      source: "transformer_predictions_as_complex_signal_fallback",
      complexName: signal.complexName,
      lawdCode5: signal.lawdCode5,
      region: lawdRegionLabel(signal.lawdCode5),
      areaBucket: signal.areaBucket,
      aiScore: signal.ai.candidateScore,
      rank: index + 1
    }
  }));
}

function compactJsonForRag(raw: string) {
  try {
    const json = JSON.parse(raw) as Record<string, unknown>;
    return JSON.stringify(json, null, 2).slice(0, 18_000);
  } catch {
    return raw.slice(0, 18_000);
  }
}

function splitText(text: string, maxChars: number) {
  const normalized = text.replace(/\s+\n/g, "\n").trim();
  const chunks: string[] = [];
  for (let start = 0; start < normalized.length; start += maxChars) {
    chunks.push(normalized.slice(start, start + maxChars));
  }
  return chunks.length ? chunks : [normalized];
}

function percent(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "미상";
  return `${(value * 100).toFixed(1)}%`;
}

function lawdRegionLabel(lawdCode5: string) {
  const labels: Record<string, string> = {
    "27110": "대구 중구",
    "27140": "대구 동구",
    "27260": "대구 수성구"
  };
  return labels[lawdCode5] ?? lawdCode5;
}
