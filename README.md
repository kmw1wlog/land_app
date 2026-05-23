# 홈패스(HomePath)

**청년·사회초년생을 위한 공공데이터 기반 주거 구매력·갈아타기 리스크 진단 서비스**입니다.

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
- `app/broker`: 중개사 리드/매물 관리
- `app/demo-submission`: 국토교통 제출용 데모 플로우
- `app/api/*`: discovery, brokerage, community, public-data, security API

## 공공데이터 활용 방향

- 국토교통부 아파트 매매 실거래가
- 아파트 전월세 실거래가
- 오피스텔 매매/전월세 실거래가
- 건축물대장
- 법정동코드
- 향후 교통 접근성/K-MaaS 계열 데이터 연계 후보

공공 실거래 데이터를 단지·면적대·층수대 단위로 재가공해 최근 실거래 기준가, 거래 집중도, 전고점 대비 하락률, 전세가율, 유동성 점수, 대장성 점수를 생성합니다.

## AI 활용 방향

- `scripts/ai/real_estate_transformer_model.py`: 공공 실거래 월별 feature를 입력받아 단지·면적대별 미래 가격 회복/거래 재활성화 신호를 학습하는 PyTorch Transformer 프로토타입
- 추천 엔진은 Transformer signal, DSR/LTV, 현재 집 매도 후 구매력, 관심지역 확장, 전세가율, 거래 집중도를 결합해 후보를 정렬합니다.
- LLM/생성형 AI는 단순 검색이 아니라 `왜 이 후보가 떴는지`, `같은 돈 비교 요약`, `단지 토론 질문 템플릿`을 설명 가능한 문장으로 바꾸는 보조 역할로 정의합니다.

## 기술 스택

- Next.js 15 + TypeScript
- Prisma + SQLite 개발 DB
- Vitest / Playwright
- Capacitor Android
- GitHub Actions APK artifact 업로드
- Python/PyTorch 기반 시계열 Transformer 프로토타입

## 로컬 실행

```bash
npm install
npm run build
npm run cap:sync
npm run android:debug-apk
```

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
- `npm run record:demo`: 제출용 데모 녹화 스크립트
- `npm run create:demo-voiceover`: 제출용 보이스오버 생성 보조 스크립트
- `npm run ai:transformer:export`: `prisma/dev.db` 실거래 데이터를 월별 feature CSV로 변환
- `npm run ai:transformer:train`: 공공 실거래 feature 기반 Transformer 모델 학습 프로토타입

## Android 빌드 다운로드 방법

1. GitHub 레포 `kmw1wlog/land_app`에 접속합니다.
2. `Actions` 탭에서 `Build Debug APK` 또는 `Build Release AAB` 실행을 엽니다.
3. `Artifacts`에서 `land-app-debug-apk` 또는 `land-app-release-aab`를 다운로드합니다.

## 주의 사항

- 웹앱 본체는 Vercel에 배포된 Next.js 앱입니다.
- APK는 Capacitor Android shell이며, 실행 시 `CAPACITOR_APP_URL`에 지정된 웹앱 주소를 엽니다.
- 현재 Vercel 배포 보호가 켜져 있으면 APK와 외부 브라우저에서 `401`이 발생할 수 있습니다. 이 경우 Vercel 쪽 배포 보호 설정 또는 공개 도메인 설정이 필요합니다.
- 저장소에는 현재 앱 소스가 직접 포함되어 있습니다.
- release AAB를 쓰려면 GitHub Secrets에 `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`를 설정해야 합니다.
