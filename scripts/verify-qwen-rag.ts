import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { buildHomePathRagContext } from "@/server/rag/contextBuilder";
import { getDefaultVectorStore } from "@/server/rag/turboVector/store";
import { generateHomePathChatAnswer } from "@/server/llm/qwenClient";

const QUESTION = "왜 이 후보가 떴어? 이 결과는 매수 추천이야?";

async function main() {
  const vectorStore = getDefaultVectorStore();
  const ragChunkCount = "count" in vectorStore ? await vectorStore.count() : null;
  const qwenProbe = await probeLocalQwen();
  const withRagContext = await buildHomePathRagContext({ message: QUESTION, useRag: true });
  const withoutRagContext = await buildHomePathRagContext({ message: QUESTION, useRag: false });
  const withRagAnswer = await generateHomePathChatAnswer({
    userMessage: QUESTION,
    calculationSummary: withRagContext.calculations.summary,
    contextText: withRagContext.contextText,
    timeoutMs: 90_000
  });
  const withoutRagAnswer = await generateHomePathChatAnswer({
    userMessage: QUESTION,
    calculationSummary: withoutRagContext.calculations.summary,
    contextText: withoutRagContext.contextText,
    timeoutMs: 90_000
  });

  const record = {
    checkedAt: new Date().toISOString(),
    question: QUESTION,
    localQwen: qwenProbe,
    rag: {
      chunkCount: ragChunkCount,
      provider: "turbo_vector_sqlite",
      quantization: "turboquant_lite_uint8"
    },
    withRag: {
      intent: withRagContext.intent,
      sourceCount: withRagContext.retrieved.length,
      sources: withRagContext.retrieved.map((source) => ({
        id: source.id,
        sourceType: source.sourceType,
        title: source.title,
        score: source.score
      })),
      usedLocalModel: withRagAnswer.usedLocalModel,
      fallbackUsed: withRagAnswer.fallbackUsed,
      answer: withRagAnswer.answer,
      error: withRagAnswer.error
    },
    withoutRag: {
      intent: withoutRagContext.intent,
      sourceCount: withoutRagContext.retrieved.length,
      usedLocalModel: withoutRagAnswer.usedLocalModel,
      fallbackUsed: withoutRagAnswer.fallbackUsed,
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

async function probeLocalQwen() {
  const baseUrl = process.env.LOCAL_LLM_BASE_URL ?? "http://localhost:11434/v1";
  const model = process.env.LOCAL_LLM_MODEL ?? process.env.LOCAL_QWEN_MODEL_ID ?? "Qwen/Qwen3.5-0.8B";
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
      signal: AbortSignal.timeout(3000)
    });
    if (!response.ok) {
      return { ok: false, baseUrl, model, error: `GET /models ${response.status}` };
    }
    return { ok: true, baseUrl, model, models: await response.json() };
  } catch (error) {
    return { ok: false, baseUrl, model, error: error instanceof Error ? error.message : String(error) };
  }
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
    `- localQwen.error: ${record.localQwen.error ?? "none"}`,
    `- rag.chunkCount: ${record.rag.chunkCount}`,
    `- rag.provider: ${record.rag.provider}`,
    `- rag.quantization: ${record.rag.quantization}`,
    "",
    "## RAG Enabled",
    "",
    `- sourceCount: ${record.withRag.sourceCount}`,
    `- usedLocalModel: ${record.withRag.usedLocalModel}`,
    `- fallbackUsed: ${record.withRag.fallbackUsed}`,
    `- error: ${record.withRag.error ?? "none"}`,
    "",
    "Sources:",
    ...record.withRag.sources.map((source, index) => `${index + 1}. ${source.title ?? source.id} (${source.sourceType}, score=${source.score.toFixed(4)})`),
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
    `- fallbackUsed: ${record.withoutRag.fallbackUsed}`,
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

function buildRecordShape() {
  return Promise.resolve({} as {
    checkedAt: string;
    question: string;
    localQwen: { ok: boolean; baseUrl: string; model: string; error?: string };
    rag: { chunkCount: number | null; provider: string; quantization: string };
    withRag: {
      sourceCount: number;
      sources: Array<{ id: string; sourceType: string; title?: string; score: number }>;
      usedLocalModel: boolean;
      fallbackUsed: boolean;
      answer: string;
      error?: string;
    };
    withoutRag: {
      sourceCount: number;
      usedLocalModel: boolean;
      fallbackUsed: boolean;
      answer: string;
      error?: string;
    };
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
