import { HOMEPASS_SYSTEM_PROMPT, buildSafeFallbackAnswer, ensureHomePathSafety } from "./homepassSystemPrompt";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function generateHomePathChatAnswer(input: {
  userMessage: string;
  calculationSummary: string;
  contextText: string;
  timeoutMs?: number;
}) {
  const fallback = buildSafeFallbackAnswer({
    message: input.userMessage,
    calculationSummary: input.calculationSummary,
    contextText: input.contextText
  });

  const baseUrl = process.env.LOCAL_LLM_BASE_URL ?? "http://localhost:11434/v1";
  const model = process.env.LOCAL_LLM_MODEL ?? process.env.LOCAL_QWEN_MODEL_ID ?? "Qwen/Qwen3.5-0.8B";
  const configuredMaxTokens = Number(process.env.LOCAL_LLM_MAX_TOKENS ?? 360);
  const configuredTimeoutMs = Number(process.env.LOCAL_LLM_TIMEOUT_MS ?? 60_000);
  const maxTokens = Number.isFinite(configuredMaxTokens) ? configuredMaxTokens : 360;
  const timeoutMs = Number.isFinite(configuredTimeoutMs) ? configuredTimeoutMs : 60_000;

  try {
    const answer = await callOpenAiCompatibleChat({
      baseUrl,
      model,
      maxTokens,
      messages: [
        { role: "system", content: HOMEPASS_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            `사용자 질문:\n${input.userMessage}`,
            `계산 결과:\n${input.calculationSummary}`,
            `검색 context:\n${input.contextText.slice(0, 1800)}`
          ].join("\n\n")
        }
      ],
      timeoutMs: input.timeoutMs ?? timeoutMs
    });
    return {
      answer: ensureHomePathSafety(answer),
      model,
      usedLocalModel: true,
      fallbackUsed: false
    };
  } catch (error) {
    return {
      answer: fallback,
      model,
      usedLocalModel: false,
      fallbackUsed: true,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function callOpenAiCompatibleChat(input: {
  baseUrl: string;
  model: string;
  maxTokens: number;
  messages: ChatMessage[];
  timeoutMs: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
  try {
    const response = await fetch(`${input.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: input.model,
        temperature: 0.15,
        max_tokens: Math.max(64, Math.min(input.maxTokens, 600)),
        messages: input.messages
      })
    });
    if (!response.ok) {
      throw new Error(`Local Qwen request failed: ${response.status} ${await response.text()}`);
    }
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error("Local Qwen returned an empty response.");
    return content;
  } finally {
    clearTimeout(timeout);
  }
}
