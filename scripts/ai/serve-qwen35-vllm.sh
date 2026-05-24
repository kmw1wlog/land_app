#!/usr/bin/env bash
set -euo pipefail

MODEL_ID="${LOCAL_QWEN_MODEL_ID:-${LOCAL_LLM_MODEL:-Qwen/Qwen3.5-0.8B}}"
PORT="${LOCAL_QWEN_PORT:-8000}"
MAX_MODEL_LEN="${LOCAL_QWEN_MAX_MODEL_LEN:-32768}"

exec vllm serve "${MODEL_ID}" \
  --port "${PORT}" \
  --tensor-parallel-size "${LOCAL_QWEN_TENSOR_PARALLEL_SIZE:-1}" \
  --max-model-len "${MAX_MODEL_LEN}" \
  --language-model-only
