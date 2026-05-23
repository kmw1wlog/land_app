# Play Store Closed Testing

`land_app`은 Next.js 웹앱과 Capacitor Android wrapper를 같은 레포에서 함께 관리합니다. Play Console closed testing에는 release APK가 아니라 signed release AAB를 업로드합니다.

## Debug APK와 Release AAB 차이

- Debug APK: 빠른 설치 테스트용입니다. GitHub Actions artifact 이름은 `land-app-debug-apk` 입니다.
- Release AAB: Google Play Console closed testing 업로드용입니다. GitHub Actions artifact 이름은 `land-app-release-aab` 입니다.
- Play Console에는 `android/app/build/outputs/bundle/release/app-release.aab` 파일을 업로드합니다.

## CAPACITOR_APP_URL 의미

- Android 앱은 로컬에 웹 정적 파일을 모두 내장하지 않고, `CAPACITOR_APP_URL`에 지정된 공개 HTTPS 웹앱을 WebView로 엽니다.
- 현재 기본 공개 URL은 `https://land-app-mu.vercel.app/` 입니다.
- `CAPACITOR_APP_URL`은 반드시 `https://` 로 시작해야 합니다.
- `https://land-app-git-main-kmw1wlog-4554s-projects.vercel.app`
- `https://land-nkitby9bk-kmw1wlog-4554s-projects.vercel.app`
- 위 두 프로젝트 도메인은 `2026-05-24` 확인 시점 기준 `401` 보호 응답이므로 기본 앱 URL로 사용하면 안 됩니다.

## GitHub Secrets 등록

release AAB workflow에는 아래 4개 GitHub Secrets가 필요합니다.

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

등록 경로:

1. GitHub `kmw1wlog/land_app` 저장소
2. `Settings`
3. `Secrets and variables`
4. `Actions`
5. `New repository secret`

## 기존 keystore 재사용 주의사항

- 새 keystore를 만들지 않습니다.
- 기존 공용 release keystore를 그대로 재사용합니다.
- `release-keystore.base64`, `.jks`, `.keystore`, `key.properties`, 비밀번호 문자열은 절대 커밋하지 않습니다.
- workflow는 `ANDROID_KEYSTORE_BASE64`를 runner 임시 경로에 복원해 사용합니다.

## Version 규칙

- Android `applicationId`: `com.kmw1wlog.landloadapp`
- 현재 `versionCode`: `1`
- 현재 `versionName`: `1.0`
- 새 AAB를 Play Console에 올릴 때마다 `versionCode`는 반드시 이전보다 커야 합니다.
- 예시: `1 -> 2 -> 3`
- `versionName`은 표시용 문자열이라 필요 시 `1.0.1`, `1.1.0`처럼 별도로 조정할 수 있습니다.

## GitHub Actions 사용 방법

### Debug APK

1. `Actions` 탭에서 `Build Debug APK` 실행
2. 필요하면 `capacitor_app_url` 입력
3. artifact `land-app-debug-apk` 다운로드

### Release AAB

1. `Actions` 탭에서 `Build Release AAB` 실행
2. `capacitor_app_url`에 공개 HTTPS URL 입력
3. workflow가 keystore secret을 복원하고 `bundleRelease` 실행
4. artifact `land-app-release-aab` 다운로드

## Play Console closed testing 업로드 절차

1. Google Play Console에서 새 앱 생성
2. `Closed testing` 트랙 생성
3. `app-release.aab` 업로드
4. 테스터 그룹 또는 이메일 목록 추가
5. 검토 항목 제출

## 별도 준비 필요

- 개인정보처리방침 URL
- 스토어 설명 문구
- 앱 아이콘 / feature graphic
- 휴대폰 스크린샷
- 테스트 계정 또는 검토용 안내 문구
