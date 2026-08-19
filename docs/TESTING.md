# StudyNet Testing Strategy

StudyNet uses Jest with the Expo preset for automated tests.

## Current Status

- 49 test suites.
- 287 automated tests.
- `npm test`, `npm run test:coverage`, `npm run typecheck`, and `npm run validate:config` pass locally.
- Current Jest statement, branch, function, and line coverage are 100% across collected `features` and `utils` files.
- Jest enforces 100% global thresholds for statements, branches, functions, and lines.
- GitHub Actions runs `npm run validate` and `npm run test:coverage` on pushes to `main` and pull requests.

## Commands

- `npm test`: run all tests once.
- `npm run test:watch`: run tests in watch mode while developing.
- `npm run test:coverage`: run tests and generate a coverage report.
- `npm run validate:config`: validate JSON files, package-lock root dependencies, Firebase rules wiring/room-code/post-cleanup invariants, required `.env.example` keys, hardcoded client-key guards, and focused/skipped test guards.
- `npm run validate`: run lint, TypeScript, and config validation.

## Current Coverage Focus

- Utility logic that controls Firebase initialization, dates, timers, notification settings, email verification, and community notifications.
- Privacy, error-message, and study-session storage helpers.
- Account cleanup update generation, notification scheduling, and social-auth guard/error handling.
- Group and community live-data hooks for room selection, lobby/member stats, timestamps, and live study rooms.
- Community compose, bookmark, author profile, and post-target routing hooks.
- Community comments sheet, profile preview, and Firebase-backed feed hooks.
- Group creation draft, room subscription, initial invite-code join, and member profile hooks.
- Group presence syncing for local/authenticated members and joined-room updates.
- Community and group action hooks for writes, deletes, joins, room creation, and presence sync.
- Community and group mapping logic that transforms Firebase-style records into UI models.
- AsyncStorage-backed settings with mocked storage.
- Auth screen smoke tests for email login, email verification routing, signup, social-auth guard states, and navigation controls.
- Auxiliary auth and notification screen smoke tests for password reset, email verification actions, and notification-to-post navigation.
- Entry routing and main screen smoke tests for auth redirects, notification navigation, D-Day settings, and study start navigation.
- Study flow smoke tests for custom subject creation, study session entry, timer controls, goal modal, finish, and minimize actions.
- Record screen smoke tests for statistics aggregation and calendar month/date/session navigation.
- Settings screen smoke tests for overview actions, privacy policy rendering, and contact mail flow.
- Community screen smoke tests for feed rendering, compose submit, comments, likes, bookmarks, and group navigation.
- Group screen smoke tests for lobby rendering, code join, public-room join, and create-room submission.
- Firebase modules are mocked in Jest setup so tests stay deterministic and do not call external services.

## Manual QA Boundary

The following flows are intentionally kept in manual QA because they depend on device, provider, or Firebase console state:

- Google and Kakao OAuth provider login.
- Push notification delivery on a real Android device.
- Firebase Realtime Database and Storage rule deployment behavior.
- App-store style release checks and production signing fingerprints.

These flows are tracked in `docs/QA.md` and `docs/RELEASE.md`.
