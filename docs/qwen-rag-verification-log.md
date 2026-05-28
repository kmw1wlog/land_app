# Qwen RAG Verification Log

- checkedAt: 2026-05-28T17:03:09.882Z
- question: 왜 이 후보가 떴어? 이 결과는 매수 추천이야? 450자 이내로 답해줘.
- localQwen.ok: true
- localQwen.baseUrl: https://<redacted-alibaba-maas>/compatible-mode/v1
- localQwen.model: qwen3.6-flash
- localQwen.modelCount: 164
- localQwen.targetModelListed: true
- localQwen.error: none
- rag.chunkCount: 217
- rag.provider: turbo_vector_sqlite
- rag.quantization: turboquant_rht_normal_uint8

## RAG Enabled

- sourceCount: 9
- usedLocalModel: true
- usedConfiguredModel: true
- endpointType: remote
- fallbackUsed: false
- finishReason: stop
- modelRouting: qwen3.7-max (reasoning_or_risk_answer, maxTokens=1600, attempted=qwen3.7-max)
- error: none

Sources:
1. 사용자 상황 고정 context (user_context, score=1.0000, finalScore=1.8000)
2. 더테라스 84 (complex_signal, score=0.1244, finalScore=0.4644)
3. 사월보성 59 (complex_signal, score=0.1235, finalScore=0.4635)
4. Transformer AI signal e편한세상남산 (model_artifact, score=0.2535, finalScore=0.4135)
5. Transformer AI signal 유니버시아드선수촌1단지 (model_artifact, score=0.2338, finalScore=0.3938)
6. 융합 안정성 점수 대구 수성구 (fusion_data, score=0.3104, finalScore=0.4104)
7. 한국부동산원 지역시장 지수 대구 수성구 (kreb_market_index, score=0.2291, finalScore=0.3091)
8. 왜 후보가 떴나요? (faq, score=0.1297, finalScore=0.2097)
9. 홈패스 안전 원칙 (safety_policy, score=0.0964, finalScore=0.1364)

Answer:

```text
매수 추천이 아니며, 첫 주택 구매자 기준 현재 구매력 3.8억 내에서 진입 가능한 수성구 후보를 선별한 결과입니다.

1. 더테라스(2.4억), 사월보성(1.2억)은 실거래가 기반 매수 가능 범위 내 후보
2. AI 점수는 회복 확률 등 참고 신호일 뿐 매수 적합성을 보장하지 않음
3. 수성구 융합 안정성 78점·KREB 매매지수 100.1은 시장 확인용 지표임

주의: 목표가 6.5억 대비 2.6억 부족하며, AI 고득점이 수익을 의미하지 않습니다.

다음 행동: 금융기관 대출 한도 상담 및 관심 단지 최근 3개월 실거래·전세가율 직접 확인

참고용 추정이며 의사결정 보조입니다. 매수 추천, 수익 보장, 대출 승인 보장이 아닙니다.
```

## RAG Disabled

- sourceCount: 0
- usedLocalModel: true
- usedConfiguredModel: true
- endpointType: remote
- fallbackUsed: false
- finishReason: stop
- modelRouting: qwen3.7-max (reasoning_or_risk_answer, maxTokens=1600, attempted=qwen3.7-max)
- error: none

Answer:

```text
매수 추천이 아니며, 첫 주택 구매자 기준 대구 수성구 목표가 6.5억 대비 현재 구매력 3.8억의 격차를 분석하기 위해 후보가 도출되었습니다.

1. 현재 구매력 3.8억과 목표 부족액 2.6억을 기반으로 도달 가능성 검증용 참고 신호로 제시됨
2. 월저축 150만 원 유지 시 5년 후 추정 구매력 4.3억으로, 여전히 2.2억 추가 재원 마련 필요
3. Transformer 점수는 확률적 참고치일 뿐이며, 실거래·전세가율 등 정량 근거와 함께 해석해야 함

주의: 재정 입력값이 데모 기본값인지 확인 필요하며, 대출 승인·세금·수익률은 보장되지 않습니다.

다음 행동: 실제 소득·저축액 재입력으로 구매력 재계산 후, 금융기관 대출 한도 및 세무 상담을 진행하세요.

참고용 추정이며 의사결정 보조입니다. 매수 추천, 수익 보장, 대출 승인 보장이 아닙니다.
```
