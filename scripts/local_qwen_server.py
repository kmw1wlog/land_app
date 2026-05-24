#!/usr/bin/env python3
"""
Local OpenAI-compatible Qwen server for HomePath.

Default model:
    Qwen/Qwen3.5-0.8B

Override with:
    LOCAL_QWEN_MODEL_ID=Qwen/Qwen3.5-0.8B
"""

from __future__ import annotations

import os
import time
import uuid
from dataclasses import dataclass
from typing import Any, Literal

import torch
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import AutoModelForImageTextToText, AutoProcessor


DEFAULT_MODEL_ID = "Qwen/Qwen3.5-0.8B"
MODEL_ID = os.environ.get("LOCAL_QWEN_MODEL_ID") or os.environ.get("LOCAL_LLM_MODEL") or DEFAULT_MODEL_ID
DEVICE = os.environ.get("LOCAL_QWEN_DEVICE", "auto")
MAX_CONTEXT_CHARS = int(os.environ.get("LOCAL_QWEN_MAX_CONTEXT_CHARS", "12000"))


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str | list[dict[str, Any]]


class ChatCompletionRequest(BaseModel):
    model: str | None = None
    messages: list[ChatMessage]
    temperature: float = 0.15
    max_tokens: int = Field(default=600, alias="max_tokens")
    stream: bool = False


@dataclass
class ModelBundle:
    processor: Any
    model: Any
    device: str


app = FastAPI(title="HomePath Local Qwen", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_bundle: ModelBundle | None = None


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "ok": True,
        "model": MODEL_ID,
        "loaded": _bundle is not None,
        "device": _bundle.device if _bundle else resolve_device(),
        "cudaAvailable": torch.cuda.is_available(),
    }


@app.get("/v1/models")
def models() -> dict[str, Any]:
    return {
        "object": "list",
        "data": [
            {
                "id": MODEL_ID,
                "object": "model",
                "created": 0,
                "owned_by": "homepath-local",
            }
        ],
    }


@app.post("/v1/chat/completions")
def chat_completions(request: ChatCompletionRequest) -> dict[str, Any]:
    if request.stream:
        raise HTTPException(status_code=400, detail="stream=true is not supported by the local HomePath Qwen server")
    if not request.messages:
        raise HTTPException(status_code=400, detail="messages is required")

    bundle = get_bundle()
    prompt_messages = [normalize_message(message) for message in request.messages]
    inputs = bundle.processor.apply_chat_template(
        prompt_messages,
        add_generation_prompt=True,
        tokenize=True,
        return_dict=True,
        return_tensors="pt",
    )
    inputs = {key: value.to(bundle.device) for key, value in inputs.items()}

    max_new_tokens = max(32, min(int(request.max_tokens), 800))
    do_sample = request.temperature > 0
    generate_kwargs = {
        **inputs,
        "max_new_tokens": max_new_tokens,
        "do_sample": do_sample,
        "pad_token_id": bundle.processor.tokenizer.eos_token_id,
        "eos_token_id": bundle.processor.tokenizer.eos_token_id,
    }
    if do_sample:
        generate_kwargs["temperature"] = max(float(request.temperature), 1e-5)

    with torch.inference_mode():
        outputs = bundle.model.generate(**generate_kwargs)

    prompt_len = inputs["input_ids"].shape[-1]
    content = bundle.processor.decode(outputs[0][prompt_len:], skip_special_tokens=True).strip()
    created = int(time.time())
    completion_id = f"chatcmpl-homepath-{uuid.uuid4().hex[:12]}"
    return {
        "id": completion_id,
        "object": "chat.completion",
        "created": created,
        "model": MODEL_ID,
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": content},
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": int(inputs["input_ids"].numel()),
            "completion_tokens": int(outputs[:, prompt_len:].numel()),
            "total_tokens": int(outputs.numel()),
        },
    }


def get_bundle() -> ModelBundle:
    global _bundle
    if _bundle is not None:
        return _bundle

    device = resolve_device()
    dtype = torch.float16 if device == "cuda" else torch.float32
    processor = AutoProcessor.from_pretrained(MODEL_ID, trust_remote_code=False)
    model = AutoModelForImageTextToText.from_pretrained(
        MODEL_ID,
        dtype=dtype,
        low_cpu_mem_usage=True,
        trust_remote_code=False,
    )
    model.to(device)
    model.eval()
    _bundle = ModelBundle(processor=processor, model=model, device=device)
    return _bundle


def normalize_message(message: ChatMessage) -> dict[str, Any]:
    if isinstance(message.content, str):
        return {
            "role": message.role,
            "content": [{"type": "text", "text": message.content[:MAX_CONTEXT_CHARS]}],
        }
    return message.model_dump()


def resolve_device() -> str:
    if DEVICE == "auto":
        return "cuda" if torch.cuda.is_available() else "cpu"
    if DEVICE == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("LOCAL_QWEN_DEVICE=cuda requested, but CUDA is not available.")
    if DEVICE not in {"cpu", "cuda"}:
        raise RuntimeError("LOCAL_QWEN_DEVICE must be one of auto, cpu, cuda.")
    return DEVICE


if __name__ == "__main__":
    import uvicorn

    host = os.environ.get("LOCAL_QWEN_HOST", "127.0.0.1")
    port = int(os.environ.get("LOCAL_QWEN_PORT", "11434"))
    uvicorn.run(app, host=host, port=port, log_level="info")
