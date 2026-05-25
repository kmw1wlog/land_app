# HomePath 국토교통 제출 기술 요약

## 제출 포지션

HomePath는 청년·사회초년생과 1주택자의 주거 구매력과 갈아타기 리스크를 공공데이터와 AI로 설명하는 의사결정 보조 서비스입니다. 매수 추천, 수익 보장, 대출 승인 보장이 아니라 공공 실거래와 사용자 구매력 기준으로 무리한 선택을 줄이는 것을 목표로 합니다.

## 공공데이터 활용

- 국토교통부 아파트 매매 실거래가와 전월세 실거래가
- 오피스텔 매매/전월세 실거래가
- 법정동 코드와 주소 정규화 데이터
- 건축물대장 및 공공데이터 연계 후보
- 한국부동산원 지역시장 지수 seed snapshot
- HUG 전세 리스크 seed snapshot
- 교통 접근성/직주근접 seed snapshot

이 데이터는 단지·면적대·층수대 feature로 변환되어 최근 실거래 기준가, 거래량, 거래 집중도, 전고점 대비 낙폭, 전세가율, 유동성, 대장성 지표를 만듭니다.

MVP에서는 국토교통 실거래 데이터를 중심으로 한국부동산원·HUG·교통 접근성 데이터 구조를 시드 스냅샷으로 구현했습니다. 이 seed는 후보 카드, 같은 예산 비교, RAG chunk, 융합 안정성 점수에 연결되어 있지만, 실제 API/공식 데이터가 확보되기 전까지 주관기관 융합데이터 가점으로 단정하지 않습니다.

## 융합 안정성 점수

융합 안정성 점수는 “오를 가능성”이 아니라 데이터 확인 가능성과 주거 안정성 관점의 참고 점수입니다. 가중치는 국토부 실거래 안정성 40%, 한국부동산원 지역시장 흐름 20%, HUG 전세 리스크 20%, 교통 접근성 20%로 구성했습니다. seed/mock 여부는 `docs/fusion-data-evidence.md`와 `docs/molit-bonus-checklist.md`에 별도 기록합니다.

## AI 학습도구

Time-Series Transformer는 공공 실거래 월별 feature를 입력받아 단지·면적대별 회복 가능성, 거래 재활성화, 하락 리스크 신호를 산출합니다. 이 신호는 특정 단지 매입 지시가 아니라 후보 설명과 리스크 점검에 쓰이는 확률적 참고 신호입니다.

Transformer feature export에는 `kreb_sale_mom`, `kreb_rent_mom`, `kreb_volatility_score`, `hug_jeonse_risk_score`, `transit_accessibility_score`, `commute_access_score`, `fused_stability_score`를 추가할 수 있게 했습니다. seed 기반 feature는 모델 입력에 들어가더라도 seed flag와 문서로 구분합니다.

## AI 분석도구

TurboQuant-inspired RAG는 README, 제출 문서, FAQ, 안전 정책, Transformer artifact, 단지 signal chunk를 압축 벡터로 검색합니다. Qwen OpenAI-compatible endpoint는 계산 결과와 검색 근거를 받아 한 줄 결론, 근거 3개, 주의점, 다음 행동 형식으로 설명합니다.

RAG에는 `fusion_data`, `kreb_market_index`, `hug_jeonse_risk`, `transport_accessibility` source type을 추가했습니다. “데이터 출처” 질문에는 국토부 실거래/전월세, 한국부동산원 지역시장 지수, HUG 전세 리스크, 교통 접근성, Transformer AI signal, TurboQuant-inspired RAG evidence가 함께 표시됩니다.

## 단순 검색이 아닌 이유

- 사용자 월소득, 월저축, 현금, 현재 주거 기준점을 계산식에 반영합니다.
- 공공 실거래 기반 단지 지표와 Transformer artifact를 함께 검색합니다.
- 의도별 retrieval plan으로 후보 설명, 구매력, 리스크, 데이터 출처, 안전 질문에 서로 다른 근거를 우선합니다.
- safety policy와 상황별 지침을 항상 주입해 매수 추천·수익 보장 표현을 차단합니다.

## 안전정책

홈패스는 특정 단지 매입 권유, 수익 보장, 대출 승인 보장, 세무·법률 확답을 하지 않습니다. 모든 답변은 공공데이터 기반 참고용 진단이며, 실제 매물·권리관계·대출·세금은 외부 확인 대상으로 안내합니다.

## 기대효과

- 청년·사회초년생의 주거 정보 비대칭 완화
- 월소득과 현금흐름을 벗어난 무리한 주거 선택 방지
- 호가나 소문이 아니라 실거래와 구매력 기준의 비교 문화 형성
- 1주택자의 보유, 정리 후 이동, 미래 준비 경로를 설명 가능한 방식으로 제시
