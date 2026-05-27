# Qwen RAG Verification Log

- checkedAt: 2026-05-27T16:02:16.438Z
- question: 왜 이 후보가 떴어? 이 결과는 매수 추천이야? 450자 이내로 답해줘.
- localQwen.ok: true
- localQwen.baseUrl: https://<redacted-alibaba-maas>/compatible-mode/v1
- localQwen.model: qwen3.6-flash
- localQwen.modelCount: 164
- localQwen.targetModelListed: true
- localQwen.error: none
- rag.chunkCount: 137
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
2. 칠곡현대아파트 59 (complex_signal, score=0.0667, finalScore=0.4067)
3. 율하센트럴파크9단지 84 (complex_signal, score=0.0857, finalScore=0.3957)
4. Transformer AI signal 칠곡현대아파트 (model_artifact, score=0.2819, finalScore=0.4419)
5. Transformer AI signal 동대구에일린의뜰 (model_artifact, score=0.2759, finalScore=0.4359)
6. 융합 안정성 점수 서울 성동구 (fusion_data, score=0.2988, finalScore=0.3988)
7. 한국부동산원 지역시장 지수 서울 성동구 (kreb_market_index, score=0.1310, finalScore=0.2110)
8. 왜 후보가 떴나요? (faq, score=0.1450, finalScore=0.2250)
9. 홈패스 안전 원칙 (safety_policy, score=0.1244, finalScore=0.1644)

Answer:

```text
이 후보는 기준가 대비 낙폭, 거래 재활성화 신호(88%), 하락 리스크 낮음(4.1%) 등 AI 점수(93.2점)와 사용자 구매력(현재 1.6억/정리 후 4.8억) 간 간극을 분석해 도출된 참고 대상일 뿐, 매수 추천은 아닙니다.

근거:
1. 칠곡현대아파트는 최근 추정 기준가 약 1.2억 원으로, 현재 정리 예산 4.8억 원 범위 내이며 회복 확률 94.6%로 안정적 신호를 보였습니다.
2. 성동구 지역 시장 지수는 매매·전세 모두 상승 추세(MoM +0.2~0.5%)이나, 융합 안정성 점수 74점('확인 필요')으로 데이터 검증이 필요합니다.
3. Transformer 신호는 과거 백테스트 기반 확률일 뿐, 실제 금리 변동이나 실거래 부재 시 리스크가 존재할 수 있습니다.

주의점:
실거래 snapshot 데이터가 부족해 모델 추정에 의존한 부분이 있으며, 목표 예산 6.5억 원과 현재 구매력 간 격차(약 1.7억 원)를 메우기 위해 추가 저축이나 대출 부담 증가가 필요할 수 있습니다.

다음 행동:
성동구 내 유사 단지 실거래 내역 비교 및 은행

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
결론: 매수 추천이 아니며, 이는 사용자 구매력(4.8억)과 목표(6.5억) 간 격차를 해소할 수 있는 비교 대상 후보로 선정된 것입니다.

근거 1: 현재 정리 후 예산 4.8억은 성동구 목표 6.5억보다 1.7억 부족해, 가격 대비 전세가율이나 낙폭이 큰 단지를 우선 노출합니다.
근거 2: 노원구 보유 주택(추정가 4.2억)을 매도할 경우 순현금 2.4억이 발생하므로, 이 자금으로 추가 대출 부담 없이 접근 가능한 지역을 필터링했습니다.
근거 3: Transformer 점수는 확률적 참고 신호일 뿐이며, 단순 점수 높음만으로 적합성을 보장하지 않습니다.

주의점: 데이터는 추정치이며, 실제 거래가 활발하지 않거나 권리 관계 복잡성 등 리스크가 있을 수 있습니다.

다음 행동: 관심 단지의 실거래가 동향과 전세 시세를 직접 확인하시고, 필요시 전문가 상담을 통해 구체적인 조건을 검증하세요.

참고용 추정이며 의사결정 보조입니다. 매수 추천, 수익 보장, 대출 승인 보장이 아닙니다.
```
