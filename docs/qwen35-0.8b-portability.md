# Qwen3.5 0.8B Portability Notes

This repository is set up so another PC or server can rebuild the local Qwen RAG endpoint without copying model weights through git.

## Model

- Hugging Face model id: `Qwen/Qwen3.5-0.8B`
- HomePath env var: `LOCAL_QWEN_MODEL_ID=Qwen/Qwen3.5-0.8B`
- App model env var: `LOCAL_LLM_MODEL=Qwen/Qwen3.5-0.8B`
- App base URL: `LOCAL_LLM_BASE_URL=http://localhost:11434/v1`

## Files committed for transfer

- `.env.local.qwen.example`: local Qwen/RAG environment template
- `scripts/ai/requirements-local-qwen.txt`: Python server dependencies
- `scripts/local_qwen_download.py`: downloads Qwen3.5 0.8B into the Hugging Face cache
- `scripts/local_qwen_server.py`: local OpenAI-compatible FastAPI server
- `scripts/local-qwen-smoke.ts`: endpoint smoke test
- `scripts/ai/serve-qwen35-vllm.sh`: vLLM OpenAI-compatible server launcher
- `scripts/ai/serve-qwen35-sglang.sh`: SGLang OpenAI-compatible server launcher
- `docs/local-qwen-rag-setup.md`: setup and RAG verification guide
- `docs/local-qwen-server-api.md`: endpoint contract

## New machine setup

```bash
git clone git@github.com:kmw1wlog/land_app.git
cd land_app
cp .env.local.qwen.example .env.local
npm install
npm run llm:qwen:install
npm run llm:qwen:download
npm run rag:reindex
npm run llm:qwen:serve
```

In another terminal:

```bash
npm run llm:qwen:smoke
npm run rag:verify:qwen
```

The first run downloads model weights from Hugging Face. Those weights live in the Hugging Face cache, not in this repository.

## Alternative OpenAI-compatible serving

If a target server already uses vLLM or SGLang, keep the HomePath app unchanged and point `LOCAL_LLM_BASE_URL` at that server.

```bash
npm run llm:qwen:serve:vllm
```

```bash
npm run llm:qwen:serve:sglang
```

Then:

```bash
LOCAL_LLM_BASE_URL=http://localhost:8000/v1
LOCAL_LLM_MODEL=Qwen/Qwen3.5-0.8B
```
