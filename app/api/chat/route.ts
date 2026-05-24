import { NextRequest, NextResponse } from "next/server";
import { buildHomePathRagContext, type HomePathChatInput } from "@/server/rag/contextBuilder";
import { reindexHomePathRag } from "@/server/rag/reindex";
import { generateHomePathChatAnswer } from "@/server/llm/qwenClient";
import { HOMEPASS_SAFETY_NOTICE } from "@/server/llm/homepassSystemPrompt";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as HomePathChatInput;
  const message = String(body.message ?? "").trim();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  let context = await buildHomePathRagContext({ ...body, message });
  if (context.retrieved.length === 0) {
    await reindexHomePathRag();
    context = await buildHomePathRagContext({ ...body, message });
  }

  const generation = await generateHomePathChatAnswer({
    userMessage: message,
    calculationSummary: context.calculations.summary,
    contextText: context.contextText
  });

  return NextResponse.json({
    answer: generation.answer,
    model: generation.model,
    usedLocalModel: generation.usedLocalModel,
    fallbackUsed: generation.fallbackUsed,
    intent: context.intent,
    calculations: context.calculations,
    sources: context.retrieved.map((item) => ({
      id: item.id,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      title: item.title,
      score: item.score,
      metadata: item.metadata
    })),
    safetyNotice: HOMEPASS_SAFETY_NOTICE,
    error: generation.error
  });
}
