# Phase 2 공공데이터 연결 및 이후 태스크

## 현재 구현된 Phase 2 기반

- 서버 전용 환경변수: `.env.local`, `.env.example`
- Prisma + SQLite 개발 DB: `prisma/schema.prisma`
- 공공데이터 서버 레이어: `src/server/public-data`
- API routes:
  - `GET /api/public-data/health`
  - `POST /api/public-data/address/normalize`
  - `POST /api/public-data/legal-dong/seed`
  - `POST /api/public-data/transactions/seed`
  - `POST /api/public-data/building-ledger/fetch`
  - `POST /api/public-data/valuation/current-home`
- 내 집 화면 연결:
  - 주소 정규화
  - 실거래 seed
  - 실거래 comparable 기반 현재가 추정
  - 최근 거래/전세가율/전고점 대비 표시

## API 키 상태

- `DATA_GO_KR_SERVICE_KEY`: 로컬 `.env.local`에 설정됨
- `VWORLD_API_KEY`: 로컬 `.env.local`에 설정됨
- `JUSO_CONFIRM_KEY`: 아직 없음. 없을 때는 mock 주소 정규화로 fallback한다.

API 키는 서버 라우트에서만 사용하고 클라이언트 번들에 노출하지 않는다.

## 즉시 보완할 것

1. Juso는 Phase 2 필수 경로에서 제외했다. 현재는 `DISABLE_JUSO=true`로 mock 주소 정규화 + VWorld 좌표 조회를 사용한다.
2. 국토부 실거래가 endpoint path 실제 호출 확인 완료
3. 건축HUB 건축물대장 endpoint path 실제 호출 확인 필요
4. 대구 수성구 `27260`만 먼저 seed하고 실패 응답/필드명을 고정

## 확정된 사용 가능 실거래 API

`npm run check:public-apis`로 `LAWD_CD=27260`, `DEAL_YMD=202604`, `numOfRows=3` 기준 실제 호출 확인 완료.

| key | 데이터 | endpoint | 상태 |
| --- | --- | --- | --- |
| apartmentTrade | 아파트 매매 실거래가 | `/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade` | ok |
| apartmentRent | 아파트 전월세 실거래가 | `/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent` | ok |
| officetelTrade | 오피스텔 매매 실거래가 | `/1613000/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade` | ok |
| officetelRent | 오피스텔 전월세 실거래가 | `/1613000/RTMSDataSvcOffiRent/getRTMSDataSvcOffiRent` | ok |
| rowHouseTrade | 연립다세대 매매 실거래가 | `/1613000/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade` | ok |
| rowHouseRent | 연립다세대 전월세 실거래가 | `/1613000/RTMSDataSvcRHRent/getRTMSDataSvcRHRent` | ok |
| detachedHouseTrade | 단독다가구 매매 실거래가 | `/1613000/RTMSDataSvcSHTrade/getRTMSDataSvcSHTrade` | ok |
| detachedHouseRent | 단독다가구 전월세 실거래가 | `/1613000/RTMSDataSvcSHRent/getRTMSDataSvcSHRent` | ok |
| commercialTrade | 상업업무용 매매 실거래가 | `/1613000/RTMSDataSvcNrgTrade/getRTMSDataSvcNrgTrade` | ok |
| landTrade | 토지 매매 실거래가 | `/1613000/RTMSDataSvcLandTrade/getRTMSDataSvcLandTrade` | ok |

Seed route의 `propertyTypes` 값:

- `apartment`
- `officetel`
- `row_house`
- `detached_house`
- `commercial`
- `land`

Seed route의 `dealTypes` 값:

- `trade`
- `rent`

단, `commercial`, `land`는 현재 매매 API만 확인했다.

## 데이터 파이프라인 태스크

1. 법정동코드 전체 seed
2. 주소 정규화 품질 개선
3. PNU 기반 건축물대장 매칭
4. 실거래 중복 제거 unique key 설계
5. 월별 수집 배치 및 재시도 큐
6. 실거래 raw item 필드명 매핑 보강
7. VWorld 토지/용도지역 adapter 구현
8. 개별공시지가 API adapter 구현

## 추천/구매능력 엔진 태스크

1. 현재 구매능력 계산
2. 현재 집 매도 후 구매능력 계산
3. 3년/5년/10년 미래 구매능력 계산
4. 소득 상승률, 저축률, 보너스 반영
5. 목표 주택 도달기간 계산
6. 목표 지역/가격대별 후보 경로 생성
7. 대출 규칙 테이블화
8. 세금 엔진 또는 제휴 계산 API 검토

## 중개사/수익화 태스크

1. 중개사 회원가입/인증
2. 중개사무소 등록번호 검증
3. 매물 등록/수정/만료/거래완료
4. 광고 라벨 자동 표시
5. 리드 전달 전 사용자 동의 플로우
6. 라우팅 점수 엔진
7. 허위매물 신고/패널티
8. 광고비/리드비/SaaS 과금 구조
9. 직영 중개법인 설립 여부 법무 검토

## 파일럿 홍보 태스크

예산 1,000만 원 이내에서는 전국 광고보다 한 지역 실험이 우선이다.

1. 대구 수성구 파일럿 랜딩 페이지
2. “내 집 팔까 말까 계산기” 베타 모집
3. 숏폼 30개 제작
4. 네이버 카페/커뮤니티 베타 글
5. 검색광고 롱테일 키워드 테스트
6. 중개사 30곳 무료 제휴 영업
7. KPI: 온보딩 완료, 현재 집 입력, 카드 저장, 상담 요청, 제휴 중개사 수

## 주의 문구

모든 계산 결과에는 다음 문구를 유지한다.

> 참고용 추정치이며 실제 시세·세금·대출한도와 다를 수 있습니다.
