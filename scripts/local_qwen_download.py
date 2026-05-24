#!/usr/bin/env python3
from __future__ import annotations

import os

from transformers import AutoModelForImageTextToText, AutoProcessor


MODEL_ID = os.environ.get("LOCAL_QWEN_MODEL_ID") or os.environ.get("LOCAL_LLM_MODEL") or "Qwen/Qwen3.5-0.8B"


def main() -> None:
    print(f"downloading {MODEL_ID}")
    AutoProcessor.from_pretrained(MODEL_ID, trust_remote_code=False)
    AutoModelForImageTextToText.from_pretrained(MODEL_ID, trust_remote_code=False, low_cpu_mem_usage=True)
    print("download complete")


if __name__ == "__main__":
    main()
