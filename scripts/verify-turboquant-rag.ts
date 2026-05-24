import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { hashEmbedding } from "@/server/rag/embedding";
import {
  LEGACY_TURBO_VECTOR_CONFIG,
  TURBO_VECTOR_CONFIG,
  cosineApproxFromQuantized,
  dot,
  estimateQuantizedVectorBytes,
  normalizeVector,
  quantizeVector,
  type TurboVectorConfig
} from "@/server/rag/turboVector/quantize";

type BenchmarkResult = {
  name: string;
  recallAt4: number;
  recallAt10: number;
  meanCosineError: number;
  storageBytesPerVector: number;
  searchLatencyMs: number;
};

const corpus = [
  "대구 수성구 범어동 84㎡ 아파트 최근 실거래 기준가 전세가율 거래 집중도",
  "대구 동구 신암동 59㎡ 주거 이동 후보 거래 재활성화 회복 확률",
  "청년 사회초년생 월소득 월저축 현재 집 정리 후 구매력 계산",
  "매수 추천 수익 보장 대출 승인 보장 금지 안전 정책",
  "같은 예산 후보 비교 전고점 대비 낙폭 90일 거래량 전세가율",
  "국토교통 실거래 공개 데이터 법정동 코드 건축물대장 출처",
  "Transformer AI 후보점수 회복 확률 하락 리스크 백테스트",
  "현재 집 추정가 대출잔액 매각 후 순현금 갈아타기 경로",
  "커뮤니티 실거주 후기 단지방 거래 제보 검증 질문",
  "외부 매물 확인 실제 매물 권리관계 세금 금융기관 확인"
];

const queries = [
  "왜 이 후보가 떴어 거래 집중도 전세가율",
  "같은 예산이면 어디가 더 안전해",
  "내 월급과 현재 집으로 어디까지 가능해",
  "데이터 출처와 AI 근거가 뭐야",
  "이 결과가 매수 추천이야 수익 보장이야"
];

async function main() {
  const embeddings = corpus.map((text) => hashEmbedding(text, 384));
  const queryEmbeddings = queries.map((text) => hashEmbedding(text, 384));
  const floatRankings = queryEmbeddings.map((query) => rankFloat(query, embeddings));
  const variants: Array<{ name: string; config: TurboVectorConfig }> = [
    { name: "legacy pseudo rotation", config: LEGACY_TURBO_VECTOR_CONFIG },
    {
      name: "RHT + normal codebook",
      config: { ...TURBO_VECTOR_CONFIG, residualCorrection: false }
    },
    {
      name: "RHT + residual correction",
      config: TURBO_VECTOR_CONFIG
    }
  ];

  const results = variants.map(({ name, config }) => evaluateVariant(name, config, embeddings, queryEmbeddings, floatRankings));
  const record = {
    checkedAt: new Date().toISOString(),
    description: "TurboQuant-inspired RAG verification for HomePath compact SQLite retrieval.",
    pipeline: [
      "embedding",
      "normalize",
      "randomized Hadamard rotation with 512 padding",
      "normal-quantile scalar quantization",
      "TurboQuant-inspired residual sign correction",
      "SQLite compressed vector store",
      "RAG topK retrieval"
    ],
    baseline: {
      name: "float cosine baseline",
      storageBytesPerVector: embeddings[0].length * 4
    },
    results
  };

  mkdirSync(path.join(process.cwd(), "artifacts", "rag"), { recursive: true });
  writeFileSync(path.join(process.cwd(), "artifacts", "rag", "turboquant-rag-verification.json"), JSON.stringify(record, null, 2));
  writeFileSync(path.join(process.cwd(), "docs", "turboquant-rag-verification.md"), toMarkdown(record));
  console.log(JSON.stringify(record, null, 2));
}

function evaluateVariant(
  name: string,
  config: TurboVectorConfig,
  embeddings: number[][],
  queryEmbeddings: number[][],
  floatRankings: number[][]
): BenchmarkResult {
  const quantizedDocs = embeddings.map((embedding) => quantizeVector(embedding, config));
  const storageBytesPerVector = Math.round(
    quantizedDocs.reduce((sum, item) => sum + estimateQuantizedVectorBytes(item), 0) / Math.max(1, quantizedDocs.length)
  );
  const startedAt = performance.now();
  const quantizedRankings = queryEmbeddings.map((query) => {
    const quantizedQuery = quantizeVector(query, config);
    return quantizedDocs
      .map((doc, index) => ({ index, score: cosineApproxFromQuantized(quantizedQuery, doc) }))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.index);
  });
  const searchLatencyMs = Number(((performance.now() - startedAt) / Math.max(1, queryEmbeddings.length)).toFixed(3));
  const meanCosineError = mean(
    queryEmbeddings.flatMap((query, queryIndex) => {
      const quantizedQuery = quantizeVector(query, config);
      return embeddings.map((doc, docIndex) => {
        const floatScore = cosine(normalizeVector(query), normalizeVector(doc));
        const quantScore = cosineApproxFromQuantized(quantizedQuery, quantizedDocs[docIndex]);
        return Math.abs(floatScore - quantScore);
      });
    })
  );

  return {
    name,
    recallAt4: Number(meanRecall(floatRankings, quantizedRankings, 4).toFixed(3)),
    recallAt10: Number(meanRecall(floatRankings, quantizedRankings, 10).toFixed(3)),
    meanCosineError: Number(meanCosineError.toFixed(4)),
    storageBytesPerVector,
    searchLatencyMs
  };
}

function rankFloat(query: number[], docs: number[][]) {
  const normalizedQuery = normalizeVector(query);
  return docs
    .map((doc, index) => ({ index, score: cosine(normalizedQuery, normalizeVector(doc)) }))
    .sort((a, b) => b.score - a.score)
    .map((item) => item.index);
}

function cosine(a: number[], b: number[]) {
  const denom = Math.sqrt(dot(a, a)) * Math.sqrt(dot(b, b)) || 1;
  return dot(a, b) / denom;
}

function meanRecall(baseline: number[][], candidate: number[][], k: number) {
  return mean(
    baseline.map((ranking, index) => {
      const expected = new Set(ranking.slice(0, k));
      const actual = candidate[index].slice(0, k);
      return actual.filter((item) => expected.has(item)).length / Math.max(1, expected.size);
    })
  );
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function toMarkdown(record: {
  checkedAt: string;
  description: string;
  pipeline: string[];
  baseline: { name: string; storageBytesPerVector: number };
  results: BenchmarkResult[];
}) {
  return [
    "# TurboQuant-inspired RAG Verification",
    "",
    `- checkedAt: ${record.checkedAt}`,
    `- description: ${record.description}`,
    `- baseline: ${record.baseline.name}`,
    `- float storage bytes/vector: ${record.baseline.storageBytesPerVector}`,
    "",
    "## Pipeline",
    "",
    ...record.pipeline.map((item, index) => `${index + 1}. ${item}`),
    "",
    "## Results",
    "",
    "| variant | recall@4 | recall@10 | cosine error | bytes/vector | latency ms/query |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...record.results.map(
      (item) =>
        `| ${item.name} | ${item.recallAt4} | ${item.recallAt10} | ${item.meanCosineError} | ${item.storageBytesPerVector} | ${item.searchLatencyMs} |`
    ),
    "",
    "This is a TurboQuant-inspired compact retrieval path, not a claim of full paper reproduction.",
    ""
  ].join("\n");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
