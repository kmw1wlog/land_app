# HomePath Local Qwen RAG Setup

HomePath uses a local OpenAI-compatible Qwen endpoint for the AI explanation bot.
The app still works without Qwen, but the competition demo should run the local server below so `/api/chat` returns `usedLocalModel=true`.

Verified model id: `Qwen/Qwen3.5-0.8B`.

## Environment

Copy the example file if you want a ready-to-edit local configuration:

```bash
cp .env.local.qwen.example .env.local
```

```bash
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=Qwen/Qwen3.5-0.8B
LOCAL_QWEN_MODEL_ID=Qwen/Qwen3.5-0.8B
LOCAL_QWEN_MODEL_CLASS=auto
LOCAL_QWEN_DEVICE=cuda
EMBEDDING_PROVIDER=mock
VECTOR_PROVIDER=turbo_vector_sqlite
CHAT_CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,https://land-app-mu.vercel.app,https://kmw1wlog.github.io
```

`Qwen/Qwen3.5-0.8B` is the default. The model weights are downloaded from Hugging Face into the local cache on each PC/server and are intentionally not committed to git.
The Hugging Face model is multimodal, so the native server uses `AutoProcessor` + `AutoModelForImageTextToText` by default. If a text-only model is substituted later, set `LOCAL_QWEN_MODEL_CLASS=causal-lm` or leave `auto` to fall back to `AutoModelForCausalLM`.

On the GTX 1060 demo PC, prefer the GPU wrapper. It pins `CUDA_VISIBLE_DEVICES=0`, sets `LOCAL_QWEN_DEVICE=cuda`, and works around an NVIDIA driver user-library mismatch by extracting matching 535.x user-space libraries into `.cache/nvidia-driver-libs`.

## Native local server flow

```bash
npm run llm:qwen:install
npm run llm:qwen:download
npm run llm:qwen:serve:gtx1060
```

The model weights are downloaded into the Hugging Face cache on each PC/server. They are intentionally not committed to git.

If the native FastAPI server is not preferred, Qwen's model card also documents OpenAI-compatible serving through vLLM or SGLang:

```bash
npm run llm:qwen:serve:vllm
```

```bash
npm run llm:qwen:serve:sglang
```

For those servers, set:

```bash
LOCAL_LLM_BASE_URL=http://localhost:8000/v1
LOCAL_LLM_MODEL=Qwen/Qwen3.5-0.8B
```

In another terminal:

```bash
npm run llm:qwen:smoke
npm run rag:verify:qwen
```

## Reindex RAG

```bash
npm run rag:reindex
```

This indexes docs, model artifacts, safety FAQ, Transformer AI signals, and `ComplexSignalSnapshot` summaries into the local SQLite `rag_chunks` table using TurboVector-lite compressed vectors.

## API contract

The local server implements the minimum OpenAI-compatible API used by HomePath:

```text
GET  /health
GET  /v1/models
POST /v1/chat/completions
```

HomePath calls it through `src/server/llm/qwenClient.ts`.

## Public demo to this PC

For judging, the public web demo can send chat prompts to the local RAG/Qwen API running on this PC.

1. Run Qwen and the Next app locally:

```bash
npm run llm:qwen:serve
npm run rag:reindex
npm run dev
```

2. Open the deployed `/chat` page with a local API override:

```text
https://land-app-mu.vercel.app/chat?chatApi=http://127.0.0.1:3000/api/chat
```

The `chatApi` value is saved to `localStorage.homepath.chatApiUrl`, so later prompts keep using the local endpoint. `/api/chat` has CORS preflight support for the configured demo origins. If the demo origin changes, add it to `CHAT_CORS_ALLOWED_ORIGINS`.

The browser is talking to loopback on the judge/demo PC, so this pattern is for live demonstrations. A fully public hosted inference path still needs a hosted Qwen-compatible server or a tunnel to the local machine.

## Ollama fallback

If you prefer Ollama and have a compatible Qwen tag, you can still use:

```bash
ollama create homepath-qwen-0.8b -f models/qwen3.5-0.8b-homepath.Modelfile
ollama serve
```

Then set:

```bash
LOCAL_LLM_MODEL=homepath-qwen-0.8b
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
```
