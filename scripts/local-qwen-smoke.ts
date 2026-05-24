async function main() {
  const baseUrl = process.env.LLM_BASE_URL ?? process.env.LOCAL_LLM_BASE_URL ?? "http://localhost:11434/v1";
  const model = process.env.LLM_MODEL ?? process.env.LOCAL_LLM_MODEL ?? process.env.LOCAL_QWEN_MODEL_ID ?? "Qwen/Qwen3.5-0.8B";
  const apiKey = process.env.LLM_API_KEY ?? process.env.LOCAL_LLM_API_KEY ?? process.env.DASHSCOPE_API_KEY ?? process.env.ALIBABA_CLOUD_API_KEY;
  const enableThinking = process.env.LLM_ENABLE_THINKING === "true";
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
          content: "왜 이 후보가 떴는지 한 문장으로 설명해줘."
        }
      ]
    })
  });
  if (!response.ok) {
    throw new Error(`qwen smoke failed: ${response.status} ${await response.text()}`);
  }
  const payload = await response.json();
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
