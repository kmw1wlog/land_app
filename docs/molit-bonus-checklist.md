# 국토교통 데이터 활용 경진대회 가점 자가체크

## AI 활용

체크 가능: 예

근거:
- AI학습도구: Time-Series Transformer
- AI분석도구: TurboQuant-inspired RAG + Qwen 설명봇
- 단순 검색이 아니라 공공데이터 feature, 구매력 계산, Transformer 산출물, RAG 근거를 결합해 설명

## 주관기관 융합데이터

체크 가능: 아니오

체크 가능 조건:
- MOLIT 실거래 데이터는 real
- KREB/HUG/KMAAS/TRANSPORT 중 최소 1개 이상이 real
- 해당 데이터가 fused stability score, UI, RAG, AI 설명에 실제 반영됨

현재 상태:
- MOLIT: real
- KREB: seed
- HUG: seed
- TRANSPORT/KMAAS: seed

최종 제출 시 체크 여부: false
필요한 다음 단계: KREB/HUG/KMAAS/TRANSPORT 중 최소 1개 real dataset을 연결하고 fused score, RAG, UI 사용 위치를 검증해야 한다.
강한 주장에 아직 부족한 provider: KREB, HUG, KMAAS/TRANSPORT

seed/mock만으로는 주관기관 융합데이터 체크하지 않는다. MVP에서는 확장 구현 가능성과 동일 파이프라인 적용 근거로만 제시한다.