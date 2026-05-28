# 국토교통 데이터 활용 경진대회 별첨 제출자료

## 별첨 1. 시제품 접속 정보

- 시제품 URL: <https://land-app-mu.vercel.app/>
- 주요 화면 직접 링크:
  - <https://land-app-mu.vercel.app/demo-submission>
  - <https://land-app-mu.vercel.app/chat>
  - <https://land-app-mu.vercel.app/feed>
  - <https://land-app-mu.vercel.app/compare-price-band>
- 제출 목적: 제품/서비스 개발 부문 시제품 완성도 증빙

## 별첨 2. 시연 영상 URL

- MP4 파일: `public/demo/homepath-molit-demo-60s.mp4`
- WebM 파일: `public/demo/homepath-molit-demo-60s.webm`
- 공개 배포 후 직접 URL:
  - <https://land-app-mu.vercel.app/demo/homepath-molit-demo-60s.mp4>
  - <https://land-app-mu.vercel.app/demo/homepath-molit-demo-60s.webm>
- 길이: 60초
- 영상 메타데이터:
  - MP4: 1920x1080, 60.00초, H.264/AAC, 약 1.5MB
  - WebM: 1920x1080, 60.02초, VP9/Opus, 약 6.4MB
- 흐름: 온보딩 → 구매력 계산 → 후보 카드 → 융합 안정성 점수 → AI 설명봇 → 같은 예산 비교
- 제출 목적: 심사위원이 실제 작동 흐름을 짧은 시간 안에 확인하도록 지원

## 별첨 3. GitHub 및 최신 개발 현황

- GitHub URL: <https://github.com/kmw1wlog/land_app>
- 최신 커밋 해시: GitHub `main` 브랜치 HEAD 또는 `git rev-parse HEAD`로 확인
- 이번 별첨 산출물 최초 반영 커밋: `f0c36b3`
- 검증 시각: 2026-05-29 02:04 KST
- 재현 명령 및 현재 결과:
  - `npm test`: 통과, 24 files / 79 tests
  - `npm run build`: 통과
  - `npm run fusion:verify`: 통과, `canCheckMultiAgencyFusion=true`
  - `npm run rag:verify:qwen`: 통과, `localQwen.ok=true`, `fallbackUsed=false`
  - `npm run rag:verify:turboquant`: 통과, RHT residual correction `recall@4=0.95`, `recall@10=1`
- 제출 목적: 실제 구현 및 재현 가능성 증빙

## 별첨 4. AI 활용 증빙

- `docs/qwen-rag-verification-log.md`
- `docs/turboquant-rag-verification.md`
- `artifacts/model_outputs/transformer_metrics.json`
- `artifacts/model_outputs/feature_manifest.json`
- `/api/chat` 응답 예시 캡처: `public/demo/screens/04-chat.png`
- 제출 목적: AI학습도구 및 AI분석도구 활용 증빙

## 별첨 5. 주관기관 융합데이터 증빙

- `docs/fusion-data-evidence.md`
- `docs/molit-bonus-checklist.md`
- `artifacts/fusion/fusion-data-verification.json`
- 현재 판정: `MOLIT real + KREB real`
- 사용 위치 요약:
  - fused stability score
  - RAG `kreb_market_index`
  - 비교 UI
  - Transformer fusion feature
  - 후보 카드 evidence badge
- 제출 목적: 주관기관 융합데이터 가점 증빙

## 별첨 6. 시제품 화면 캡처 5장

- 온보딩 화면: `public/demo/screens/01-onboarding.png`
- 실거래 후보 카드: `public/demo/screens/02-feed.png`
- 융합 안정성 점수 화면: `public/demo/screens/03-fusion-stability.png`
- AI 설명봇 화면: `public/demo/screens/04-chat.png`
- 같은 예산 비교 화면: `public/demo/screens/05-compare.png`
- 5종 콜라주: `public/demo/homepath-mvp-screen-collage.png`
- 제출 목적: UI/UX 및 핵심 기능 시각 증빙

## 제출 안전 문구

HomePath는 매수 추천·수익 보장·대출 승인 보장이 아니라, 국토교통부 실거래 데이터와 한국부동산원 KREB 데이터를 결합해 사용자의 주거 구매력과 갈아타기 리스크를 설명하는 공공데이터 기반 의사결정 보조 서비스입니다.
