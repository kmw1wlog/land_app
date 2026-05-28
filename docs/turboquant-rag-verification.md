# TurboQuant-inspired RAG Verification

- checkedAt: 2026-05-28T17:02:49.658Z
- description: TurboQuant-inspired RAG verification for HomePath compact SQLite retrieval.
- baseline: float cosine baseline
- float storage bytes/vector: 1536

## Pipeline

1. embedding
2. normalize
3. randomized Hadamard rotation with 512 padding
4. normal-quantile scalar quantization
5. TurboQuant-inspired residual sign correction
6. SQLite compressed vector store
7. RAG topK retrieval

## Results

| variant | recall@4 | recall@10 | cosine error | bytes/vector | latency ms/query |
| --- | ---: | ---: | ---: | ---: | ---: |
| legacy pseudo rotation | 0.95 | 1 | 0.001 | 400 | 1.42 |
| RHT + normal codebook | 0.9 | 1 | 0.001 | 528 | 1.418 |
| RHT + residual correction | 0.95 | 1 | 0.0014 | 528 | 1.3 |

This is a TurboQuant-inspired compact retrieval path, not a claim of full paper reproduction.
