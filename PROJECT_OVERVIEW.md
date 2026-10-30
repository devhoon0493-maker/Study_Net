# StudyNet Project Overview

## Goal

StudyNet is a cross-platform study management app built with React Native, Expo, TypeScript, AsyncStorage, and Firebase. The project demonstrates a complete mobile product flow: authentication, verified account entry, personal study tracking, goal management, group study rooms, community interaction, notifications, profile/privacy settings, account cleanup, automated tests, and release documentation.

## Core User Flow

1. A user signs up or logs in.
2. Email/password users verify their email before entering the main app.
3. The user selects a subject and starts a study session.
4. The timer can be paused, resumed, minimized, restored, and finished.
5. Finished sessions appear in recent activity, calendar, and statistics views.
6. The user can join or create study groups, sync study presence, and enter private rooms by code.
7. The community feed supports posts, images, comments, cheers, bookmarks, notifications, profile preview, and recruitment posts that link to groups.
8. Settings allow the user to manage profile/public profile, study goals, D-Day, notifications, privacy, storage, password, contact, reset-study-data, and account deletion.

## Implemented Areas

- Auth screens and Firebase Auth integration paths
- Email verification gate
- Google and Kakao auth configuration guards
- Home dashboard with today progress, recent sessions, weekly stats, and active session restore
- Study timer with persisted running/paused state
- Local study-session persistence through AsyncStorage
- Subject picker and custom subject storage
- Calendar and statistics screens
- Firebase-backed group rooms, invite codes, member profiles, and presence sync
- Group study privacy that exposes only a coarse studying state when detailed status sharing is off
- Firebase-backed community feed, comments, cheers, notifications, and profile preview
- Public profile screen linked from group members and community comments
- Profile image flow using Firebase Storage
- Privacy and public-profile settings
- Notification settings and scheduler helpers
- Account cleanup helper logic
- Firebase Realtime Database and Storage rules
- QA, release, testing, schema, failure-case, and demo documentation

## Current Quality Status

Latest release validation on 2026-10-28:

- `npm.cmd run lint`: pass
- `npm.cmd run typecheck`: pass
- `npm.cmd run validate:config`: pass

The latest full Jest run was on 2026-10-28: 54 test suites and 313 tests passed. Lint, TypeScript, and Firebase configuration validation also passed.

The automated tests cover utilities, Firebase config guards, auth screen flows, study timer flows, home session context, record screens, group hooks/actions, community hooks/actions/components, settings hooks/screens, notification scheduling, privacy settings, and account cleanup logic.

## Boundaries Still Requiring Real-Environment QA

These flows are intentionally kept as manual QA because they depend on Firebase console settings, provider settings, OS/device APIs, or build signing state:

- Google login/signup on an Android development or installed build
- Kakao OIDC login/signup after Kakao Developers and Firebase provider setup
- Firebase Realtime Database and Storage rule deployment behavior
- Android notification permission, channel creation, scheduled notification delivery, and cancellation
- Profile image upload in a real Firebase Storage project
- Play Console privacy policy, data safety, support email, and signing fingerprints

## Important Docs

- `README.md`: setup, features, validation, and release references
- `docs/PORTFOLIO.md`: portfolio case study
- `docs/DEMO_SCRIPT.md`: 60-90 second demo video structure
- `docs/TESTING.md`: automated testing strategy
- `docs/QA.md`: manual QA checklist
- `docs/RELEASE.md`: release checklist
- `docs/DATA_SCHEMA.md`: Firebase and AsyncStorage data contract
- `docs/FAILURE_CASES.md`: user-visible failure handling
- `docs/OPERATIONS.md`: data hygiene and migration policy
