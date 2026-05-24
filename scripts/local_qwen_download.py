#!/usr/bin/env python3
from __future__ import annotations

import os

from transformers import AutoModelForCausalLM, AutoModelForImageTextToText, AutoProcessor, AutoTokenizer


MODEL_ID = os.environ.get("LOCAL_QWEN_MODEL_ID") or os.environ.get("LOCAL_LLM_MODEL") or "Qwen/Qwen3.5-0.8B"
MODEL_CLASS = os.environ.get("LOCAL_QWEN_MODEL_CLASS", "auto").lower()


def main() -> None:
    print(f"downloading {MODEL_ID}")
    if MODEL_CLASS not in {"auto", "image-text-to-text", "causal-lm"}:
        raise RuntimeError("LOCAL_QWEN_MODEL_CLASS must be one of auto, image-text-to-text, causal-lm.")
    if MODEL_CLASS in {"auto", "image-text-to-text"}:
        try:
            AutoProcessor.from_pretrained(MODEL_ID, trust_remote_code=False)
            AutoModelForImageTextToText.from_pretrained(MODEL_ID, trust_remote_code=False, low_cpu_mem_usage=True)
            print("download complete")
            return
        except Exception:
            if MODEL_CLASS == "image-text-to-text":
                raise
    AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=False)
    AutoModelForCausalLM.from_pretrained(MODEL_ID, trust_remote_code=False, low_cpu_mem_usage=True)
    print("download complete")


if __name__ == "__main__":
    main()
