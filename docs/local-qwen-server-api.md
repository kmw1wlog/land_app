# Local Qwen Server API

HomePath includes a small FastAPI server that loads a local Qwen model with Hugging Face Transformers and exposes an OpenAI-compatible API.

## Start

```bash
cp .env.local.qwen.example .env.local
npm run llm:qwen:install
npm run llm:qwen:download
npm run llm:qwen:serve
```

Defaults:

```bash
LOCAL_QWEN_MODEL_ID=Qwen/Qwen3.5-0.8B
LOCAL_QWEN_HOST=127.0.0.1
LOCAL_QWEN_PORT=11434
LOCAL_QWEN_DEVICE=auto
```

The server loads Qwen3.5 through Hugging Face `AutoProcessor` and `AutoModelForImageTextToText`, then exposes the text-only OpenAI-compatible subset used by HomePath.

## Endpoints

```text
GET /health
GET /v1/models
POST /v1/chat/completions
```

Example:

```bash
curl http://localhost:11434/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{
    "model": "Qwen/Qwen3.5-0.8B",
    "temperature": 0.15,
    "max_tokens": 160,
    "messages": [
      {"role": "system", "content": "너는 홈패스 AI 설명봇이다."},
      {"role": "user", "content": "왜 이 후보가 떴어?"}
    ]
  }'
```

## HomePath integration

`/api/chat` calls this local server through `src/server/llm/qwenClient.ts`.
Run this after starting the server:

```bash
npm run rag:verify:qwen
```

Successful integration should show:

```json
{
  "localQwen": { "ok": true },
  "withRag": { "usedLocalModel": true, "fallbackUsed": false }
}
```
