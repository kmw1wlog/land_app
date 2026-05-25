# 주관기관 융합데이터 증빙

- checkedAt: 2026-05-25T08:15:31.600Z

## 현재 체크 가능 여부

- 주관기관 융합데이터 체크 가능: false
- 사유: 현재 실데이터 provider는 MOLIT이고, KREB, HUG, TRANSPORT는 seed/mock이므로 주관기관 융합데이터 가점 체크는 보류한다.
- 실제 데이터 provider: MOLIT
- seed/mock provider: KREB(seed), HUG(seed), TRANSPORT(seed)

## 데이터별 사용 위치

| Provider | Dataset | Real/Seed | Row count | Used in | Notes |
| --- | --- | --- | ---: | --- | --- |
| MOLIT | 국토교통부 실거래/전월세·건축물·법정동 데이터 | real | 1 | candidate scoring, purchase power context, Transformer feature, RAG complex_signal, UI evidence badge | DataGoKrClient와 로컬 public-data seed 파이프라인으로 실제 공공데이터 축을 구성한다. / sourceUrl=https://www.data.go.kr / path=prisma/dev.db |
| KREB | 한국부동산원 지역 매매/전세 가격지수 시드 | seed | 5 | fused stability score, RAG kreb_market_index, comparison UI, Transformer fusion feature | MVP seed snapshot이다. 실제 R-ONE/API 확보 전에는 가점 실데이터로 계산하지 않는다. / sha256=60f53c3f3b48... / path=data/fusion/kreb_region_index_seed.csv |
| HUG | HUG 전세 보증/보증사고 리스크 시드 | seed | 5 | fused stability score, RAG hug_jeonse_risk, tenant safety UI, Transformer fusion feature | 보증 승인 가능 여부가 아니라 전세 리스크 참고 지표로만 사용한다. / sha256=b981cf76db7c... / path=data/fusion/hug_jeonse_risk_seed.csv |
| TRANSPORT | 교통 접근성/직주근접 시드 | seed | 5 | fused stability score, RAG transport_accessibility, same budget comparison UI, Transformer fusion feature | K-MaaS 실제 데이터가 확보되기 전까지는 교통 접근성 seed/공공교통 스냅샷으로 표시한다. / sha256=5ce8fbd9f64d... / path=data/fusion/transport_access_seed.csv |

## Fused Region Signals

| Region | Month | Fused score | Grade | Confidence | Source type | Evidence |
| --- | --- | ---: | --- | ---: | --- | --- |
| 대구 수성구 | 2026-04 | 77 | 안정 | 0.4 | seed | MOLIT 실거래, KREB 지역지수, HUG 전세 리스크, TRANSPORT 접근성 |
| 대구 동구 | 2026-04 | 69 | 확인 필요 | 0.4 | seed | MOLIT 실거래, KREB 지역지수, HUG 전세 리스크, TRANSPORT 접근성 |
| 대구 북구 | 2026-04 | 68 | 확인 필요 | 0.4 | seed | MOLIT 실거래, KREB 지역지수, HUG 전세 리스크, TRANSPORT 접근성 |
| 대구 중구 | 2026-04 | 76 | 안정 | 0.4 | seed | MOLIT 실거래, KREB 지역지수, HUG 전세 리스크, TRANSPORT 접근성 |
| 서울 성동구 | 2026-04 | 73 | 확인 필요 | 0.4 | seed | MOLIT 실거래, KREB 지역지수, HUG 전세 리스크, TRANSPORT 접근성 |

seed/mock만으로는 주관기관 융합데이터 가점 박스를 체크하지 않는다.