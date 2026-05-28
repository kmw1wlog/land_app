# Qwen RAG Verification Log

- checkedAt: 2026-05-28T09:07:30.002Z
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
첫 주거 구매자로서 매수 추천이 아닌 의사결정 보조입니다.

1. 수성구 안정성(78점)과 KREB 매매지수 상승으로 후보군 선정
2. 더테라스는 전고점 대비 -2.3% 낙폭, 사월보성은 전세가율 88.6%로 리스크 상이
3. AI 신호는 회복 확률 참고용이며, 현재 구매력 3.8억은 목표 6.5억 대비 부족

주의: 데이터는 추정치이며 수익/대출 보장이 아닙니다.
다음: 부족한 자금 2.6억 조달 계획 및 금융기관 대출 조건 확인

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
의사결정 보조일 뿐 매수 추천이 아닙니다.
1. 첫 구매자로서 수성구 월세 거주 중이며, 현재 3.8억 구매력으로 목표(6.5억) 대비 2.6억 부족해 후보가 제시됐습니다.
2. 5년 후 추정 구매력 4.3억으로 여전히 부족하므로, 이는 예산 격차를 해소하기 위한 시나리오 기반 비교 결과입니다.
3. Transformer 점수는 확률적 참고일 뿐, 특정 단지 매입을 권유하거나 수익을 보장하지 않습니다.

주의: 소득·저축 계획 변경이나 금리 변동에 따라 구매력은 달라질 수 있으며, 실제 거래가는 실거래와 KREB 지수에 따릅니다.

다음 행동: 목표 예산 달성을 위한 저축율 증대 방안 또는 대출 조건별 시뮬레이션을 입력해 보세요.
참고용 추정이며 의사결정 보조입니다. 매수 추천, 수익 보장, 대출 승인 보장이 아닙니다.
```
