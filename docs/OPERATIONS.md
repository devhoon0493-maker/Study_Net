# StudyNet Operations Guide

This guide covers data hygiene, migration policy, and release operations.

## Environment Strategy

Recommended Firebase projects:
- `studynet-dev`: local development and disposable data.
- `studynet-staging`: release candidate testing with production-like rules.
- `studynet-prod`: real users only.

Minimum rule:
- Never test destructive account deletion or rule experiments directly on production unless the data is disposable.

## Data Classification

### User-owned production data

Treat as user data:
- `users/{uid}`
- `communityPosts` authored by the user.
- `communityPostCheers/{postId}/{uid}`
- `communityPostComments` authored by the user.
- `rooms/{roomId}/members/{uid}`
- `rooms/{roomId}` owned by the user.

Deletion:
- Must be removed or anonymized when the user deletes the account.
- Current implementation removes user profile, owned posts, own cheers/comments, owned rooms/codes, and memberships.

### Ephemeral operational data

Can be cleaned when stale:
- Empty rooms.
- Rooms with no online members and old `lastSeenAt`.
- Broken `roomCodes` entries pointing to missing rooms.
- Test community posts.

Recommended cleanup before release:
- Remove test groups.
- Remove test community posts/comments/cheers.
- Remove broken room code mappings.

### Local-only data

Stored on device:
- Study sessions.
- Active study session.
- Goals.
- D-Day.
- Notification settings and scheduled ids.
- Bookmarks and notification read timestamp.

Migration:
- Local keys should remain backward compatible where possible.
- When renaming keys, read old key first, write new key, then remove old key only after successful migration.

## Schema Migration Policy

Realtime Database has no automatic migration layer in this app. Use one of these approaches:

### Backward-compatible app defaults

Use when:
- Adding optional fields.
- Old data can still work with sensible defaults.

Example:
- Old rooms without `visibility` are interpreted as public by the app.

### Rules compatibility

Use when:
- Existing records are valid enough to keep, but new records should use stricter fields.

Example:
- `rooms/{roomId}` rules require modern fields only for new records.
- Existing room updates are allowed without revalidating the complete top-level field set.

### Manual migration

Use when:
- Old data would cause incorrect behavior.
- Missing fields cannot be safely defaulted.

Process:
1. Export affected data.
2. Run a migration script against staging.
3. Smoke test the app.
4. Back up production.
5. Run migration during a low-traffic window.

Do not run ad hoc destructive updates from the app client.

## Release Data Hygiene Checklist

Before production release:
- Confirm `database.rules.json` is deployed.
- Confirm `docs/DATA_SCHEMA.md` matches code and rules.
- Confirm `docs/FAILURE_CASES.md` covers critical errors.
- Remove test rooms and room codes.
- Remove test community posts/comments/cheers.
- Verify account deletion with a test account.
- Verify no Firebase path has broad public write access.
- Verify support email and privacy policy text.

## Known Legacy Compatibility

### Rooms without `visibility`

Symptom:
- Room appears in public list but joining fails if rules require modern fields on update.

Current mitigation:
- App defaults missing `visibility` to `public`.
- Rules require full room fields only on new room creation, not updates to existing rooms.

Follow-up:
- Prefer a one-time migration to add `visibility: "public"` to legacy rooms.

### Broken `roomCodes`

Symptom:
- Code exists but referenced room does not.
- Room exists but its invite code was not mapped.

Current mitigation:
- Code join flow deletes broken code entries when encountered.
- Room creation rolls back the new room if invite-code mapping fails.

Follow-up:
- Periodically scan and remove broken mappings from an admin script.
