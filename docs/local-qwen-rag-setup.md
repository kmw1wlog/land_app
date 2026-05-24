# HomePath Local Qwen RAG Setup

HomePath uses a local OpenAI-compatible endpoint for the AI explanation bot.
The app still works without Qwen: `/api/chat` falls back to a safe RAG-based answer.

## Environment

```bash
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=qwen3.5-0.8b-instruct
EMBEDDING_PROVIDER=mock
VECTOR_PROVIDER=turbo_vector_sqlite
```

## Ollama-style flow

If your local runtime has a Qwen 0.8B Instruct tag, create the HomePath model:

```bash
ollama create homepath-qwen-0.8b -f models/qwen3.5-0.8b-homepath.Modelfile
ollama serve
```

Then set:

```bash
LOCAL_LLM_MODEL=homepath-qwen-0.8b
```

## Reindex RAG

```bash
npm run rag:reindex
```

This indexes docs, model artifacts, safety FAQ, Transformer AI signals, and `ComplexSignalSnapshot` summaries into the local SQLite `rag_chunks` table using TurboVector-lite compressed vectors.
