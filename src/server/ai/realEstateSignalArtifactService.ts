import { existsSync, readFileSync } from "fs";
import path from "path";

type PredictionRow = {
  complexId: string;
  asofMonth: string;
  futureReturn: number | null;
  currentPrice: number | null;
  futurePrice: number | null;
  currentTrade3m: number | null;
  futureTradeCount: number | null;
  probFutureRecovery: number | null;
  probTransactionReactivation: number | null;
  probDownsideRisk: number | null;
  candidateAiScore: number | null;
  split: string | null;
};

type MetricTarget = {
  accuracy?: number;
  auc?: number;
  positive_rate?: number;
  skipped?: boolean;
  reason?: string;
};

type TrainingMetric = {
  epoch?: number;
  train_loss?: number;
  accuracy?: number;
  exact_match_accuracy?: number;
  mean_auc?: number;
  targets?: Record<string, MetricTarget>;
};

type MetricsFile = {
  config?: Record<string, unknown>;
  device?: string;
  split_strategy?: string;
  final_metrics?: TrainingMetric;
  history?: TrainingMetric[];
};

const OUTPUT_DIR = path.join(process.cwd(), "artifacts", "model_outputs");
const PREDICTIONS_PATH = path.join(OUTPUT_DIR, "transformer_predictions.csv");
const METRICS_PATH = path.join(OUTPUT_DIR, "transformer_metrics.json");
const PARTIAL_HISTORY_PATH = path.join(OUTPUT_DIR, "checkpoints", "training_history_partial.json");

export function getRealEstateAiSignalFeed(input: {
  limit?: number;
  split?: string;
  lawdCode?: string;
  complexId?: string;
  asofMonth?: string;
  minScore?: number;
}) {
  const metrics = readJson<MetricsFile>(METRICS_PATH) ?? {};
  const checkpointHistory = readJson<TrainingMetric[]>(PARTIAL_HISTORY_PATH) ?? [];
  const rows = readPredictions(PREDICTIONS_PATH)
    .filter((row) => !input.split || row.split === input.split)
    .filter((row) => !input.lawdCode || row.complexId.startsWith(`${input.lawdCode}|`))
    .filter((row) => !input.complexId || row.complexId === input.complexId)
    .filter((row) => !input.asofMonth || row.asofMonth.startsWith(input.asofMonth))
    .filter((row) => input.minScore === undefined || (row.candidateAiScore ?? -Infinity) >= input.minScore)
    .sort((a, b) => (b.candidateAiScore ?? -Infinity) - (a.candidateAiScore ?? -Infinity))
    .slice(0, clampLimit(input.limit ?? 20));

  return {
    source: "real_estate_ai_signal_artifacts",
    generatedFrom: {
      predictionsPath: relativeArtifactPath(PREDICTIONS_PATH),
      metricsPath: relativeArtifactPath(METRICS_PATH),
      checkpointHistoryPath: existsSync(PARTIAL_HISTORY_PATH) ? relativeArtifactPath(PARTIAL_HISTORY_PATH) : null
    },
    transformerModel: buildTransformerModelSummary(metrics, checkpointHistory),
    filters: {
      limit: clampLimit(input.limit ?? 20),
      split: input.split ?? null,
      lawdCode: input.lawdCode ?? null,
      complexId: input.complexId ?? null,
      asofMonth: input.asofMonth ?? null,
      minScore: input.minScore ?? null
    },
    signals: rows.map(toSignalResponse),
    disclaimer:
      "공공 실거래 기반 AI 후보 신호입니다. 투자 권유가 아니며, 실제 매물/권리/대출 조건은 별도 확인이 필요합니다."
  };
}

function buildTransformerModelSummary(metrics: MetricsFile, checkpointHistory: TrainingMetric[]) {
  const transformerHistory = checkpointHistory.length ? checkpointHistory : metrics.history ?? [];
  const bestTransformer = bestBy(transformerHistory, (item) => item.mean_auc);
  const bestTransformerExact = bestBy(transformerHistory, (item) => item.exact_match_accuracy);

  return {
    decision: "transformer_time_series_signal",
    productionRecommendation:
      "Use the GPU-trained Transformer checkpoint as the AI candidate ranking and explanation signal.",
    bestMeanAuc: bestTransformer ?? null,
    bestExactMatch: bestTransformerExact ?? null,
    finalMetrics: metrics.final_metrics ?? null,
    checkpointStatus: {
      partialEpochs: transformerHistory.length,
      bestCheckpoint: "artifacts/model_outputs/checkpoints/best_mean_auc.pt",
      latestCheckpoint: "artifacts/model_outputs/checkpoints/latest.pt"
    }
  };
}

function readPredictions(filePath: string): PredictionRow[] {
  if (!existsSync(filePath)) return [];
  const [headerLine, ...lines] = readFileSync(filePath, "utf8").trim().split(/\r?\n/);
  if (!headerLine) return [];
  const headers = parseCsvLine(headerLine);
  return lines
    .filter(Boolean)
    .map((line) => rowFromCsv(headers, parseCsvLine(line)));
}

function rowFromCsv(headers: string[], values: string[]): PredictionRow {
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  return {
    complexId: row.complex_id ?? "",
    asofMonth: row.asof_month ?? "",
    futureReturn: numberOrNull(row.future_return),
    currentPrice: numberOrNull(row.current_price),
    futurePrice: numberOrNull(row.future_price),
    currentTrade3m: numberOrNull(row.current_trade_3m),
    futureTradeCount: numberOrNull(row.future_trade_count),
    probFutureRecovery: numberOrNull(row.prob_future_recovery),
    probTransactionReactivation: numberOrNull(row.prob_transaction_reactivation),
    probDownsideRisk: numberOrNull(row.prob_downside_risk),
    candidateAiScore: numberOrNull(row.candidate_ai_score),
    split: row.split || null
  };
}

function toSignalResponse(row: PredictionRow) {
  const [lawdCode5, complexName, propertyType, areaBucket] = row.complexId.split("|");
  return {
    id: row.complexId,
    lawdCode5,
    complexName,
    propertyType,
    areaBucket,
    asofMonth: row.asofMonth,
    split: row.split,
    ai: {
      candidateScore: row.candidateAiScore,
      probabilityFutureRecovery: row.probFutureRecovery,
      probabilityTransactionReactivation: row.probTransactionReactivation,
      probabilityDownsideRisk: row.probDownsideRisk
    },
    observedOutcomeForBacktest: {
      futureReturn: row.futureReturn,
      currentPrice: row.currentPrice,
      futurePrice: row.futurePrice,
      currentTrade3m: row.currentTrade3m,
      futureTradeCount: row.futureTradeCount
    },
    explanation: buildSignalExplanation(row)
  };
}

function buildSignalExplanation(row: PredictionRow) {
  const reasons: string[] = [];
  if ((row.probFutureRecovery ?? 0) >= 0.6) reasons.push("3개월 회복 확률이 높게 산출됐습니다.");
  if ((row.probTransactionReactivation ?? 0) >= 0.6) reasons.push("거래 재활성화 확률이 높게 산출됐습니다.");
  if ((row.probDownsideRisk ?? 1) <= 0.35) reasons.push("하락 리스크 확률이 낮게 산출됐습니다.");
  if (!reasons.length) reasons.push("복합 AI 점수 기준 상위 후보입니다.");
  return reasons;
}

function parseCsvLine(line: string) {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      out.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  out.push(current);
  return out;
}

function readJson<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function bestBy<T>(items: T[], pick: (item: T) => number | undefined) {
  let best: T | null = null;
  let bestValue = -Infinity;
  for (const item of items) {
    const value = pick(item);
    if (typeof value === "number" && Number.isFinite(value) && value > bestValue) {
      best = item;
      bestValue = value;
    }
  }
  return best;
}

function numberOrNull(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampLimit(limit: number) {
  if (!Number.isFinite(limit)) return 20;
  return Math.max(1, Math.min(100, Math.floor(limit)));
}

function relativeArtifactPath(filePath: string) {
  return path.relative(process.cwd(), filePath);
}
