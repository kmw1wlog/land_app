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
    activeCandidate: body.activeCandidate
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
      instructionScenarios: instructionContext.scenarios,
      error: generation.error
    },
    { headers: chatCorsHeaders(request) }
  );
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
