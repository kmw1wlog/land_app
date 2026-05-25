# Qwen RAG Verification Log

- checkedAt: 2026-05-25T08:16:24.646Z
- question: 왜 이 후보가 떴어? 이 결과는 매수 추천이야? 450자 이내로 답해줘.
- localQwen.ok: true
- localQwen.baseUrl: https://<redacted-alibaba-maas>/compatible-mode/v1
- localQwen.model: qwen3.6-flash
- localQwen.modelCount: 160
- localQwen.targetModelListed: true
- localQwen.error: none
- rag.chunkCount: 137
- rag.provider: turbo_vector_sqlite
- rag.quantization: turboquant_rht_normal_uint8

## RAG Enabled

- sourceCount: 8
- usedLocalModel: true
- usedConfiguredModel: true
- endpointType: remote
- fallbackUsed: false
- error: none

Sources:
1. 복현아이파크 74 (complex_signal, score=0.0833, finalScore=0.2833)
2. 율하센트럴파크9단지 84 (complex_signal, score=0.0715, finalScore=0.2715)
3. Transformer AI signal 칠곡네스빌 (model_artifact, score=0.3503, finalScore=0.5103)
4. Transformer AI signal 칠곡현대아파트 (model_artifact, score=0.3442, finalScore=0.5042)
5. 융합 안정성 점수 서울 성동구 (fusion_data, score=0.3464, finalScore=0.4464)
6. 왜 후보가 떴나요? (faq, score=0.1495, finalScore=0.2295)
7. 홈패스 안전 원칙 (safety_policy, score=0.1594, finalScore=0.1994)
8. Transformer AI signal 두산청구 (model_artifact, score=0.3205, finalScore=0.4805)

Answer:

```text
이 후보는 기준가 대비 구매력 적합성, 거래 활성화 신호, 하락 리스크 저점 등 데이터 기반 점수가 높게 나와 제시된 것입니다.

1. 복현아이파크 등은 최근 거래와 AI 점수(93~95점)로 유동성 및 회복 확률이 높게 평가됨.
2. 칠곡네스빌 등은 하락 리스크 확률(2.4%)이 낮아 보수적 관점에서 안전장치가 있는 것으로 분석됨.
3. 현재 정리 후 예산 4.8억 원과 후보 단지 가격대(2.9~4.6억 원) 간격이 확보되어 진입 조건이 부합함.

단, 이는 과거 데이터와 모델 추정에 기반한 것이며 실제 시장 변동성, 대출 승인 여부, 전세가율 변화 등을 반드시 직접 확인해야 합니다.

다음으로 해당 단지의 최신 실거래 내역과 본인의 DSR/LTV 한도를 금융기관에 문의하여 구체적인 자금 계획을 수립하세요.

참고용 추정이며 의사결정 보조입니다. 매수 추천, 수익 보장, 대출 승인 보장이 아닙니다.
```

## RAG Disabled

- sourceCount: 0
- usedLocalModel: true
- usedConfiguredModel: true
- endpointType: remote
- fallbackUsed: false
- error: none

Answer:

```text
결론: 매수 추천이 아니며, 이는 구매력 대비 적정성 및 시장 데이터 기반의 참고 후보입니다.

근거 1: 현재 집 정리 후 예산 4.8억 원과 목표 가격대의 간격을 분석해 도출된 결과입니다.
근거 2: 기준가, 거래 집중도, 전고점 대비 낙폭 등 공공데이터 패턴을 반영한 확률적 신호입니다.
근거 3: 월소득 420만 원, 저축 150만 원 기반의 5년 뒤 추정 구매력(5.8억)과의 괴리 가능성을 고려합니다.

주의점: Transformer 점수는 단순 매수 적합도를 보장하지 않으며, 대출 승인이나 세금 혜택은 금융기관/세무사 확인이 필요합니다.

다음 행동: 구체적인 단지명이나 추가 재정 정보를 입력하면 더 정밀한 비교 분석이 가능합니다.

참고용 추정이며 의사결정 보조입니다. 매수 추천, 수익 보장, 대출 승인 보장이 아닙니다.
```
