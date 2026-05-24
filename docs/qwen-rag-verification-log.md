# Qwen RAG Verification Log

- checkedAt: 2026-05-24T11:29:59.756Z
- question: 왜 이 후보가 떴어? 이 결과는 매수 추천이야?
- localQwen.ok: false
- localQwen.baseUrl: http://localhost:11434/v1
- localQwen.model: qwen3.5-0.8b-instruct
- localQwen.error: fetch failed
- rag.chunkCount: 188
- rag.provider: turbo_vector_sqlite
- rag.quantization: turboquant_lite_uint8

## RAG Enabled

- sourceCount: 4
- usedLocalModel: false
- fallbackUsed: true
- error: fetch failed

Sources:
1. 왜 후보가 떴나요? (faq, score=0.1204)
2. Transformer AI signal 달성파크푸르지오힐스테이트 (model_artifact, score=0.0990)
3. docs/demo-recording-guide.md #1 (doc, score=0.0763)
4. 홈패스 안전 원칙 (safety_policy, score=0.0673)

Answer:

```text
결론: 현재 답변은 홈패스 계산 결과와 검색된 공공데이터 근거를 바탕으로 한 설명입니다.

근거 3개:
1. 현재 구매력 1.6억, 현재 집 정리 후 예산 4.8억, 5년 뒤 추정 구매력 5.8억, 현재 집 정리 후 순현금 2.4억, 월소득 420만 원, 월저축 150만 원.
2. [근거 1] 왜 후보가 떴나요?
3. 후보는 최근 실거래 기준가, 거래량, 거래 집중도, 전고점 대비 하락률, 전세가율, 사용자 구매력, DSR/LTV 참고값, Transformer 회복/재활성화/하락 리스크 신호를 함께 보고 설명한다.

주의점: [근거 2] Transformer AI signal 달성파크푸르지오힐스테이트

다음 행동: 후보 카드의 실거래 기준가, 90일 거래량, 전세가율, DSR/LTV 참고값을 확인한 뒤 외부 매물 사이트에서 실제 매물을 검증하세요.

참고용 추정이며 의사결정 보조입니다. 매수 추천, 수익 보장, 대출 승인 보장이 아닙니다.
```

## RAG Disabled

- sourceCount: 0
- usedLocalModel: false
- fallbackUsed: true
- error: fetch failed

Answer:

```text
결론: 현재 답변은 홈패스 계산 결과와 검색된 공공데이터 근거를 바탕으로 한 설명입니다.

근거 3개:
1. 현재 구매력 1.6억, 현재 집 정리 후 예산 4.8억, 5년 뒤 추정 구매력 5.8억, 현재 집 정리 후 순현금 2.4억, 월소득 420만 원, 월저축 150만 원.
2. 검색된 근거가 부족해 일반적인 홈패스 안전 원칙만 설명합니다.
3. 검색된 근거가 부족해 일반적인 홈패스 안전 원칙만 설명합니다.

주의점: 실제 매물, 권리관계, 대출 조건은 별도 확인해야 합니다.

다음 행동: 후보 카드의 실거래 기준가, 90일 거래량, 전세가율, DSR/LTV 참고값을 확인한 뒤 외부 매물 사이트에서 실제 매물을 검증하세요.

참고용 추정이며 의사결정 보조입니다. 매수 추천, 수익 보장, 대출 승인 보장이 아닙니다.
```
