# StudyNet

StudyNet is a React Native + Expo study tracking app. It combines a personal study timer, local study records, daily goals, group study rooms, and a lightweight study community.

## Portfolio Summary

StudyNet is built as a product-style mobile app rather than a single timer screen. It covers authentication, email verification, local study records, Firebase-backed group and community data, notification settings, account cleanup, and release documentation.

- Role: planning, screen design, React Native implementation, Firebase integration, testing, and documentation
- Core flow: signup -> email verification -> subject selection -> study timer -> records/statistics -> group/community participation
- Quality signal: automated Jest coverage and release validation are included; latest full Jest result is recorded separately from release validation
- Operations docs: data schema, failure cases, QA, release, testing, and migration notes

Detailed portfolio material is in `docs/PORTFOLIO.md`, and the demo-video flow is in `docs/DEMO_SCRIPT.md`.

## Tech Stack

- React Native 0.81
- Expo 54
- Expo Router
- TypeScript
- Firebase Auth
- Firebase Realtime Database
- Firebase Storage
- AsyncStorage
- Ionicons / Expo Vector Icons

## Main Features

- Email/password signup, login, password reset, and email verification gate
- Google and Kakao auth integration paths with configuration guards
- Study timer with start, pause, resume, minimize, goal adjustment, and finish flow
- Local study history, daily/weekly goal tracking, D-Day goals, streaks, calendar, and statistics
- Subject selection with custom subject add/remove support
- Home dashboard with today progress, active session banner, recent sessions, and weekly stats
- Public/private group study rooms with invite-code entry
- Live group member presence and study-status sync through Firebase Realtime Database
- Group study privacy that hides subject and elapsed time while showing only the coarse studying state
- Public profile screen opened from group members and community comments; community post authors have a profile preview
- Firebase-backed community feed with posts, comments, cheers, images, bookmarks, notifications, and profile preview
- Recruitment posts that can open matching group rooms by invite code
- Profile/public profile, privacy, notification, storage, contact, password, reset-study-data, and account-deletion settings
- Light/dark theme support

## Project Structure

```text
app/
  index.tsx                 # Auth gate
  login.tsx                 # Login screen
  signup.tsx                # Signup screen
  verify-email.tsx          # Email verification gate
  password.tsx              # Password reset
  main.tsx                  # Home dashboard
  study.tsx                 # Study timer route
  subject-select.tsx        # Subject picker
  calendar.tsx              # Study calendar
  statistics.tsx            # Study statistics
  community.tsx             # Community feed
  Group.tsx                 # Group study rooms
  notifications.tsx         # Community notifications
  setting/                  # Settings screens

components/
  BottomNav.tsx             # Main bottom navigation

features/
  home/                     # Home dashboard components and utilities
  study/                    # Study timer component
  group/                    # Group room components, hooks, types, and presence helpers
  community/                # Community components, hooks, types, and utilities
  settings/                 # Settings components and hooks

utils/
  firebaseConfig.ts         # Firebase app setup
  studySessions.ts          # Study record storage helpers
  notificationScheduler.ts  # Local notification scheduling helpers
  accountCleanup.ts         # Account deletion cleanup helpers
  dday.ts                   # D-Day goal helpers

docs/
  DATA_SCHEMA.md            # Firebase and AsyncStorage schema reference
  FAILURE_CASES.md          # User-visible failure-flow coverage
  OPERATIONS.md             # Data hygiene and migration policy
  QA.md                     # Manual QA checklist
  RELEASE.md                # Release checklist
  TESTING.md                # Automated testing strategy
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

Run on web:

```bash
npm run web
```

On Windows PowerShell, use `npm.cmd` if script execution policy blocks `npm`.

## Validation

Run the full automated test suite:

```bash
npm.cmd test
```

Run the release validation checks:

```bash
npm.cmd run validate
```

Run the config validator:

```bash
npm.cmd run validate:config
```

Latest release validation on 2026-10-28:

- `npm.cmd run lint`: pass
- `npm.cmd run typecheck`: pass
- `npm.cmd run validate:config`: pass

The latest full Jest run was on 2026-10-28: 54 suites and 313 tests passed. Lint, TypeScript, and Firebase configuration validation also passed.

## Firebase Environment

Runtime Firebase client configuration is read from Expo public environment variables:

```bash
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your-project-default-rtdb.region.firebasedatabase.app
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
EXPO_PUBLIC_FIREBASE_APP_ID=your-firebase-app-id
```

Google native sign-in uses:

```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id.apps.googleusercontent.com
```

Kakao auth uses Expo AuthSession with Firebase Auth OIDC:

```bash
EXPO_PUBLIC_KAKAO_REST_API_KEY=your_kakao_rest_api_key
```

Before release, confirm Firebase Auth providers, Realtime Database rules, Storage rules, OAuth console settings, Android signing fingerprints, notification behavior on a real device or development build, and the Play Console privacy/data-safety material.

## Release References

- Firebase data contract: `docs/DATA_SCHEMA.md`
- Failure handling: `docs/FAILURE_CASES.md`
- Manual QA: `docs/QA.md`
- Release checklist: `docs/RELEASE.md`
- Testing strategy: `docs/TESTING.md`
