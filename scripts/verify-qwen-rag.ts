import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { buildHomePathRagContext } from "@/server/rag/contextBuilder";
import { getDefaultVectorStore } from "@/server/rag/turboVector/store";
import { generateHomePathChatAnswer } from "@/server/llm/qwenClient";
import { buildHomePathInstructionContext } from "@/server/llm/homepathScenarioInstructions";

const QUESTION = "왜 이 후보가 떴어? 이 결과는 매수 추천이야? 450자 이내로 답해줘.";

async function main() {
  loadEnvLocal();
  process.env.LOCAL_LLM_MAX_TOKENS ??= "600";
  const vectorStore = getDefaultVectorStore();
  const ragChunkCount = "count" in vectorStore ? await vectorStore.count() : null;
  const qwenProbe = await probeConfiguredQwen();
  const withRagContext = await buildHomePathRagContext({ message: QUESTION, useRag: true });
  const withoutRagContext = await buildHomePathRagContext({ message: QUESTION, useRag: false });
  const withRagInstructions = buildHomePathInstructionContext({ message: QUESTION, intent: withRagContext.intent });
  const withoutRagInstructions = buildHomePathInstructionContext({ message: QUESTION, intent: withoutRagContext.intent });
  const withRagAnswer = await generateHomePathChatAnswer({
    userMessage: QUESTION,
    calculationSummary: withRagContext.calculations.summary,
    contextText: withRagContext.contextText,
    instructionContext: withRagInstructions.text,
    intent: withRagContext.intent,
    timeoutMs: 90_000
  });
  const withoutRagAnswer = await generateHomePathChatAnswer({
    userMessage: QUESTION,
    calculationSummary: withoutRagContext.calculations.summary,
    contextText: withoutRagContext.contextText,
    instructionContext: withoutRagInstructions.text,
    intent: withoutRagContext.intent,
    timeoutMs: 90_000
  });

  const record = {
    checkedAt: new Date().toISOString(),
    question: QUESTION,
    localQwen: qwenProbe,
    rag: {
      chunkCount: ragChunkCount,
      provider: "turbo_vector_sqlite",
      quantization: "turboquant_rht_normal_uint8"
    },
    withRag: {
      intent: withRagContext.intent,
      sourceCount: withRagContext.retrieved.length,
      sources: withRagContext.retrieved.map((source) => ({
        id: source.id,
        sourceType: source.sourceType,
        title: source.title,
        score: source.score,
        finalScore: source.finalScore ?? source.score,
        boostReason: source.boostReason ?? []
      })),
      usedLocalModel: withRagAnswer.usedLocalModel,
      usedConfiguredModel: withRagAnswer.usedConfiguredModel,
      endpointType: withRagAnswer.endpointType,
      fallbackUsed: withRagAnswer.fallbackUsed,
      finishReason: withRagAnswer.finishReason,
      modelRouting: withRagAnswer.modelRouting,
      instructionScenarios: withRagInstructions.scenarios,
      answer: withRagAnswer.answer,
      error: withRagAnswer.error
    },
    withoutRag: {
      intent: withoutRagContext.intent,
      sourceCount: withoutRagContext.retrieved.length,
      usedLocalModel: withoutRagAnswer.usedLocalModel,
      usedConfiguredModel: withoutRagAnswer.usedConfiguredModel,
      endpointType: withoutRagAnswer.endpointType,
      fallbackUsed: withoutRagAnswer.fallbackUsed,
      finishReason: withoutRagAnswer.finishReason,
      modelRouting: withoutRagAnswer.modelRouting,
      instructionScenarios: withoutRagInstructions.scenarios,
      answer: withoutRagAnswer.answer,
      error: withoutRagAnswer.error
    }
  };

  mkdirSync(path.join(process.cwd(), "artifacts", "rag"), { recursive: true });
  writeFileSync(
    path.join(process.cwd(), "artifacts", "rag", "qwen-rag-verification.json"),
    JSON.stringify(record, null, 2)
  );
  writeFileSync(path.join(process.cwd(), "docs", "qwen-rag-verification-log.md"), toMarkdown(record));
  console.log(JSON.stringify(record, null, 2));
}

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

async function probeConfiguredQwen() {
  const baseUrl = process.env.LLM_BASE_URL ?? process.env.LOCAL_LLM_BASE_URL ?? "http://localhost:11434/v1";
  const model = process.env.LLM_MODEL ?? process.env.LOCAL_LLM_MODEL ?? process.env.LOCAL_QWEN_MODEL_ID ?? "Qwen/Qwen3.5-0.8B";
  const apiKey = process.env.LLM_API_KEY ?? process.env.LOCAL_LLM_API_KEY ?? process.env.DASHSCOPE_API_KEY ?? process.env.ALIBABA_CLOUD_API_KEY;
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
      headers: {
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
      },
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) {
      return { ok: false, baseUrl: redactBaseUrl(baseUrl), model, error: `GET /models ${response.status}` };
    }
    const payload = await response.json() as { data?: Array<{ id?: string }> };
    const modelIds = payload.data?.map((item) => item.id).filter((id): id is string => Boolean(id)) ?? [];
    return {
      ok: true,
      baseUrl: redactBaseUrl(baseUrl),
      model,
      modelCount: modelIds.length,
      targetModelListed: modelIds.includes(model),
      sampleModelIds: modelIds.slice(0, 12)
    };
  } catch (error) {
    return { ok: false, baseUrl: redactBaseUrl(baseUrl), model, error: error instanceof Error ? error.message : String(error) };
  }
}

function redactBaseUrl(baseUrl: string) {
  if (/localhost|127\.0\.0\.1|\[::1\]/i.test(baseUrl)) return baseUrl;
  try {
    const url = new URL(baseUrl);
    if (url.hostname.includes("maas.aliyuncs.com")) {
      return `${url.protocol}//<redacted-alibaba-maas>${url.pathname}`;
    }
  } catch {
    return "remote-openai-compatible-endpoint";
  }
  return "remote-openai-compatible-endpoint";
}

function toMarkdown(record: Awaited<ReturnType<typeof buildRecordShape>>) {
  return [
    "# Qwen RAG Verification Log",
    "",
    `- checkedAt: ${record.checkedAt}`,
    `- question: ${record.question}`,
    `- localQwen.ok: ${record.localQwen.ok}`,
    `- localQwen.baseUrl: ${record.localQwen.baseUrl}`,
    `- localQwen.model: ${record.localQwen.model}`,
    `- localQwen.modelCount: ${record.localQwen.modelCount ?? "unknown"}`,
    `- localQwen.targetModelListed: ${record.localQwen.targetModelListed ?? "unknown"}`,
    `- localQwen.error: ${record.localQwen.error ?? "none"}`,
    `- rag.chunkCount: ${record.rag.chunkCount}`,
    `- rag.provider: ${record.rag.provider}`,
    `- rag.quantization: ${record.rag.quantization}`,
    "",
    "## RAG Enabled",
    "",
    `- sourceCount: ${record.withRag.sourceCount}`,
    `- usedLocalModel: ${record.withRag.usedLocalModel}`,
    `- usedConfiguredModel: ${record.withRag.usedConfiguredModel}`,
    `- endpointType: ${record.withRag.endpointType}`,
    `- fallbackUsed: ${record.withRag.fallbackUsed}`,
    `- finishReason: ${record.withRag.finishReason ?? "unknown"}`,
    `- modelRouting: ${formatRouting(record.withRag.modelRouting)}`,
    `- error: ${record.withRag.error ?? "none"}`,
    "",
    "Sources:",
    ...record.withRag.sources.map((source, index) => `${index + 1}. ${source.title ?? source.id} (${source.sourceType}, score=${source.score.toFixed(4)}, finalScore=${(source.finalScore ?? source.score).toFixed(4)})`),
    "",
    "Answer:",
    "",
    "```text",
    record.withRag.answer,
    "```",
    "",
    "## RAG Disabled",
    "",
    `- sourceCount: ${record.withoutRag.sourceCount}`,
    `- usedLocalModel: ${record.withoutRag.usedLocalModel}`,
    `- usedConfiguredModel: ${record.withoutRag.usedConfiguredModel}`,
    `- endpointType: ${record.withoutRag.endpointType}`,
    `- fallbackUsed: ${record.withoutRag.fallbackUsed}`,
    `- finishReason: ${record.withoutRag.finishReason ?? "unknown"}`,
    `- modelRouting: ${formatRouting(record.withoutRag.modelRouting)}`,
    `- error: ${record.withoutRag.error ?? "none"}`,
    "",
    "Answer:",
    "",
    "```text",
    record.withoutRag.answer,
    "```",
    ""
  ].join("\n");
}

function formatRouting(routing: { selected?: string; reason?: string; maxTokens?: number; attemptedModels?: string[] } | undefined) {
  if (!routing) return "none";
  return `${routing.selected ?? "unknown"} (${routing.reason ?? "unknown"}, maxTokens=${routing.maxTokens ?? "unknown"}, attempted=${routing.attemptedModels?.join(" > ") ?? "unknown"})`;
}

function buildRecordShape() {
  return Promise.resolve({} as {
    checkedAt: string;
    question: string;
    localQwen: { ok: boolean; baseUrl: string; model: string; error?: string; modelCount?: number; targetModelListed?: boolean; sampleModelIds?: string[] };
    rag: { chunkCount: number | null; provider: string; quantization: string };
    withRag: {
      sourceCount: number;
      sources: Array<{ id: string; sourceType: string; title?: string; score: number; finalScore?: number; boostReason?: string[] }>;
      usedLocalModel: boolean;
      usedConfiguredModel?: boolean;
      endpointType?: string;
      fallbackUsed: boolean;
      finishReason?: string;
      modelRouting?: { selected?: string; reason?: string; maxTokens?: number; attemptedModels?: string[] };
      answer: string;
      error?: string;
    };
    withoutRag: {
      sourceCount: number;
      usedLocalModel: boolean;
      usedConfiguredModel?: boolean;
      endpointType?: string;
      fallbackUsed: boolean;
      finishReason?: string;
      modelRouting?: { selected?: string; reason?: string; maxTokens?: number; attemptedModels?: string[] };
      answer: string;
      error?: string;
    };
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
