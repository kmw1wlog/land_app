import { HOMEPASS_SYSTEM_PROMPT, buildSafeFallbackAnswer, ensureHomePathSafety } from "./homepassSystemPrompt";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function generateHomePathChatAnswer(input: {
  userMessage: string;
  calculationSummary: string;
  contextText: string;
  instructionContext?: string;
  intent?: string;
  timeoutMs?: number;
}) {
  const fallback = buildSafeFallbackAnswer({
    message: input.userMessage,
    calculationSummary: input.calculationSummary,
    contextText: input.contextText
  });

  const baseUrl = process.env.LLM_BASE_URL ?? process.env.LOCAL_LLM_BASE_URL ?? "http://localhost:11434/v1";
  const apiKey = process.env.LLM_API_KEY ?? process.env.LOCAL_LLM_API_KEY ?? process.env.DASHSCOPE_API_KEY ?? process.env.ALIBABA_CLOUD_API_KEY;
  const endpointType = isLocalEndpoint(baseUrl) ? "local" : "remote";
  const configuredModel = process.env.LLM_MODEL ?? process.env.LOCAL_LLM_MODEL ?? process.env.LOCAL_QWEN_MODEL_ID ?? "Qwen/Qwen3.5-0.8B";
  const modelPlan = resolveModelPlan({
    configuredModel,
    endpointType,
    intent: input.intent,
    userMessage: input.userMessage,
    contextText: input.contextText
  });
  const configuredMaxTokens = Number(
    process.env.LLM_MAX_TOKENS ??
      process.env.LOCAL_LLM_MAX_TOKENS ??
      (endpointType === "remote" ? modelPlan.maxTokens : 600)
  );
  const configuredTimeoutMs = Number(process.env.LOCAL_LLM_TIMEOUT_MS ?? 60_000);
  const configuredContextChars = Number(process.env.RAG_CONTEXT_MAX_CHARS ?? (endpointType === "remote" ? 7200 : 5200));
  const maxTokens = Number.isFinite(configuredMaxTokens) ? Math.max(configuredMaxTokens, modelPlan.maxTokens) : modelPlan.maxTokens;
  const timeoutMs = Number.isFinite(configuredTimeoutMs) ? configuredTimeoutMs : 60_000;
  const contextMaxChars = Number.isFinite(configuredContextChars) ? configuredContextChars : 5200;
  const enableThinking = process.env.LLM_ENABLE_THINKING === "true";
  const messages: ChatMessage[] = [
    { role: "system", content: HOMEPASS_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        `사용자 질문:\n${input.userMessage}`,
        input.instructionContext ? `상황별 지침:\n${input.instructionContext.slice(0, 2600)}` : undefined,
        `계산 결과:\n${input.calculationSummary}`,
        `검색 context:\n${input.contextText.slice(0, contextMaxChars)}`,
        "답변은 중간에 끊기지 않게 결론, 근거, 주의점, 다음 행동까지 완결한다."
      ]
        .filter(Boolean)
        .join("\n\n")
    }
  ];

  try {
    const attempts = buildModelAttempts(modelPlan, maxTokens, endpointType);
    let lastError: Error | undefined;
    for (const attempt of attempts) {
      try {
        const completion = await callOpenAiCompatibleChat({
          baseUrl,
          model: attempt.model,
          apiKey,
          maxTokens: attempt.maxTokens,
          enableThinking,
          messages,
          timeoutMs: input.timeoutMs ?? timeoutMs,
          endpointType
        });
        if (completion.finishReason === "length" && attempt !== attempts[attempts.length - 1]) {
          lastError = new Error(`LLM response was truncated by max_tokens on ${attempt.model}`);
          continue;
        }
        return {
          answer: ensureHomePathSafety(completion.content),
          model: attempt.model,
          endpointType,
          usedConfiguredModel: true,
          usedLocalModel: true,
          fallbackUsed: false,
          finishReason: completion.finishReason,
          modelRouting: {
            selected: attempt.model,
            reason: modelPlan.reason,
            attemptedModels: attempts.slice(0, attempts.indexOf(attempt) + 1).map((item) => item.model),
            maxTokens: attempt.maxTokens
          }
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    throw lastError ?? new Error("Configured Qwen endpoint failed.");
  } catch (error) {
    return {
      answer: fallback,
      model: modelPlan.primaryModel,
      endpointType,
      usedConfiguredModel: false,
      usedLocalModel: false,
      fallbackUsed: true,
      error: error instanceof Error ? error.message : String(error),
      modelRouting: {
        selected: modelPlan.primaryModel,
        reason: modelPlan.reason,
        attemptedModels: modelPlan.fallbackModels,
        maxTokens
      }
    };
  }
}

export function resolveModelPlan(input: {
  configuredModel: string;
  endpointType: "local" | "remote";
  intent?: string;
  userMessage: string;
  contextText: string;
}) {
  if (process.env.LLM_ROUTER_MODE === "off" || input.endpointType === "local") {
    return {
      primaryModel: input.configuredModel,
      fallbackModels: [input.configuredModel],
      maxTokens: Number(process.env.LLM_MAX_TOKENS ?? process.env.LOCAL_LLM_MAX_TOKENS ?? 600),
      reason: input.endpointType === "local" ? "local_endpoint" : "router_disabled"
    };
  }

  const fastModel = process.env.LLM_FAST_MODEL || input.configuredModel || "qwen3.6-flash";
  const longModel = process.env.LLM_LONG_MODEL || "qwen3.6-plus";
  const reasoningModel = process.env.LLM_REASONING_MODEL || "qwen3.7-max";
  const fallbackModels = parseModelList(process.env.LLM_FALLBACK_MODELS);
  const message = input.userMessage.toLowerCase();
  const explicitShort = /(짧게|간단히|한 문장|300자|450자|요약만)/i.test(input.userMessage);
  const asksForDepth = /(자세|상세|근거|왜|리스크|비교|분석|데이터|출처|설명|추천 질문|같은 예산)/i.test(input.userMessage);
  const longContext = input.contextText.length > 4600;
  const reasoningIntent = ["candidate_reason", "risk_check", "data_source", "safety"].includes(input.intent ?? "");
  const purchaseIntent = input.intent === "purchase_power";

  if (explicitShort && !longContext && !reasoningIntent) {
    return {
      primaryModel: fastModel,
      fallbackModels: uniqueModels([fastModel, reasoningModel, longModel, ...fallbackModels]),
      maxTokens: numberEnv("LLM_FAST_MAX_TOKENS", 900),
      reason: "short_fast_answer"
    };
  }

  if (longContext || purchaseIntent || (asksForDepth && message.includes("비교"))) {
    return {
      primaryModel: longModel,
      fallbackModels: uniqueModels([longModel, reasoningModel, fastModel, ...fallbackModels]),
      maxTokens: numberEnv("LLM_LONG_MAX_TOKENS", 1800),
      reason: longContext ? "long_rag_context" : "long_or_comparison_answer"
    };
  }

  if (reasoningIntent || asksForDepth) {
    return {
      primaryModel: reasoningModel,
      fallbackModels: uniqueModels([reasoningModel, longModel, fastModel, ...fallbackModels]),
      maxTokens: numberEnv("LLM_REASONING_MAX_TOKENS", 1600),
      reason: "reasoning_or_risk_answer"
    };
  }

  return {
    primaryModel: fastModel,
    fallbackModels: uniqueModels([fastModel, longModel, reasoningModel, ...fallbackModels]),
    maxTokens: numberEnv("LLM_MAX_TOKENS", 1200),
    reason: "default_fast_answer"
  };
}

function buildModelAttempts(
  plan: ReturnType<typeof resolveModelPlan>,
  maxTokens: number,
  endpointType: "local" | "remote"
) {
  const ceiling = endpointType === "remote" ? numberEnv("LLM_MAX_TOKEN_CEILING", 2800) : 900;
  return plan.fallbackModels.map((model, index) => ({
    model,
    maxTokens: Math.max(128, Math.min(Math.round(maxTokens * (index === 0 ? 1 : 1.35)), ceiling))
  }));
}

function parseModelList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueModels(models: string[]) {
  return [...new Set(models.filter(Boolean))];
}

function numberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function callOpenAiCompatibleChat(input: {
  baseUrl: string;
  model: string;
  apiKey?: string;
  maxTokens: number;
  enableThinking: boolean;
  messages: ChatMessage[];
  timeoutMs: number;
  endpointType: "local" | "remote";
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
  try {
    const response = await fetch(`${input.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(input.apiKey ? { authorization: `Bearer ${input.apiKey}` } : {})
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: input.model,
        temperature: 0.15,
        max_tokens: Math.max(64, Math.min(input.maxTokens, input.endpointType === "remote" ? 2800 : 900)),
        enable_thinking: input.enableThinking,
        extra_body: { enable_thinking: input.enableThinking },
        messages: input.messages
      })
    });
    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.status} ${await response.text()}`);
    }
    const payload = (await response.json()) as {
      choices?: Array<{ finish_reason?: string; message?: { content?: string } }>;
    };
    const choice = payload.choices?.[0];
    const content = choice?.message?.content?.trim();
    if (!content) throw new Error("Configured Qwen endpoint returned an empty response.");
    return {
      content,
      finishReason: choice?.finish_reason ?? "unknown"
    };
  } finally {
    clearTimeout(timeout);
  }
}

function isLocalEndpoint(baseUrl: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(baseUrl);
}
