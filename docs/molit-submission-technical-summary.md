# HomePath 국토교통 제출 기술 요약

## 공공데이터 활용

HomePath는 국토교통 실거래/전월세, 법정동, 건축물, 주소/지오코딩 계열 데이터를 중심으로 후보 단지의 기준가, 거래량, 전세가율, 전고점 대비 낙폭, 구매력 판단 지표를 생성한다.

## 주관기관 융합데이터 현재 상태

- 체크 가능 여부: false
- 사유: 현재 실데이터 provider는 MOLIT이고, KREB, HUG, TRANSPORT는 seed/mock이므로 주관기관 융합데이터 가점 체크는 보류한다.
- real providers: MOLIT
- seed/mock providers: KREB, HUG, TRANSPORT

## real/seed/mock 구분

- MOLIT: real, rows=1, usedIn=candidate scoring, purchase power context, Transformer feature, RAG complex_signal, UI evidence badge
- KREB: seed, rows=5, usedIn=fused stability score, RAG kreb_market_index, comparison UI, Transformer fusion feature, sha256=60f53c3f3b4890b8921ca9274cf353a82939ca0e1279d537d4563edac4a9c636
- HUG: seed, rows=5, usedIn=fused stability score, RAG hug_jeonse_risk, tenant safety UI, Transformer fusion feature, sha256=b981cf76db7c3db1a90d881fce37f9afd4ec740c2ecf3d43592e9adac396f55f
- TRANSPORT: seed, rows=5, usedIn=fused stability score, RAG transport_accessibility, same budget comparison UI, Transformer fusion feature, sha256=5ce8fbd9f64d716ca77ce39d103af126e76252c2f9ed481f507034b6c372ec66

## AI학습도구

Time-Series Transformer는 단지·면적대별 실거래 시계열과 융합데이터 feature를 함께 받아 거래 재활성화, 가격 안정성, 하락 리스크 신호를 산출한다.

## AI분석도구

TurboQuant-inspired RAG는 공공데이터 증빙, Transformer artifact, 단지 signal, 안전정책을 압축 벡터 검색으로 가져오고, Qwen 설명봇은 이 근거와 사용자 구매력 계산을 함께 사용해 자연어 답변을 만든다.

## 단순 검색이 아닌 이유

답변은 검색 결과를 그대로 보여주는 방식이 아니라 사용자 월소득·현금·현재 집, 후보 단지 실거래 지표, Transformer 산출물, fusion score, 안전정책을 결합해 의사결정 보조 설명으로 재구성한다.

## 기대효과

청년·사회초년생과 1주택자가 호가나 소문이 아니라 공공 실거래와 구매력 기준으로 무리한 선택을 줄이고, 부동산 정보 비대칭을 완화하도록 돕는다.