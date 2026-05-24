#!/usr/bin/env bash
set -euo pipefail

MODEL_ID="${LOCAL_QWEN_MODEL_ID:-${LOCAL_LLM_MODEL:-Qwen/Qwen3.5-0.8B}}"
HOST="${LOCAL_QWEN_HOST:-0.0.0.0}"
PORT="${LOCAL_QWEN_PORT:-8000}"
CONTEXT_LENGTH="${LOCAL_QWEN_MAX_MODEL_LEN:-32768}"

exec python3 -m sglang.launch_server \
  --model-path "${MODEL_ID}" \
  --host "${HOST}" \
  --port "${PORT}" \
  --tp-size "${LOCAL_QWEN_TENSOR_PARALLEL_SIZE:-1}" \
  --context-length "${CONTEXT_LENGTH}"
