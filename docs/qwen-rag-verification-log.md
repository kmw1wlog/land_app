# Qwen RAG Verification Log

- checkedAt: 2026-05-24T13:28:22.168Z
- question: 왜 이 후보가 떴어? 이 결과는 매수 추천이야?
- localQwen.ok: true
- localQwen.baseUrl: http://127.0.0.1:11434/v1
- localQwen.model: Qwen/Qwen3.5-0.8B
- localQwen.error: none
- rag.chunkCount: 69
- rag.provider: turbo_vector_sqlite
- rag.quantization: turboquant_lite_uint8

## RAG Enabled

- sourceCount: 4
- usedLocalModel: true
- fallbackUsed: false
- error: none

Sources:
1. Transformer AI signal 달성파크푸르지오힐스테이트 (model_artifact, score=0.2590)
2. Transformer AI signal 율하센트럴파크9단지 (model_artifact, score=0.2254)
3. Transformer AI signal 신암뜨란채 (model_artifact, score=0.2230)
4. 홈패스 안전 원칙 (safety_policy, score=0.0673)

Answer:

```text
참고용 추정이며 의사결정 보조입니다. 매수 추천, 수익 보장, 대출 승인 보장이 아닙니다.

현재 구매력 1.6억 원, 5년 뒤 추정 구매력 5.8억 원, 월저축 150 만 원으로 계산된 **월저축 150 만 원**이 5년 뒤 추정 구매력 5.8 억 원 대비 3.8 배 이상 성장하는 것으로 보입니다. 이는 **월저축 150 만 원**이 5년 뒤 추정 구매력 5.8 억 원 대비 3.8 배 이상 성장하는 것으로 보입니다.

**주의점:**
1.  **월저축 150 만 원**이 5년 뒤 추정 구매력 5.8 억 원 대비 3.8 배 이상 성장하는 것으로 보입니다.
2.  **월저축 150 만 원**이 5년 뒤 추정 구매력 5.8 억 원 대비 3.8 배 이상 성장하는 것으로 보입니다.
3.  **월저축 150 만 원**이 5년 뒤 추정 구매력 5.8 억 원 대비 3.8 배 이상 성장하는 것으로 보입니다.

**다음 행동:**
1.  **월저축 150 만 원**이 5년 뒤 추정 구매력 5.8 억 원 대비 3.8 배 이상 성장하는 것으로 보입니다.
2.  **월저축 150 만 원**이 5년 뒤 추정 구매력 5.8 억 원 대비 3.8 배 이상 성장하는 것으로 보입니다.
3.  **월저축 150 만 원**이 5년 뒤 추정 구매력 5.8 억 원 대비 3.8 배 이상 성장하는 것으로 보입니다.
```

## RAG Disabled

- sourceCount: 0
- usedLocalModel: true
- fallbackUsed: false
- error: none

Answer:

```text
현재 구매력이 1.6 억이고, 집 정리 후 예산이 4.8 억로 계산된 것은 참고 신호이나 참고 신호을 목적으로 하는 것이 아니라, 청년·사회초년생이 1주택자로서 주거 구매력과 갈아타기 리스크를 설명하는 공공데이터 기반 의사결정 보조 서비스의 기본 계산 결과입니다. 매수 추천이나 수익 보장, 특정 단지 매입 권유를 하지 않습니다. 참고용 추정이며 의사결정 보조입니다.

참고용 추정이며 의사결정 보조입니다. 매수 추천, 수익 보장, 대출 승인 보장이 아닙니다.
```
