# Phase 2 이후 남은 구현 태스크 (Juso 제외)

업데이트: 2026-05-12

이 문서는 현재 코드 기준으로 **이미 끝난 것**과 **아직 구현이 필요한 것**을 다시 정리한다. `JUSO_CONFIRM_KEY` 발급/연동은 제외한다.

## 현재 완료된 것

### 공공데이터/API

- 국토부 아파트 매매/전월세 실거래가 API health probe
- 실거래 seed route
- `PUBLIC_DATA_MODE` 기반 mock/live/mixed 저장 정책
- live/mixed mode에서 mock 실거래 DB 저장 금지
- `RealTransaction.externalKey` 중복 방지
- `RealTransactionAudit` 변경 이력 저장
- `ApiCallLog` 외부 API 호출 로그
- `ApiQuotaDaily` 일일 호출량 카운트
- `/api/public-data/quota`
- 건축물대장 endpoint 확정
  - `/1613000/BldRgstHubService/getBrTitleInfo`
  - `/1613000/BldRgstHubService/getBrRecapTitleInfo`
  - `/1613000/BldRgstHubService/getBrExposInfo`
  - `/1613000/BldRgstHubService/getBrFlrOulnInfo`
  - `/1613000/BldRgstHubService/getBrJijiguInfo`
- 법정동코드 전체자료 다운로드 및 seed
  - source rows: 50,099
  - DB rows: 50,099
  - active rows: 20,560
- VWorld 토지/용도지역/공시지가 adapter/probe 골격
- `PublicDataSeedJob` 동기 job wrapper
- `POST /api/public-data/jobs/create`
- `GET /api/public-data/jobs/[id]`

### DB/인프라

- SQLite 개발 DB 보정 스크립트
- PostgreSQL용 Prisma schema 생성
- PostgreSQL datamodel validation 통과
- PostgreSQL migration SQL 생성
  - `prisma/schema.postgresql.prisma`
  - `prisma/postgresql-migration.sql`
- PostgreSQL deploy용 migration 파일 생성
  - `prisma/migrations/20260511000000_initial_postgresql/migration.sql`
  - `npm run db:postgres:deploy`
- 실제 PostgreSQL URL 미제공 상태 확인
  - 현재 `.env`, `.env.local`은 SQLite `DATABASE_URL`
  - deploy 명령은 실제 PostgreSQL URL 주입 후 실행 필요

### 제품/계산/UX

- 미래 구매능력 계산
- 목표 집 도달 경로 계산
- `/goal-path`
- 피드 카드 70/20/10 mixer
- 카드별 `FeedCardType`, `reason`, `recommendedPath`
- 목표 경로별 후보 3개 추천
- 필요 월 저축액 역산
- 내 집 마인드맵 숫자 badge
- DB 기반 `Property`/`Listing` feed source
  - `GET /api/feed/properties`
  - seed property 75개, listing 13개
  - 가격 계열 `BigInt` 적용으로 21.4억 초과 매물 저장 가능
- DSR/LTV 기반 대출 가능액 계산
  - 은행권 DSR 40%, 2금융권 50% 기본값
  - 수도권/규제지역 LTV/절대한도 heuristic
  - 카드/상세 화면에 필요 현금, 대출 한도, DSR, LTV 표시
- PNU/건축물대장 기반 valuation matching 1차 고도화
  - 실거래 row에 `legalDongCode10`, `pnu` 저장
  - PNU exact tier 후 법정동/면적 tier fallback
  - 건축물대장 title `buildingName` 보조 matching
- 기존 가상매물 중심 피드에서 실거래 기반 단지/면적대 discovery feed로 전환
  - `ComplexSignalSnapshot`
  - `GET/POST /api/discovery/feed`
  - `POST /api/discovery/rebuild-signals`
  - `GET /api/discovery/candidates/[id]`
  - 아파트/오피스텔 실거래 기반 기준가/거래량/전고점/전세가율 signal
  - `ComplexSignalCandidate -> PropertyLike` adapter로 기존 DSR/LTV/도달경로 재사용
  - `/feed` 기본 소스는 `/api/discovery/feed`
- 관심지역 + 유사지역 확장
  - `expandPreferredRegions`
  - 수성구/성동구/마포구 seed map
- 시간가중 실거래 기준가 계산
  - 최신 거래 가중치
  - invalid price filtering
  - 소표본 median fallback
- 네이버 부동산 외부 링크 구조
  - `ExternalComplexLinkMapping`
  - `resolveNaverRealEstateLink`
  - `POST /api/external-links/naver/resolve`
  - `POST /api/external-links/naver/suggest`
  - 네이버 데이터 크롤링 없이 검색/수동 매핑 링크만 제공
- `DiscoveryCard`
  - 최근 실거래 기준가
  - 30/90일 거래량
  - 거래 집중도
  - 전고점 대비
  - 전세가율
  - DSR/LTV/부족액/월부담
  - 실제 `profile/currentHome/financialPlan` 기반 discovery score
  - 1.3배/1.5배/2.0배 갈아타기 target band
  - 갈아타기 체크리스트
  - 유동성/거래성 점수
  - 지역 대장성 점수
  - 저층/중층/고층 가격 summary
  - `/compare-price-band` 같은 돈 비교판
  - 네이버에서 현재 매물 보기
  - 네이버 링크 정확도 label/수정 제안
  - 도달경로/종토방/가상저장
- 내 집 기준 갈아타기 사다리 UX 반영
  - 하단 탭: `홈 / 내 집 / 사다리 / 가상 / 종토방`
  - `/broker`는 B2B/관리자 화면으로 유지하되 소비자 하단 탭에서 제거
  - `MoveUpLadderSummary`
  - `FutureLadderTimeline`
  - `/feed` 상단 내 사다리 요약
  - `/feed` 필터: 지금 가능, 매도하면 가능, 1.5배 후보, 5년 뒤 가능, 거래 핫, 전고점 대비 하락, 오피스텔 현금흐름
  - `/goal-path`를 현재/3년/5년/10년 구매능력 사다리 페이지로 확장
  - `/portfolio`를 “내 미래 후보” 페이지로 개편
  - `/community` room query 기반 단지방 데이터 바와 글쓰기 draft 문맥 표시
- 갈아타기 사다리 API
  - `POST /api/discovery/move-up-ladder`
  - `POST /api/community/draft-from-candidate`

### 중개/수익화

- `Broker`, `Listing`, `Lead` DB 모델
- 중개사 등록/인증 상태 API
- 매물 등록/검증 API
- 리드 생성 API
- 공통 `LeadConsentModal`
- 상담 동의 세분화
  - 기본 동의: 매물/상담유형/관심지역/목표가격/예산대/메시지만 전달
  - 별도 동의: 월소득/현금, 현재 집 상세, 연락처
  - `ConsentRecord` consentType 분리
- 상세/카드/목표경로/포트폴리오 상담 CTA의 공통 동의 모달 사용
- `BrokerRoutingService`
- 광고/제휴/직영 검증 라벨
- `/broker` 대시보드 DB/API 연결
- `ListingPhoto` 모델
- 매물 사진 업로드/조회/삭제/검수 API
- 로컬 MVP photo storage adapter
- 카드/상세 화면 사진 carousel 또는 placeholder
- `ListingDisplayCompliance` 모델과 필수 표시정보 validation
- `DirectVerificationChecklist` 모델과 직영 검증 상태 UI
- `SellerIntent` 모델/API/화면
- CSV 기반 매물 bulk import용 adapter 골격
- 제휴 매물 source adapter mock
  - `HanbangAdapter.mock`
  - `PartnerFeedAdapter.mock`

### 커뮤니티/보안/테스트

- 커뮤니티 DB 모델/API
- `CommunityRoom`, `CommunityMembership`, `CommunityEvidence`
- 공개 토론/인증방/보유자방/실거주 후기/중개사 Q&A/예측게임 탭 UI
- 글/댓글/좋아요/신고 API
- 신고 누적 블라인드
- 금칙어/반복 광고 의심 moderation
- 예측 투표/랭킹 API
- `ConsentRecord`
- `AccessAuditLog`
- `UserDeletionRequest`
- API key server-only 사용
- API key 로그 redaction
- 리드 개인정보 최소전달 정책 테스트
- 매물 사진/표시정보 policy 테스트
- Playwright mobile/desktop smoke
- `npm test`: 47 tests 통과
- `npm run test:e2e`: 20 tests 통과
- `npm run build` 통과

## 아직 구현 필요한 것

## 1. 공공데이터 운영 고도화

### 1.1 실거래 정정/취소 반영

상태: 부분 구현

남은 것:
- 국토부 실거래 API가 제공하는 정정/취소/해제 관련 필드 확인
- raw item에 원천 고유 식별자가 있으면 `externalKey` 생성 규칙에 반영
- 취소 거래를 기존 거래 삭제가 아니라 `status=cancelled` 또는 별도 이력으로 반영
- 정정 전/후 차이를 `RealTransactionAudit`에서 사람이 읽기 쉽게 비교

### 1.2 장기 수집 job queue

상태: 동기 wrapper만 구현

남은 것:
- HTTP request 밖에서 돌아가는 worker
- retry/backoff
- job progress percentage
- 실패 endpoint만 재시도
- 월별/지역별 정기 수집 스케줄
- job 취소/재시작

### 1.3 API rate limit enforcement

상태: 호출량 카운트만 구현

남은 것:
- provider별 실제 rate limit 차단
- quota 임박/초과 UI 안내
- 실패율 알림
- API provider별 circuit breaker
- 관리자용 API 상태 대시보드

### 1.4 VWorld/공시지가 mapping 확정

상태: adapter/probe 골격

남은 것:
- VWorld dataset별 응답 필드 최종 mapping
- 토지면적, 지목, 용도지역, 공시지가 기준일자 확정 저장
- 실거래가 대비 공시지가 비율 계산
- 저장 가능 필드와 실시간 조회 전용 필드 정책 확정

### 1.5 법정동코드 정기 갱신

상태: 전체 seed 완료

남은 것:
- code.go.kr 전체자료 정기 다운로드 스크립트
- 변경분 diff
- 폐지/신규 법정동 변경 로그
- 갱신 실패 알림

## 2. PostgreSQL/배포 인프라

### 2.1 실제 PostgreSQL migration deploy

상태: schema/diff 검증 완료, 실제 DB apply 미완료

남은 것:
- Supabase/Railway/Neon 등 실제 PostgreSQL `DATABASE_URL` 확보
- `DATABASE_URL=... npx prisma migrate deploy --schema prisma/schema.postgresql.prisma`
- 실제 DB에서 seed/public-data flow 검증
- SQLite와 PostgreSQL JSON/Date/Boolean 동작 차이 확인

### 2.2 production 환경 구성

남은 것:
- production `.env` 분리
- secret rotation 정책
- Vercel/Railway/Supabase 배포 설정
- HTTPS 강제
- backup/restore 정책
- DB connection pooling

## 3. 가치평가/추천 엔진 고도화

### 3.1 PNU/지번 기반 같은 건물 매칭

상태: PNU exact tier + 법정동/단지명/면적 fallback 1차 구현

남은 것:
- 건축물대장 `mgmBldrgstPk` 기반 matching
- 같은 동/라인/층 보정
- 단지명 alias 테이블
- PNU 없는 과거 seed 데이터 backfill job

### 3.2 실거래 단지 signal 운영 고도화

상태: 1차 구현

구현된 것:
- 아파트/오피스텔 단지/면적대/층 band별 signal snapshot
- 시간가중 기준가, 거래 집중도, 재가속, 전세가율, 전고점 대비 계산
- 관심지역/유사지역 discovery feed
- 네이버 외부 링크 resolver
- 갈아타기 target band
- 유동성/대장성/매도성 score
- card-level low/mid/high 층별 가격 summary
- 같은 가격대 비교 API/UI
- 단지방 query 연결과 글쓰기 draft template
- `/my-home` valuation 하드코딩 제거

남은 것:
- 실제 실거래 seed가 부족한 지역의 snapshot 품질 점검
- `ComplexSignalSnapshot` 정기 rebuild job
- low/mid/high 층 band 간 가격 보정 정교화
- 같은 단지명 alias/법정동 표기 차이 정규화
- 네이버 exact complex link의 관리자 승인 콘솔
- 사용자 제출 네이버 링크 검수 UI

### 3.3 유형별 valuation logic 분리

남은 것:
- 아파트 valuation
- 오피스텔 valuation
- 빌라/연립/다세대 valuation
- 단독/다가구 valuation
- 상가/상업업무용 valuation
- 토지 valuation
- 유형별 confidence score

### 3.4 실제 DB 기반 추천 피드

상태: DB feed + discovery signal 1차 구현

남은 것:
- 실거래 valuation snapshot과 카드 연결
- 커뮤니티 heat score 실시간 반영
- 광고/직영/제휴 매물 운영 데이터 반영
- 저장/스와이프 이력 기반 개인화

### 3.5 포트폴리오 전체 목표 경로 연결

상태: 후보별 목표 경로 계산

남은 것:
- 저장한 가상 포트폴리오 전체가 목표 집 도달기간에 미치는 영향 계산
- 가상 매도/갈아타기 시나리오
- 목표 월세 달성률의 실제 portfolio rollup
- 포트폴리오 리밸런싱 제안

## 4. 중개사/광고/직영 매물 실서비스화

### 4.1 중개사 인증 실검증

상태: API/UI 골격

남은 것:
- 중개사무소 등록번호 실제 검증
- 사업자등록증/중개사무소등록증 업로드
- 관리자 승인/반려 플로우
- 인증 만료/정지
- 허위매물 패널티 운영

### 4.2 매물 표시광고 필수정보 검증

상태: 1차 구현

구현된 것:
- `ListingDisplayCompliance`
- 매물 등록/검증 시 필수정보 completeness 계산
- 중개사 인증 여부와 compliance status를 feed 노출 정책에 반영하는 policy
- `/broker`에서 누락 필드 표시

남은 것:
- 법령/고시 기준 항목의 실제 운영 checklist 최종 확정
- 개업공인중개사 등록번호 실검증과 compliance 승인 연동
- 매물 만료/거래완료 처리 자동화
- 표시광고 로그/증빙 저장
- 위반건축물 표시의 건축물대장 자동 연동

### 4.3 리드 동의/철회 세분화

상태: 1차 구현

구현된 것:
- 기본 상담 동의와 금융정보/현재집/연락처 동의 분리
- 별도 동의 없이는 월소득, 현금, 현재 집 상세, 연락처를 `Lead`에 저장하지 않음
- 카드/상세/목표경로/포트폴리오 상담 CTA에서 공통 동의 모달 사용
- `AccessAuditLog` 모델

남은 것:
- 리드 철회 요청
- 중개사별 열람 권한 제한
- 리드 열람 이력 UI
- 실제 연락처 인증과 연락처 전달 동의 UI

### 4.4 광고/과금

상태: 미구현

남은 것:
- 광고 상품 정의
- 상단 노출 과금
- 조건 맞춤 노출 과금
- 리드 과금
- 중개사용 SaaS 과금
- 결제/세금계산서
- 광고 성과 리포트
- 광고 boost 운영 지표

### 4.5 직영 검증 매물 운영

상태: DB 상태 + UI 체크리스트 1차 구현

구현된 것:
- `DirectVerificationChecklist`
- 직영 검증 매물 생성 시 checklist skeleton 생성
- `/broker`에서 항목별 상태 확인
- 상세/카드의 직영 검증 라벨

남은 것:
- 소유자 의뢰 확인 증빙
- 권리관계/등기 확인
- 건축물대장/실거래 comparable 검증 기록
- 직영 상담팀 배정
- 직영 중개법인 설립/법무 검토

### 4.6 실제 매물 사진 운영

상태: MVP 업로드/노출 구조 구현

구현된 것:
- `ListingPhoto`
- 인증 중개사 업로드 policy
- 로컬 `public/uploads/listings` 저장 adapter
- 사진 검수/삭제 API
- 카드/상세 사진 표시

남은 것:
- S3/Supabase Storage 전환
- EXIF 제거/WebP 변환/썸네일 생성의 실제 이미지 처리
- pHash 기반 도용/중복 탐지
- 사진 권리/소유자/임차인 동의 증빙 UI
- 관리자 사진 moderation console

### 4.7 매도 의향 수집

상태: 1차 구현

구현된 것:
- `/sell-intent`
- `SellerIntent`
- 매도 의향은 public listing으로 직접 노출하지 않는 구조

남은 것:
- 제휴 중개사/직영팀 배정
- 의향 등록 후 Listing 전환 workflow
- 매도 의향 연락/철회/삭제 처리
- 매도 의향 데이터의 민감정보 암호화

## 5. 커뮤니티/모더레이션 운영

상태: DB/API + 방 구조 1차 구현

구현된 것:
- 공개 토론방
- 인증방
- 보유자방
- 실거주 후기
- 중개사 Q&A
- 예측게임 탭
- 방별 visibility/writePolicy 구조
- 근거/검증 요청 UI

남은 것:
- 보유자 인증 연동
- 실거주자 인증 연동
- 중개사 인증 badge 연동
- 운영자 moderation console
- 신고 처리 이력
- 반복 광고 계정 정지
- 지역 비하/분쟁 키워드 정책
- 예측 투표 정산/랭킹 고도화

## 6. 보안/개인정보

상태: 동의/감사/삭제요청 모델 구현

남은 것:
- 실제 민감 필드별 암호화 적용
- 관리자 권한 모델
- 관리자 조회 로그 UI
- 마케팅 수신 동의 분리
- 개인정보 다운로드/삭제/탈퇴 처리 worker
- 개인정보 처리방침/약관/제3자 제공 동의 문안 법무 검토
- production HTTPS/security header 설정

## 7. 테스트/품질

현재 통과:
- `npm test`
- `npm run test:e2e` 20 tests
- `npm run build`
- `npx tsc --noEmit`

남은 것:
- lead consent route의 네트워크/DB 실패 자동 테스트
- 실제 PostgreSQL 대상 integration test
- public-data seed worker integration test
- API quota 초과 테스트
- WCAG 세부 항목 자동화
- Lighthouse CI
- 실제 모바일 기기 QA

## 8. 파일럿 홍보/운영

상태: 문서 수준

남은 것:
- 대구 수성구 파일럿 랜딩 페이지
- 베타테스터 모집 폼
- 숏폼/카드뉴스 템플릿
- 네이버 카페/검색광고 소재
- 중개사 제휴 제안서
- KPI 대시보드
- 가입/온보딩/현재집입력/카드저장/상담요청 funnel tracking

## 다음 우선순위

1. 실제 PostgreSQL URL 주입 후 migration deploy와 seed 검증
2. 실거래 valuation snapshot을 DB feed 카드에 자동 반영
3. `ComplexSignalSnapshot` 정기 rebuild worker와 관리자 상태 화면
4. PNU 없는 실거래 데이터 backfill job
5. 중개사 등록번호/서류 실검증과 관리자 승인 콘솔
6. 리드 철회/열람 권한 제한/열람 이력 UI
7. 운영자 moderation/admin console
8. 파일럿 랜딩/KPI 대시보드
