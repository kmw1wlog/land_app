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
  const snapshots = await prisma.complexSignalSnapshot.findMany({
    orderBy: [{ recommendationScore: "desc" }, { transactionHeat: "desc" }],
    take: 120
  });

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
