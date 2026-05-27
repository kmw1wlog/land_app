# 주관기관 융합데이터 증빙

- checkedAt: 2026-05-27T15:55:08.635Z

## 현재 체크 가능 여부

- 주관기관 융합데이터 체크 가능: true
- 사유: MOLIT와 KREB 실데이터가 fused stability score, RAG, UI에 함께 반영된다.
- 실제 데이터 provider: MOLIT, KREB
- seed/mock provider: HUG(seed), TRANSPORT(seed)

## 데이터별 사용 위치

| Provider | Dataset | Real/Seed | Row count | Used in | Notes |
| --- | --- | --- | ---: | --- | --- |
| MOLIT | 국토교통부 실거래/전월세·건축물·법정동 데이터 | real | 1 | candidate scoring, purchase power context, Transformer feature, RAG complex_signal, UI evidence badge | DataGoKrClient와 로컬 public-data seed 파이프라인으로 실제 공공데이터 축을 구성한다. / sourceUrl=https://www.data.go.kr / path=prisma/dev.db |
| KREB | 한국부동산원 지역 매매/전세 가격지수 실데이터 | real | 5 | fused stability score, RAG kreb_market_index, comparison UI, Transformer fusion feature | 공식 CSV/API를 normalize한 real snapshot이다. / sourceUrl=https://www.reb.or.kr/r-one/openapi/SttsApiTblData.do / sha256=707b62bf6694... / path=data/fusion/kreb_region_index_real.csv |
| HUG | HUG 전세 보증/보증사고 리스크 시드 | seed | 5 | fused stability score, RAG hug_jeonse_risk, tenant safety UI, Transformer fusion feature | 보증 승인 가능 여부가 아니라 전세 리스크 참고 지표로만 사용한다. / sha256=b981cf76db7c... / path=data/fusion/hug_jeonse_risk_seed.csv |
| TRANSPORT | 교통 접근성/직주근접 시드 | seed | 5 | fused stability score, RAG transport_accessibility, same budget comparison UI, Transformer fusion feature | K-MaaS 실제 데이터가 확보되기 전까지는 교통 접근성 seed/공공교통 스냅샷으로 표시한다. / sha256=5ce8fbd9f64d... / path=data/fusion/transport_access_seed.csv |

## Fused Region Signals

| Region | Month | Fused score | Grade | Confidence | Source type | Evidence |
| --- | --- | ---: | --- | ---: | --- | --- |
| 대구 수성구 | 2026-04 | 78 | 안정 | 0.6 | seed | MOLIT 실거래(real), KREB 지역지수(real), HUG 전세 리스크(seed), TRANSPORT 접근성(seed) |
| 대구 동구 | 2026-04 | 72 | 확인 필요 | 0.6 | seed | MOLIT 실거래(real), KREB 지역지수(real), HUG 전세 리스크(seed), TRANSPORT 접근성(seed) |
| 대구 북구 | 2026-04 | 70 | 확인 필요 | 0.6 | seed | MOLIT 실거래(real), KREB 지역지수(real), HUG 전세 리스크(seed), TRANSPORT 접근성(seed) |
| 대구 중구 | 2026-04 | 78 | 안정 | 0.6 | seed | MOLIT 실거래(real), KREB 지역지수(real), HUG 전세 리스크(seed), TRANSPORT 접근성(seed) |
| 서울 성동구 | 2026-04 | 74 | 확인 필요 | 0.6 | seed | MOLIT 실거래(real), KREB 지역지수(real), HUG 전세 리스크(seed), TRANSPORT 접근성(seed) |

현재 가점 체크 가능 판정은 real provider만 사용한다. seed/mock provider는 보조 설명과 확장 구조로만 표시한다.