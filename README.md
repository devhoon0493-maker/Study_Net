# StudyNet

StudyNet은 React Native + Expo 기반의 공부 기록 앱입니다. 개인 공부 타이머, 목표 관리, 그룹 스터디룸, 커뮤니티 기능을 한 앱에서 다루는 것을 목표로 합니다.

## 포트폴리오 요약

StudyNet은 개인 학습 기록과 실시간 그룹 스터디를 연결한 모바일 앱 프로젝트입니다. 단순 타이머 앱에서 끝내지 않고 인증, 로컬 기록, Firebase 기반 커뮤니티/그룹 데이터, 알림 설정, 계정 삭제 정리, 릴리즈 체크 문서까지 제품 단위로 구성했습니다.

- 역할: 기획, 화면 설계, React Native 구현, Firebase 연동, 테스트/문서화
- 핵심 사용자 흐름: 회원가입 -> 과목 선택 -> 공부 타이머 실행 -> 기록/통계 확인 -> 그룹/커뮤니티 참여
- 품질 지표: 49개 Jest 테스트 스위트, 287개 자동화 테스트, 수집 대상 `features`/`utils` 100% 커버리지
- 운영 문서: 데이터 스키마, 실패 케이스, QA, 릴리즈, 운영/마이그레이션 문서화

자세한 케이스 스터디는 `docs/PORTFOLIO.md`, 시연 영상 구성은 `docs/DEMO_SCRIPT.md`에 정리되어 있습니다.

## 기술 스택

- React Native 0.81
- Expo 54
- Expo Router
- TypeScript
- Firebase Auth
- Firebase Realtime Database
- AsyncStorage
- Ionicons / Expo Vector Icons

## 주요 기능

- 이메일/비밀번호 로그인 및 회원가입
- Firebase Auth 기반 Google 인증 흐름
- 일시정지, 재개, 최소화, 종료가 가능한 공부 타이머
- 일일 공부 목표 관리
- 로컬 공부 기록 저장
- 오늘의 진행률, 연속 공부일, 최근 기록, 주간 통계를 보여주는 홈 대시보드
- 날짜별 공부 기록을 확인하는 캘린더
- 과목 선택 및 사용자 과목 추가/삭제
- 공개/비공개 그룹 스터디룸
- 초대 코드 기반 그룹 입장
- 그룹 멤버 실시간 접속 상태
- Firebase Realtime Database 기반 커뮤니티 피드
- 이미지 첨부가 가능한 커뮤니티 글 작성
- 커뮤니티 모집글의 초대 코드 기반 그룹 직접 입장
- 댓글, 응원, 글 삭제, 프로필 미리보기
- 프로필 수정 및 공개 한줄 소개
- D-Day 및 공부 목표 설정
- 다크 모드 전환

## 프로젝트 구조

```text
app/
  index.tsx                 # 인증 상태 확인
  login.tsx                 # 로그인 화면
  signup.tsx                # 회원가입 화면
  password.tsx              # 비밀번호 재설정
  main.tsx                  # 홈 대시보드
  study.tsx                 # 공부 타이머 라우트
  subject-select.tsx        # 과목 선택
  calendar.tsx              # 공부 캘린더
  statistics.tsx            # 공부 통계
  community.tsx             # 커뮤니티 피드
  Group.tsx                 # 그룹 스터디룸
  setting/                  # 설정 화면

components/
  BottomNav.tsx             # 하단 네비게이션

features/
  home/                     # 홈 화면 컴포넌트와 유틸
  study/                    # 공부 타이머 컴포넌트
  group/                    # 그룹 컴포넌트, 타입, 접속 상태 헬퍼
  community/                # 커뮤니티 컴포넌트, 타입, 유틸

utils/
  firebaseConfig.ts         # Firebase 앱 설정
  studySessions.ts          # 공부 기록 저장 헬퍼
  dday.ts                   # D-Day 목표 헬퍼

docs/
  QA.md                     # 기능별 QA 체크리스트
  RELEASE.md                # 배포 전후 체크리스트
  DATA_SCHEMA.md            # Firebase와 AsyncStorage 데이터 구조
  OPERATIONS.md             # 데이터 정리와 마이그레이션 운영 정책
  FAILURE_CASES.md          # 사용자에게 보이는 실패 흐름 점검
  PORTFOLIO.md              # 포트폴리오 케이스 스터디
  DEMO_SCRIPT.md            # 포트폴리오 시연 영상 구성
```

## 실행 방법

의존성 설치:

```bash
npm install
```

Expo 개발 서버 실행:

```bash
npm run start
```

Android 실행:

```bash
npm run android
```

iOS 실행:

```bash
npm run ios
```

Web 실행:

```bash
npm run web
```

## 검증

전체 검증:

```bash
npm run validate
```

Lint 실행:

```bash
npm run lint
```

TypeScript 검사:

```bash
npm run typecheck
```

Windows PowerShell에서 실행 정책 때문에 `npm`이 막히면 `npm.cmd`를 사용합니다.

```bash
npm.cmd run validate
```

## Firebase

현재 앱은 Firebase Auth, Firebase Realtime Database, Firebase Storage를 사용합니다. 런타임 Firebase 클라이언트 설정은 Expo public 환경변수에서 읽습니다.

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.region.firebasedatabase.app
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id
```

필수 Firebase 환경변수가 비어 있으면 앱 초기화 시 누락된 변수명을 포함한 에러가 발생합니다.

Realtime Database 규칙 파일은 아래 위치에 있습니다.

```text
database.rules.json
```

배포 전에는 Firebase 프로젝트 설정, 인증 제공자, 데이터베이스 규칙, 클라이언트 키 노출 범위를 다시 점검해야 합니다.

Google 네이티브 로그인은 Firebase Web client ID를 사용합니다.

```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id.apps.googleusercontent.com
```

Kakao 인증은 Expo AuthSession과 Firebase Auth OIDC를 사용합니다. 실행 전에 Kakao REST API 키를 설정해야 합니다.

```bash
EXPO_PUBLIC_KAKAO_REST_API_KEY=your_kakao_rest_api_key
```

Kakao/Firebase 콘솔 설정:

- Kakao Developers에서 OpenID Connect를 활성화하고 `studynet` 스킴의 Expo redirect URI를 등록합니다.
- Firebase Auth에 OpenID Connect 제공자를 추가하고 provider ID를 `oidc.kakao`로 설정합니다.
- Kakao가 `id_token`을 반환해야 Firebase 로그인이 완료됩니다.

런타임 데이터 구조는 아래 문서에 정리되어 있습니다.

```text
docs/DATA_SCHEMA.md
```

릴리즈 운영과 마이그레이션 정책은 아래 문서에 정리되어 있습니다.

```text
docs/OPERATIONS.md
```

## 릴리즈 전 확인

- 실제 Firebase 프로젝트에서 Auth 제공자, Realtime Database, Storage 규칙 확인
- Google/Kakao provider 콘솔 설정 확인
- Android 실기기 또는 개발 빌드에서 알림 예약 확인
- `docs/QA.md`, `docs/RELEASE.md`, `docs/FAILURE_CASES.md` 체크리스트 확인

## 개발 메모

- 공부 기록은 AsyncStorage에 로컬 저장됩니다.
- 계정, 프로필, 커뮤니티, 그룹 데이터는 Firebase를 사용합니다.
- 커뮤니티 게시글 저장은 현재 기기별 로컬 북마크로 동작합니다.
- 알림 QA, 실패 케이스, 릴리즈 점검은 `docs/QA.md`, `docs/FAILURE_CASES.md`, `docs/RELEASE.md`를 기준으로 진행합니다.
- 외부 provider 기능은 로컬 테스트와 별도로 실제 콘솔/기기 설정 검증이 필요합니다.

---

## English

StudyNet is a React Native + Expo study tracking app. It combines personal study timers, daily goals, group study rooms, and a lightweight study community.

## Portfolio Summary

StudyNet is a mobile app project that connects personal study tracking with real-time group study. It is packaged beyond a simple timer app with authentication, local study records, Firebase-backed group/community data, notification settings, account-deletion cleanup, and release documentation.

- Role: planning, screen design, React Native implementation, Firebase integration, testing, and documentation
- Core flow: signup -> subject selection -> study timer -> records/statistics -> group/community participation
- Quality signal: 49 Jest test suites, 287 automated tests, and 100% collected coverage for `features` and `utils`
- Operations docs: data schema, failure cases, QA, release, and migration policy

The detailed case study is documented in `docs/PORTFOLIO.md`, and the demo-video flow is in `docs/DEMO_SCRIPT.md`.

## Tech Stack

- React Native 0.81
- Expo 54
- Expo Router
- TypeScript
- Firebase Auth
- Firebase Realtime Database
- AsyncStorage
- Ionicons / Expo Vector Icons

## Main Features

- Email/password login and signup
- Google auth flow scaffolded with Firebase Auth
- Study timer with pause, resume, minimize, and finish flow
- Daily study goal tracking
- Study session history saved locally
- Home dashboard with today progress, streak, recent sessions, and weekly stats
- Calendar view for study records
- Subject selection and custom subject management
- Group study rooms with public/private room support
- Invite code based group entry
- Live group member presence
- Community feed backed by Firebase Realtime Database
- Community post creation with image attachment
- Direct group entry from community recruitment posts with invite codes
- Comments, cheers, post deletion, and profile preview
- Profile editing and public bio
- D-Day and study goal settings
- Dark mode toggle

## Project Structure

```text
app/
  index.tsx                 # Auth gate
  login.tsx                 # Login screen
  signup.tsx                # Signup screen
  password.tsx              # Password reset
  main.tsx                  # Home dashboard
  study.tsx                 # Study timer route
  subject-select.tsx        # Subject picker
  calendar.tsx              # Study calendar
  statistics.tsx            # Study statistics
  community.tsx             # Community feed
  Group.tsx                 # Group study rooms
  setting/                  # Settings screens

components/
  BottomNav.tsx             # Main bottom navigation

features/
  home/                     # Home dashboard components and utilities
  study/                    # Study timer component
  group/                    # Group room components, types, presence helpers
  community/                # Community components, types, utilities

utils/
  firebaseConfig.ts         # Firebase app setup
  studySessions.ts          # Study record storage helpers
  dday.ts                   # D-Day goal helpers

docs/
  QA.md                     # Feature QA checklist
  RELEASE.md                # Release checklist
  DATA_SCHEMA.md            # Firebase and AsyncStorage schema reference
  OPERATIONS.md             # Data hygiene and migration policy
  FAILURE_CASES.md          # User-visible failure-flow coverage
  PORTFOLIO.md              # Portfolio case study
  DEMO_SCRIPT.md            # Portfolio demo-video script
```

## Getting Started

Install dependencies:

```bash
npm install
```

Start the Expo development server:

```bash
npm run start
```

Run on Android:

```bash
npm run android
```

Run on iOS:

```bash
npm run ios
```

Run on web:

```bash
npm run web
```

## Validation

Run the full validation suite:

```bash
npm run validate
```

Run lint:

```bash
npm run lint
```

Run TypeScript checking:

```bash
npm run typecheck
```

On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`:

```bash
npm.cmd run validate
```

## Firebase

The app currently uses Firebase Auth, Firebase Realtime Database, and Firebase Storage. Runtime Firebase client configuration is read from Expo public environment variables:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.region.firebasedatabase.app
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id
```

The app fails fast during initialization when a required Firebase environment variable is missing or blank.

The database rules file is:

```text
database.rules.json
```

Google native sign-in uses the Firebase Web client ID:

```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id.apps.googleusercontent.com
```

Kakao auth uses Expo AuthSession with Firebase Auth OIDC. Set the Kakao REST API key before running the app:

```bash
EXPO_PUBLIC_KAKAO_REST_API_KEY=your_kakao_rest_api_key
```

Kakao/Firebase console setup required:

- Kakao Developers: enable OpenID Connect and add the Expo redirect URI for the `studynet` scheme.
- Firebase Auth: add an OpenID Connect provider with provider ID `oidc.kakao`.
- The app expects Kakao to return an `id_token`; without OIDC enabled, Kakao sign-in will show a configuration error.

The runtime data contract is documented in:

```text
docs/DATA_SCHEMA.md
```

Release operations and migration policy are documented in:

```text
docs/OPERATIONS.md
```

Before production release, review the Firebase project configuration, auth providers, database rules, and any exposed client keys.

## Release Checks

- Confirm Firebase Auth providers, Realtime Database rules, and Storage rules in the real project.
- Confirm Google/Kakao provider console configuration.
- Confirm Android notification scheduling on a real device or development build.
- Review `docs/QA.md`, `docs/RELEASE.md`, and `docs/FAILURE_CASES.md`.

## Development Notes

- Study sessions are stored locally with AsyncStorage.
- Account/profile and community/group data use Firebase.
- Community post saving currently works as device-local bookmarks.
- Notification QA, failure cases, and release checks are tracked in `docs/QA.md`, `docs/FAILURE_CASES.md`, and `docs/RELEASE.md`.
- External provider features need real console/device validation in addition to local tests.
