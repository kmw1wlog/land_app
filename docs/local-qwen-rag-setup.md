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
LOCAL_QWEN_DEVICE=auto
EMBEDDING_PROVIDER=mock
VECTOR_PROVIDER=turbo_vector_sqlite
```

`Qwen/Qwen3.5-0.8B` is the default. The model weights are downloaded from Hugging Face into the local cache on each PC/server and are intentionally not committed to git.

## Native local server flow

```bash
npm run llm:qwen:install
npm run llm:qwen:download
npm run llm:qwen:serve
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
