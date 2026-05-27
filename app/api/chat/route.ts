import { NextRequest, NextResponse } from "next/server";
import { buildHomePathRagContext, type HomePathChatInput } from "@/server/rag/contextBuilder";
import { reindexHomePathRag } from "@/server/rag/reindex";
import { generateHomePathChatAnswer } from "@/server/llm/qwenClient";
import { HOMEPASS_SAFETY_NOTICE } from "@/server/llm/homepassSystemPrompt";
import { buildHomePathInstructionContext } from "@/server/llm/homepathScenarioInstructions";

export const runtime = "nodejs";

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: chatCorsHeaders(request)
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as HomePathChatInput;
    const message = String(body.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "message is required" }, { status: 400, headers: chatCorsHeaders(request) });
    }

    let context = await buildHomePathRagContext({ ...body, message });
    if (body.useRag !== false && context.retrieved.length === 0) {
      await reindexHomePathRag();
      context = await buildHomePathRagContext({ ...body, message });
    }
    const instructionContext = buildHomePathInstructionContext({
      message,
      intent: context.intent,
      profile: body.profile,
      currentHome: body.currentHome,
      financialPlan: body.financialPlan,
      activeCandidate: body.activeCandidate,
      portfolioItems: body.portfolioItems,
      interestedHomes: body.interestedHomes
    });

    const generation = await generateHomePathChatAnswer({
      userMessage: message,
      calculationSummary: context.calculations.summary,
      contextText: context.contextText,
      instructionContext: instructionContext.text
    });

    return NextResponse.json(
      {
        answer: generation.answer,
        model: generation.model,
        endpointType: generation.endpointType,
        usedConfiguredModel: generation.usedConfiguredModel,
        usedLocalModel: generation.usedLocalModel,
        fallbackUsed: generation.fallbackUsed,
        intent: context.intent,
        retrievalPlan: context.retrievalPlan,
        calculations: context.calculations,
        sources: context.retrieved.map((item) => ({
          id: item.id,
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          title: item.title,
          score: item.score,
          finalScore: item.finalScore ?? item.score,
          boostReason: item.boostReason ?? [],
          metadata: item.metadata
        })),
        safetyNotice: HOMEPASS_SAFETY_NOTICE,
        instructionScenarios: instructionContext.scenarios,
        error: generation.error
      },
      { headers: chatCorsHeaders(request) }
    );
  } catch (error) {
    console.error("[api/chat] request failed", error);
    return NextResponse.json(
      {
        answer:
          "결론: 현재 AI 설명 서버 초기화 중 문제가 발생했습니다.\n\n주의점: 참고용 추정이며 의사결정 보조입니다. 매수 추천, 수익 보장, 대출 승인 보장이 아닙니다.\n\n다음 행동: 잠시 후 다시 시도하거나 /chat?chatApi=http://127.0.0.1:3000/api/chat 형태로 로컬 RAG API를 지정해 주세요.",
        model: "fallback",
        endpointType: "fallback",
        usedConfiguredModel: false,
        usedLocalModel: false,
        fallbackUsed: true,
        intent: "general",
        retrievalPlan: null,
        calculations: null,
        sources: [],
        safetyNotice: HOMEPASS_SAFETY_NOTICE,
        instructionScenarios: [],
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 200, headers: chatCorsHeaders(request) }
    );
  }
}

function chatCorsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowedOrigins = getAllowedOrigins();
  const allowOrigin = origin && (allowedOrigins.has("*") || allowedOrigins.has(origin)) ? origin : "";
  return {
    ...(allowOrigin ? { "access-control-allow-origin": allowOrigin } : {}),
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin"
  };
}

function getAllowedOrigins() {
  const configured = process.env.CHAT_CORS_ALLOWED_ORIGINS;
  const defaults = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://land-app-mu.vercel.app",
    "https://kmw1wlog.github.io",
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.CAPACITOR_APP_URL
  ];
  return new Set(
    (configured ? configured.split(",") : defaults)
      .map((item) => item?.trim().replace(/\/$/, ""))
      .filter(Boolean)
  );
}
