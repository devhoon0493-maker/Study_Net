# StudyNet Portfolio Case Study

## Summary

StudyNet is a React Native + Expo mobile app that connects personal study tracking with real-time group study and a lightweight study community. The project is organized as a product-ready portfolio case: it includes app flows, Firebase-backed data paths, local persistence, release checks, failure-case documentation, and automated tests.

## Problem

Many study timer apps stop at measuring elapsed time. StudyNet treats studying as a complete loop:

1. Start with account setup and email verification.
2. Pick or create a subject.
3. Run a focused study timer that survives navigation and app backgrounding.
4. Save the result into local study history.
5. Review progress through home, calendar, and statistics surfaces.
6. Join group study rooms and expose only the public study/profile state the user chooses.
7. Participate in a community feed with posts, comments, cheers, bookmarks, notifications, and recruitment links.
8. Manage goals, D-Day, notifications, privacy, storage, password, and account deletion from settings.

The portfolio goal is to show a working mobile product surface, not just isolated screens.

## Product Scope

Implemented user-facing areas:

- Email/password signup, login, password reset, and email verification gate.
- Google and Kakao authentication integration paths with clear configuration failure states.
- Study timer with start, pause, resume, minimize, restore, goal adjustment, finish, and short-session protection.
- Local study sessions saved through AsyncStorage.
- Home dashboard with today progress, active-session banner, recent sessions, and weekly statistics.
- Calendar and statistics screens backed by the same local study data.
- Subject selection with custom subject add/remove support.
- Public/private group study rooms with invite-code entry.
- Group member presence and public profile screens, with profile links from group members and community authors/comments.
- Group study-status privacy: when sharing is off, group members see only whether the user is studying; subject and start time are not written to room presence data.
- Community feed with post creation, image attachment, cheers, comments, bookmarks, notifications, deletion, and profile preview.
- Community recruitment posts that can route directly into matching group rooms by invite code.
- Settings for profile, public profile, privacy, notifications, goals, D-Day, storage status, contact, password change, reset-study-data, logout, and account deletion.

## Technical Design

### State and Storage

- Finished study sessions are stored locally with AsyncStorage for fast local review.
- Running sessions store `startEpoch`; elapsed time is recalculated from the current clock so navigation and background transitions do not lose time.
- Paused sessions store `savedSeconds`; time does not accidentally increase while paused.
- Firebase Auth owns authentication and verified email state.
- Native Firebase Auth uses AsyncStorage-backed persistence; web uses the platform Firebase Auth default.
- Firebase Realtime Database stores account profiles, public profiles, group rooms, invite codes, community posts, comments, cheers, and notification-related community activity.
- Firebase Storage stores profile avatar images.

### Firebase Rules Contract

The rules separate private and public data:

- `users/{uid}` is readable and writable only by its owner; public display data lives separately under `publicProfiles/{uid}`.
- `publicProfiles/{uid}` is readable by signed-in users and writable only by the owner.
- `rooms/{roomId}` uses owner-controlled room updates and member-controlled membership writes.
- `roomCodes/{code}` maps invite codes to rooms and is constrained by room ownership.
- `communityPosts`, `communityPostComments`, and `communityPostCheers` enforce author-owned writes and let post authors clean up related activity.
- `profileImages/{uid}/avatar.jpg` is writable only by the signed-in owner and limited to images under 2 MB.

The detailed contract is maintained in `docs/DATA_SCHEMA.md`.

## Reliability Work

- Shared Firebase/user-facing error messages live in `utils/errorMessages.ts`.
- Failure cases are documented in `docs/FAILURE_CASES.md`.
- Release and QA checklists split automated validation from real-device/provider checks.
- Account deletion cleanup covers user profile data, posts, cheers, comments, owned rooms, room-code mappings, memberships, and local keys.
- Notification behavior is isolated in scheduler utilities and documented for device QA.

## Testing

Current release validation on 2026-10-28:

- `npm.cmd run lint`: pass
- `npm.cmd run typecheck`: pass
- `npm.cmd run validate:config`: pass

The latest full Jest run was on 2026-10-28: 54 suites and 313 tests passed. Lint, TypeScript, and Firebase configuration validation also passed.

Coverage focus:

- Utility logic for Firebase config, dates, timers, notifications, email verification, privacy, errors, account cleanup, and study sessions.
- Auth and route smoke tests.
- Home/session context.
- Study flow screens.
- Calendar/statistics screens.
- Group hooks, actions, mapping logic, presence sync, and screen flows.
- Community hooks, actions, components, feed, comments, notifications, and screen flows.
- Settings hooks and screen flows.

Manual QA remains necessary for Google/Kakao provider setup, real Firebase deployment behavior, Android notifications, profile image upload, and Play Console release configuration.

## Demo Flow

A 60-90 second portfolio video should show:

1. Signup/login and verified entry.
2. Subject selection and study timer start.
3. Pause/resume/minimize/restore behavior.
4. Finished session reflected in home, calendar, and statistics.
5. Group room join or creation with member presence.
6. Community post, cheer/comment/bookmark, notification, and recruitment-to-group path.
7. Open a member's public profile from a group or community comment, and show group study privacy hiding subject and elapsed time.
8. Settings for goals, D-Day, notifications, privacy, storage, and account management.

The full script is in `docs/DEMO_SCRIPT.md`.

## What This Project Shows

- Expo Router and TypeScript app structure across many production-style screens.
- Clear split between local-first study records and Firebase-backed shared data.
- Handling for edge cases such as paused timers, short sessions, duplicate subjects, malformed dates, permission-denied Firebase writes, provider misconfiguration, and account deletion cleanup.
- Automated tests around user flows and data helpers rather than only static rendering.
- Documentation that supports release, QA, data schema review, failure handling, and portfolio presentation.
