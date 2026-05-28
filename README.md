# HomePath

HomePath는 국토교통 공공데이터, 사용자 구매력 계산, Transformer 기반 부동산 안정성 신호, TurboQuant-inspired RAG, Qwen 3.5 0.8B 설명봇을 결합한 주거 구매력·갈아타기 리스크 진단 MVP입니다.

**청년·사회초년생을 위한 공공데이터 기반 주거 구매력·갈아타기 리스크 진단 서비스**입니다. HomePath는 **공공 실거래 데이터 → 구매력 계산 → Transformer AI 신호 → TurboQuant-inspired RAG → Qwen 설명봇 → 사용자 행동** 흐름으로 후보가 왜 보였는지와 내 조건에서 무엇을 더 확인해야 하는지를 설명합니다.

이 프로젝트는 기존 "부동산 사다리 앱"을 2026년 국토교통 데이터 활용 경진대회 제품·서비스 개발 부문 제출 방향에 맞춰 재정의한 Next.js 기반 프롭테크 MVP입니다. 서비스의 핵심은 매물 추천이나 투자 권유가 아니라, 공공 실거래 데이터와 사용자 입력값을 결합해 **현재 구매력, 미래 구매력, 현재 집 매도 후 이동 가능성, 갈아타기 리스크**를 설명 가능한 방식으로 보여주는 것입니다.

## 제출용 포지션

- **아이템명:** 청년·사회초년생을 위한 공공데이터 기반 주거 구매력·갈아타기 리스크 진단 서비스, 홈패스
- **대회 부문:** 2026년 국토교통 데이터 활용 경진대회 제품 및 서비스 개발
- **핵심 메시지:** 부동산 앱이 단지를 보여준다면, 홈패스는 사용자가 그 단지로 갈 수 있는지와 무리한 선택인지 진단합니다.
- **안전 문구:** 본 서비스는 매수 추천·수익 보장이 아니라 공공데이터 기반 의사결정 보조 도구입니다.

## 앱 개요

- `app/onboarding`: 사용자 목표, 소득, 현재 집, 미래 계획 입력
- `app/feed`: 실거래/구매력 기반 추천 피드
- `app/my-home`: 주소 정규화, 거래 시드, 현재 집 가치 흐름
- `app/goal-path`: 현재·3년·5년·10년 주거 구매력 및 도달 경로
- `app/compare-price-band`: 같은 가격대 후보 비교
- `app/community`: 지역별 단지 커뮤니티/댓글/랭킹
- `app/chat`: TurboVector RAG + 로컬 Qwen 설명봇
- `app/broker`: 중개사 리드/매물 관리
- `app/demo-submission`: 국토교통 제출용 데모 플로우
- `app/api/*`: discovery, brokerage, community, public-data, security API

## 공공데이터 활용 방향

- 국토교통부 아파트 매매 실거래가
- 아파트 전월세 실거래가
- 오피스텔 매매/전월세 실거래가
- 건축물대장
- 법정동코드
- 한국부동산원 지역시장 지수 real snapshot
- HUG 전세 리스크 seed snapshot
- 교통 접근성/직주근접 seed snapshot

공공 실거래 데이터를 단지·면적대·층수대 단위로 재가공해 최근 실거래 기준가, 거래 집중도, 전고점 대비 하락률, 전세가율, 유동성 점수, 대장성 점수를 생성합니다.

MVP에서는 국토교통 실거래 데이터와 한국부동산원 KREB 지역시장 지수 real snapshot을 함께 사용하고, HUG·교통 접근성 데이터는 seed snapshot으로 확장 구조를 구현했습니다. seed/mock만으로는 주관기관 융합데이터 가점 체크를 하지 않고, `docs/fusion-data-evidence.md`에서 provider별 real/seed 상태를 따로 증빙합니다.

## AI 활용 방향

- `scripts/ai/real_estate_transformer_model.py`: 공공 실거래 월별 feature를 입력받아 단지·면적대별 미래 가격 회복/거래 재활성화 신호를 학습하는 PyTorch Transformer 프로토타입
- 추천 엔진은 Transformer signal, DSR/LTV, 현재 집 매도 후 구매력, 관심지역 확장, 전세가율, 거래 집중도를 결합해 후보를 정렬합니다.
- LLM/생성형 AI는 단순 검색이 아니라 `왜 이 후보가 떴는지`, `같은 돈 비교 요약`, `단지 토론 질문 템플릿`을 설명 가능한 문장으로 바꾸는 보조 역할로 정의합니다.
- `/api/chat`은 OpenAI-compatible Qwen endpoint(`LLM_BASE_URL` 또는 `LOCAL_LLM_BASE_URL`)를 호출하며, Alibaba Cloud Model Studio 같은 remote endpoint와 로컬 Qwen endpoint를 모두 지원합니다. 모델이 응답하지 않아도 안전 fallback 답변으로 앱이 깨지지 않습니다.
- RAG 근거와 별도로 집 입력 설명, 후보 설명, 같은 예산 비교, 리스크/매수 질문, 데이터 출처 질문에 대한 상황별 필수 지침을 주입해 답변 형식과 금지선을 고정합니다.

## 기술 구조도

```text
국토교통 실거래/전월세/법정동/건축물 데이터
한국부동산원 KREB 지역시장 지수 real + HUG 전세 리스크 seed + 교통 접근성 seed
→ 단지·면적대 feature 생성
→ 융합 안정성 점수
→ Time-Series Transformer 안정성 신호
→ TurboQuant-inspired RAG
→ Qwen 설명봇
→ 같은 예산 비교 / 주거 경로 / 커뮤니티 질문
```

홈패스의 AI 설명은 단순 검색 결과 요약이 아닙니다. 사용자 소득·현금·현재 주거 기준점 계산값, 공공 실거래 기반 단지 지표, Transformer artifact, 안전 정책을 함께 검색하고 Qwen이 의사결정 보조 문장으로 재구성합니다.

## 기술 스택

- Next.js 15 + TypeScript
- Prisma + SQLite 개발 DB
- Vitest / Playwright
- Capacitor Android
- GitHub Actions APK/AAB artifact 업로드
- Python/PyTorch 기반 시계열 Transformer 프로토타입

## 로컬 실행

```bash
npm install
npm run build
CAPACITOR_APP_URL=https://land-app-mu.vercel.app/ npm run cap:sync
npm run android:debug-apk
```

release AAB 로컬 빌드는 아래 스크립트를 사용합니다.

```bash
CAPACITOR_APP_URL=https://land-app-mu.vercel.app/ npm run cap:sync
npm run android:release-aab
```

`CAPACITOR_APP_URL`이 없으면 Capacitor는 로컬 launcher page로 fallback 되며, release workflow에서는 반드시 공개 HTTPS URL을 주입해야 합니다.

## AI 프로토타입 재현

Python 기반 Transformer 프로토타입은 별도 의존성을 사용합니다.

```bash
python3 -m venv .venv-ai
source .venv-ai/bin/activate
pip install -r scripts/ai/requirements.txt
```

실거래 feature CSV를 먼저 생성한 뒤 학습합니다.

```bash
npm run ai:transformer:export
npm run ai:transformer:train
```

로컬 `prisma/dev.db`에 들어 있는 실거래 샘플은 현재 `2026-01`부터 `2026-04`까지 4개월치라서,
짧은 horizon prototype 학습은 아래처럼 실행하는 것이 맞습니다.

```bash
python3 scripts/ai/real_estate_transformer_model.py \
  --input-path artifacts/complex_monthly_features.csv \
  --output-dir artifacts/model_outputs \
  --sequence-length 3 \
  --horizon-months 1 \
  --epochs 12
```

출력 파일:

- `artifacts/complex_monthly_features.csv`
- `artifacts/model_outputs/transformer_predictions.csv`
- `artifacts/model_outputs/transformer_metrics.json`
- `artifacts/model_outputs/feature_manifest.json`

## 주요 스크립트

- `npm run build`: Next.js production build
- `npm run test`: Vitest unit test
- `npm run test:e2e`: Playwright test
- `npm run cap:sync`: Capacitor launcher page 생성 후 Android 프로젝트 sync
- `npm run android:debug-apk`: debug APK 빌드
- `npm run android:release-aab`: Play Store용 release AAB 빌드
- `npm run record:demo`: 제출용 데모 녹화 스크립트
- `npm run demo:video`: 60초 제출용 시연 영상 MP4/WebM 생성
- `npm run create:demo-voiceover`: 제출용 보이스오버 생성 보조 스크립트
- `npm run ai:transformer:export`: `prisma/dev.db` 실거래 데이터를 월별 feature CSV로 변환
- `npm run ai:transformer:train`: 공공 실거래 feature 기반 Transformer 모델 학습 프로토타입
- `npm run rag:reindex`: 문서, FAQ, 안전 정책, Transformer artifact, 단지 signal을 TurboVector-lite RAG index로 재생성
- `npm run rag:verify:qwen`: RAG context와 로컬 Qwen 응답 여부를 검증하고 verification artifact를 갱신
- `npm run llm:qwen:serve`: 이 PC에서 OpenAI-compatible Qwen endpoint를 실행

## 제출 별첨 자료

- 시제품 URL: `https://land-app-mu.vercel.app/`
- 제출용 데모 페이지: `/demo-submission`
- 60초 시연 영상:
  - `public/demo/homepath-molit-demo-60s.mp4`
  - `public/demo/homepath-molit-demo-60s.webm`
- MVP 화면 콜라주: `public/demo/homepath-mvp-screen-collage.png`
- 별첨 구성 문서: `docs/molit-submission-appendix.md`
- 영상 시나리오 문서: `docs/demo-video-scenario.md`

## 로컬 Qwen/RAG 시연

로컬 Qwen 서버와 Next API를 이 PC에서 띄우면, 공개 데모 화면에서도 `chatApi` 쿼리로 로컬 RAG 추론 endpoint를 지정할 수 있습니다.

```bash
npm run llm:qwen:install
npm run llm:qwen:download
npm run llm:qwen:serve
```

다른 터미널에서:

```bash
npm run rag:reindex
npm run dev
```

공개 데모에서 로컬 API를 쓰려면 `/chat?chatApi=http://127.0.0.1:3000/api/chat` 형태로 열면 됩니다. 같은 설정은 브라우저 `localStorage.homepath.chatApiUrl`에 저장되어 이후 질문도 이 PC의 RAG/Qwen API로 전달됩니다.

## Android Wrapper / Play Store

- `land_app`는 웹앱과 Capacitor Android wrapper를 같은 레포에서 함께 관리합니다.
- Android `applicationId`는 `com.kmw1wlog.landloadapp`으로 고정합니다.
- APK/AAB는 `CAPACITOR_APP_URL`에 지정된 공개 HTTPS 배포 주소를 WebView 시작 URL로 사용합니다.
- 현재 기본 공개 URL은 `https://land-app-mu.vercel.app/` 입니다.
- `https://land-app-git-main-kmw1wlog-4554s-projects.vercel.app` 와 `https://land-nkitby9bk-kmw1wlog-4554s-projects.vercel.app` 는 `2026-05-24` 확인 시점 기준 Vercel deployment protection 때문에 `401`이므로 앱 기본 URL로 쓰면 안 됩니다.
- release 서명은 기존 공용 keystore를 재사용하며, keystore/base64/password/key.properties는 절대 커밋하지 않습니다.
- Play Console 업로드 파일은 `android/app/build/outputs/bundle/release/app-release.aab` 입니다.
- 새 AAB를 올릴 때마다 `versionCode`를 반드시 증가시켜야 합니다.

## Android 빌드 다운로드 방법

1. GitHub 레포 `kmw1wlog/land_app`의 `Actions` 탭으로 이동합니다.
2. `Build Debug APK` 또는 `Build Release AAB` workflow를 실행하거나 `main` 브랜치 push로 생성된 run을 엽니다.
3. `Artifacts`에서 `land-app-debug-apk` 또는 `land-app-release-aab`를 다운로드합니다.

## 주의 사항

- 웹앱 본체는 Vercel에 배포된 Next.js 앱입니다.
- APK/AAB는 Capacitor Android shell이며, 실행 시 `CAPACITOR_APP_URL`에 지정된 웹앱 주소를 엽니다.
- Vercel 배포 보호가 켜진 프로젝트 도메인은 WebView에서 로그인 화면이나 `401`을 만들 수 있습니다. 공개 접근 가능한 production URL을 사용해야 합니다.
- 저장소에는 현재 앱 소스가 직접 포함되어 있습니다.
- release AAB를 쓰려면 GitHub Secrets에 `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`를 설정해야 합니다.
- Android release `versionCode`는 현재 `1`이며, `versionName`은 기존 scaffold 값인 `1.0`을 유지합니다. 다음 AAB부터는 `versionCode`를 `2`, `3`처럼 계속 올리면 됩니다.
