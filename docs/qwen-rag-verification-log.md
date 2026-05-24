# Qwen RAG Verification Log

- checkedAt: 2026-05-24T19:32:13.220Z
- question: 왜 이 후보가 떴어? 이 결과는 매수 추천이야? 450자 이내로 답해줘.
- localQwen.ok: true
- localQwen.baseUrl: https://<redacted-alibaba-maas>/compatible-mode/v1
- localQwen.model: qwen3.6-flash
- localQwen.modelCount: 160
- localQwen.targetModelListed: true
- localQwen.error: none
- rag.chunkCount: 113
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
1. 복현아이파크 74 (complex_signal, score=0.0855, finalScore=0.2855)
2. 영남네오빌아트 84 (complex_signal, score=0.0804, finalScore=0.2804)
3. Transformer AI signal 칠곡현대아파트 (model_artifact, score=0.3702, finalScore=0.5302)
4. Transformer AI signal 칠곡네스빌 (model_artifact, score=0.3574, finalScore=0.5174)
5. 왜 후보가 떴나요? (faq, score=0.1700, finalScore=0.2500)
6. 홈패스 안전 원칙 (safety_policy, score=0.1622, finalScore=0.2022)
7. Transformer AI signal 영남네오빌아트 (model_artifact, score=0.3270, finalScore=0.4870)
8. Transformer AI signal 동대구에일린의뜰 (model_artifact, score=0.3189, finalScore=0.4789)

Answer:

```text
결론: 매수 추천이 아니며, 이는 데이터 기반의 참고용 의사결정 보조 결과입니다.

근거 1: 후보는 기준가(예: 복현아이파크 4.6억), 거래 집중도, 전고점 대비 낙폭 등 공공데이터와 사용자 구매력(현재 정리 후 4.8억) 간격을 분석해 선정됩니다.
근거 2: Transformer AI 신호(회복/재활성화 확률 등)와 실거래 지표가 복합적으로 반영되어 점수가 산출되며, 높은 점수는 단순 적합도가 아닌 확률적 참고치입니다.
근거 3: 홈패스는 특정 단지 매입 권유나 수익 보장을 하지 않으며, 모든 결과는 사용자의 최종 판단을 위한 정보 제공 목적입니다.

주의점: 현재 집 보유 여부나 구체적인 재정 계획 입력이 부족할 경우 기본값으로 추정되었을 수 있으며, 실제 대출 승인이나 세무 효과는 금융기관 및 전문가 확인이 필요합니다.

다음 행동: 정확한 평가를 위해 현재 보유 주택 유무와 상세 소득·저축 내역을 입력하고, 해당 단지의 전세가율과 실거래 동향을 직접 비교해 보세요.

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

근거 1: 현재 집 정리 후 예산(4.8억)과 목표 예산 간격이 좁아 진입 장벽이 낮습니다.
근거 2: Transformer 점수는 확률적 신호일 뿐, 특정 단지 매입을 권유하지 않습니다.
근거 3: 전고점 대비 낙폭이나 전세가율 등 리스크 요소를 함께 고려해야 합니다.

주의점: 이 결과는 공공데이터 기반 추정치이며, 실제 대출 승인이나 세무 혜택을 보장하지 않습니다.

다음 행동: 정확한 실거래가나 전세 시세를 확인하고, 필요시 금융기관에 대출 가능 여부를 문의하세요.

참고용 추정이며 의사결정 보조입니다. 매수 추천, 수익 보장, 대출 승인 보장이 아닙니다.
```
