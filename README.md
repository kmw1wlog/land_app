# landload_app

현재 디렉터리의 실제 앱을 그대로 반영한 `landload_app` 저장소입니다. 이 프로젝트는 Next.js 기반 부동산 시나리오 앱으로, 사용자의 현재 집/소득/저축/목표를 입력하면 갈아타기, 비교 후보, 커뮤니티 맥락, 공공데이터 기반 흐름을 함께 탐색할 수 있습니다.

## 앱 개요

- `app/onboarding`: 사용자 목표, 소득, 현재 집, 미래 계획 입력
- `app/feed`: 실거래/구매력 기반 추천 피드
- `app/my-home`: 주소 정규화, 거래 시드, 현재 집 가치 흐름
- `app/community`: 지역별 단지 커뮤니티/댓글/랭킹
- `app/broker`: 중개사 리드/매물 관리
- `app/demo-submission`: 발표용 데모 플로우
- `app/api/*`: discovery, brokerage, community, public-data, security API

## 기술 스택

- Next.js 15 + TypeScript
- Prisma + SQLite 개발 DB
- Vitest / Playwright
- Capacitor Android
- GitHub Actions APK artifact 업로드

## 로컬 실행

```bash
npm install
npm run build
npm run cap:sync
npm run android:debug-apk
```

## 주요 스크립트

- `npm run build`: Next.js production build
- `npm run android:init`: Android 프로젝트가 없으면 생성
- `npm run cap:prepare`: Capacitor용 최소 웹 자산 생성
- `npm run cap:sync`: Capacitor Android sync
- `npm run android:debug-apk`: Android debug APK 생성

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
