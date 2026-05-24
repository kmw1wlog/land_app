import { existsSync, readFileSync } from "fs";
import path from "path";

async function main() {
  loadEnvLocal();
  const baseUrl = process.env.LLM_BASE_URL ?? process.env.LOCAL_LLM_BASE_URL ?? "http://localhost:11434/v1";
  const model = process.env.LLM_MODEL ?? process.env.LOCAL_LLM_MODEL ?? process.env.LOCAL_QWEN_MODEL_ID ?? "Qwen/Qwen3.5-0.8B";
  const apiKey = process.env.LLM_API_KEY ?? process.env.LOCAL_LLM_API_KEY ?? process.env.DASHSCOPE_API_KEY ?? process.env.ALIBABA_CLOUD_API_KEY;
  const enableThinking = process.env.LLM_ENABLE_THINKING === "true";
  const modelsResponse = await fetch(`${baseUrl.replace(/\/$/, "")}/models`, {
    headers: {
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
    }
  });
  if (!modelsResponse.ok) {
    throw new Error(`qwen models probe failed: ${modelsResponse.status} ${await modelsResponse.text()}`);
  }
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {})
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 120,
      enable_thinking: enableThinking,
      extra_body: { enable_thinking: enableThinking },
      messages: [
        {
          role: "system",
          content: "너는 홈패스 AI 설명봇이다. 답변 끝에 반드시 '참고용 추정이며 의사결정 보조입니다.'를 포함한다."
        },
        {
          role: "user",
          content: "홈패스의 주거 후보가 왜 떴는지 공공 실거래와 구매력 기준으로 한 문장 설명해줘."
        }
      ]
    })
  });
  if (!response.ok) {
    throw new Error(`qwen smoke failed: ${response.status} ${await response.text()}`);
  }
  const modelsPayload = await modelsResponse.json() as { data?: Array<{ id?: string }> };
  const modelIds = modelsPayload.data?.map((item) => item.id).filter((id): id is string => Boolean(id)) ?? [];
  const payload = await response.json();
  console.log(JSON.stringify({
    models: {
      count: modelIds.length,
      targetModelListed: modelIds.includes(model),
      sampleModelIds: modelIds.slice(0, 12)
    },
    chat: payload
  }, null, 2));
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

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
