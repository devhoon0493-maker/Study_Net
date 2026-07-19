# StudyNet

StudyNet은 React Native + Expo 기반의 공부 기록 앱입니다. 개인 공부 타이머, 목표 관리, 그룹 스터디룸, 커뮤니티 기능을 한 앱에서 다루는 것을 목표로 합니다.

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

Lint 실행:

```bash
npm run lint
```

TypeScript 검사:

```bash
npx tsc --noEmit
```

Windows PowerShell에서 실행 정책 때문에 `npm`이 막히면 `npm.cmd`를 사용합니다.

```bash
npm.cmd run lint
npx.cmd tsc --noEmit
```

## Firebase

현재 앱은 Firebase Auth와 Firebase Realtime Database를 사용합니다. Firebase 설정 파일은 아래 위치에 있습니다.

```text
utils/firebaseConfig.ts
```

Realtime Database 규칙 파일은 아래 위치에 있습니다.

```text
database.rules.json
```

배포 전에는 Firebase 프로젝트 설정, 인증 제공자, 데이터베이스 규칙, 클라이언트 키 노출 범위를 다시 점검해야 합니다.

## 아직 남은 작업

아래 기능들은 앱에 항목이 있거나 코드상 계획되어 있지만 아직 완전히 구현되지 않았습니다.

- Kakao 로그인
- Apple 로그인
- Kakao 회원가입
- Apple 회원가입
- 커뮤니티 게시글 북마크/저장
- 실제 푸시 알림 또는 로컬 알림
- 알림 시간 설정
- 문의하기 흐름
- 개인정보 처리방침 화면 또는 외부 링크
- 공개/비공개 프로필 설정의 완전한 반영
- 커뮤니티 모집글에서 특정 그룹방으로 직접 연결
- 자동화 테스트
- 배포 전 QA 체크리스트와 릴리즈 문서

## 개발 메모

- 공부 기록은 AsyncStorage에 로컬 저장됩니다.
- 계정, 프로필, 커뮤니티, 그룹 데이터는 Firebase를 사용합니다.
- 일부 사용자 표시 문자열과 이전 프로젝트 문서는 인코딩 정리가 필요할 수 있습니다.
- 소셜 인증 UI는 코드에 있지만 일부는 숨겨져 있거나 미완성입니다.
- 현재 상태는 완전한 제품 출시본보다는 MVP에 가깝습니다.

---

## English

StudyNet is a React Native + Expo study tracking app. It combines personal study timers, daily goals, group study rooms, and a lightweight study community.

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

Run lint:

```bash
npm run lint
```

Run TypeScript checking:

```bash
npx tsc --noEmit
```

On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`:

```bash
npm.cmd run lint
npx.cmd tsc --noEmit
```

## Firebase

The app currently uses Firebase Auth and Firebase Realtime Database. The Firebase configuration is in:

```text
utils/firebaseConfig.ts
```

The database rules file is:

```text
database.rules.json
```

Before production release, review the Firebase project configuration, auth providers, database rules, and any exposed client keys.

## Current Gaps

These features are visible in the app or planned in the codebase, but are not fully implemented yet:

- Kakao login
- Apple login
- Kakao signup
- Apple signup
- Community post bookmark/save
- Real push/local notifications
- Notification time settings
- Contact/support flow
- Privacy policy screen or external policy link
- Full enforcement of public/private profile settings
- Direct linking from community recruitment posts to a specific group room
- Automated tests
- Production QA checklist and release documentation

## Development Notes

- Study sessions are stored locally with AsyncStorage.
- Account/profile and community/group data use Firebase.
- Some user-facing strings and old project notes may need encoding cleanup.
- Social auth UI exists in code, but parts of it are currently hidden or incomplete.
- The app is closer to an MVP than a production-ready release.
