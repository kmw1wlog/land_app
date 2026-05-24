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
  timeoutMs?: number;
}) {
  const fallback = buildSafeFallbackAnswer({
    message: input.userMessage,
    calculationSummary: input.calculationSummary,
    contextText: input.contextText
  });

  const baseUrl = process.env.LLM_BASE_URL ?? process.env.LOCAL_LLM_BASE_URL ?? "http://localhost:11434/v1";
  const model = process.env.LLM_MODEL ?? process.env.LOCAL_LLM_MODEL ?? process.env.LOCAL_QWEN_MODEL_ID ?? "Qwen/Qwen3.5-0.8B";
  const apiKey = process.env.LLM_API_KEY ?? process.env.LOCAL_LLM_API_KEY ?? process.env.DASHSCOPE_API_KEY ?? process.env.ALIBABA_CLOUD_API_KEY;
  const endpointType = isLocalEndpoint(baseUrl) ? "local" : "remote";
  const configuredMaxTokens = Number(process.env.LOCAL_LLM_MAX_TOKENS ?? 360);
  const configuredTimeoutMs = Number(process.env.LOCAL_LLM_TIMEOUT_MS ?? 60_000);
  const configuredContextChars = Number(process.env.RAG_CONTEXT_MAX_CHARS ?? 5200);
  const maxTokens = Number.isFinite(configuredMaxTokens) ? configuredMaxTokens : 360;
  const timeoutMs = Number.isFinite(configuredTimeoutMs) ? configuredTimeoutMs : 60_000;
  const contextMaxChars = Number.isFinite(configuredContextChars) ? configuredContextChars : 5200;
  const enableThinking = process.env.LLM_ENABLE_THINKING === "true";

  try {
    const answer = await callOpenAiCompatibleChat({
      baseUrl,
      model,
      apiKey,
      maxTokens,
      enableThinking,
      messages: [
        { role: "system", content: HOMEPASS_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            `사용자 질문:\n${input.userMessage}`,
            input.instructionContext ? `상황별 지침:\n${input.instructionContext.slice(0, 2200)}` : undefined,
            `계산 결과:\n${input.calculationSummary}`,
            `검색 context:\n${input.contextText.slice(0, contextMaxChars)}`
          ]
            .filter(Boolean)
            .join("\n\n")
        }
      ],
      timeoutMs: input.timeoutMs ?? timeoutMs
    });
    return {
      answer: ensureHomePathSafety(answer),
      model,
      endpointType,
      usedConfiguredModel: true,
      usedLocalModel: true,
      fallbackUsed: false
    };
  } catch (error) {
    return {
      answer: fallback,
      model,
      endpointType,
      usedConfiguredModel: false,
      usedLocalModel: false,
      fallbackUsed: true,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

function isLocalEndpoint(baseUrl: string) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/i.test(baseUrl);
}

async function callOpenAiCompatibleChat(input: {
  baseUrl: string;
  model: string;
  apiKey?: string;
  maxTokens: number;
  enableThinking: boolean;
  messages: ChatMessage[];
  timeoutMs: number;
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
        max_tokens: Math.max(64, Math.min(input.maxTokens, 600)),
        enable_thinking: input.enableThinking,
        extra_body: { enable_thinking: input.enableThinking },
        messages: input.messages
      })
    });
    if (!response.ok) {
      throw new Error(`LLM request failed: ${response.status} ${await response.text()}`);
    }
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Configured Qwen endpoint returned an empty response.");
    return content;
  } finally {
    clearTimeout(timeout);
  }
}
