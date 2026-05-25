# Qwen RAG Verification Log

- checkedAt: 2026-05-25T07:37:34.978Z
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
후보 단지는 기준가 대비 낙폭, 거래 집중도, 전세가율, 사용자 구매력(4.8억)과의 간격, 그리고 Transformer의 회복/재활성화 확률 신호를 종합해 선정된 것입니다. 이는 매수 추천이 아니며, 특정 단지 매입을 권유하지 않습니다.

1. **선정 근거**: 최근 실거래 기준가, 3개월 내 거래량, 전고점 대비 하락률, 전세가율이 사용자의 현재 정리 후 예산(4.8억 원)과 맞물려 분석되었습니다.
2. **AI 신호 반영**: 복현아이파크, 율하센트럴파크 등 후보는 높은 AI 점수와 회복 확률을 보였으나, 이는 과거 데이터 기반 확률일 뿐 미래 수익을 보장하지 않습니다.
3. **구매력 적합성**: 현재 구매력 1.6억 원과 정리 후 예산 4.8억 원을 기준으로, 해당 단지들의 추정 가격대가 사용자의 재정 계획 범위 내에 포함되는지 확인한 결과입니다.

**주의점**: Transformer 점수는 참고용 추정치이며, 실제 대출 승인, 세제 혜택, 권리 관계 변동은 금융기관 및 전문가 확인이 필요합니다. 개인정보 노출을 피하기 위해 상세 주소나 계좌 정보는 제공되지 않습니다.

**다음 행동**: 구체적인 단지명이나 추가 재정 정보(부채 현황 등)를 입력하면 더 정교한 비교 분석이 가능합니다.

참고용

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
이 후보는 사용자 구매력(4.8억)과 예산 간격, 전세가율 등 조건을 충족해 표시된 것이며, 매수 추천이 아닙니다.
1. 현재 집 정리 후 예산 4.8억 원 범위 내 가격대입니다.
2. 월 소득 420만 원 대비 대출 부담이 계산상 허용 범위를 넘지 않습니다.
3. Transformer 점수는 참고용 확률일 뿐, 단독 매수 근거가 아닙니다.

주의: 실거래 부재, 공급 과잉, 금리 변동 리스크가 있을 수 있으며, 이는 의사결정 보조일 뿐 보장이 아닙니다.
다음 행동: 해당 단지의 실제 실거래가 및 전세 시세를 금융기관이나 공시 자료를 통해 다시 확인하세요.

참고용 추정이며 의사결정 보조입니다. 매수 추천, 수익 보장, 대출 승인 보장이 아닙니다.
```
