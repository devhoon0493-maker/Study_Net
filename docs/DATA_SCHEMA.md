# StudyNet Data Schema

This document is the operating reference for Firebase Realtime Database, Firebase Storage, local AsyncStorage keys, and the rules contract. Keep it updated whenever a screen changes stored fields or write paths.

## Firebase Realtime Database

Rules file: `database.rules.json`

All Firebase database paths require `auth != null` for reads unless noted otherwise. Client-side Firebase config is public by design, so database and storage rules are the actual security boundary.

### `users/{uid}`

Purpose: account profile, public profile, and privacy flags.

Writer:
- Only the signed-in user whose `auth.uid === uid`.

Required fields:
- `uid`: string, must match the path uid.
- `name`: string, 1-40 chars.
- `email`: string, max 120 chars.

Optional fields:
- `image`: null or string. Current profile uploads store a Firebase Storage download URL. Legacy data URLs may still exist and rules allow strings up to 700000 chars.
- `userType`: string, max 40 chars.
- `bio`: string, max 80 chars.
- `studyStatusPublic`: boolean.
- `communityActivityPublic`: boolean.
- `privacyPolicyAgreedAt`: number timestamp set during signup.
- `color`: string, max 24 chars.
- `createdAt`: number.
- `updatedAt`: number.

Used by:
- Login/signup profile creation.
- Email verification state lives in Firebase Auth as `emailVerified`, not in Realtime Database.
- Settings profile and public profile screens.
- Group member profile sync.
- Community author/profile preview and notification display.

### `rooms/{roomId}`

Purpose: study group rooms and live member presence.

Writer:
- Room create/update/delete: room owner only.
- Member path `rooms/{roomId}/members/{uid}`: the signed-in user with the same uid.

Required for new rooms:
- `ownerId`: string, must be creator uid.
- `name`: string, 2-40 chars.
- `subjects`: string, 1-80 chars.
- `emoji`: string, 1-16 chars.
- `color`: string, max 24 chars.
- `max`: number, 2-20.
- `code`: string, exactly 6 chars.
- `visibility`: `"public"` or `"private"`.
- `createdAt`: number.

Optional room fields:
- `mode`: string, max 40 chars.

Legacy note:
- Existing rooms may not have every required modern field. Rules allow updates to existing room records without revalidating the top-level required-field set, so older visible rooms can still accept member joins.

### `rooms/{roomId}/members/{uid}`

Purpose: per-room member identity, study status, and presence.

Writer:
- Only that member: `auth.uid === uid`.

Required fields when present:
- `name`: string, 1-40 chars.
- `color`: string, max 24 chars.
- `online`: boolean.
- `lastSeenAt`: number.
- `joinedAt`: number.

Optional fields:
- `image`: null or string. Usually copied from the user's profile image URL.
- `userType`: string, max 40 chars.
- `bio`: string, max 80 chars.
- `studyStatusPublic`: boolean.
- `speaking`: boolean.
- `status`: string, max 40 chars.
- `studyStartEpoch`: null or number.
- `goalSeconds`: number, 60-86400.

Operational note:
- `createdAt`, `lastSeenAt`, `joinedAt`, and `studyStartEpoch` allow a small future skew of 5 minutes to tolerate device/server clock drift.

### `roomCodes/{code}`

Purpose: invite-code lookup from a six-character code to a room id.

Writer:
- Only the owner of the referenced room can create, update, or delete a code map.
- Any signed-in user can delete a broken code map when the referenced room no longer exists.

Value:
- string room id.

Used by:
- Private code join.
- Community recruitment posts that include `groupCode`.
- Room deletion cleanup.

### `communityPosts/{postId}`

Purpose: community feed posts.

Writer:
- Create: signed-in author whose `authorId === auth.uid`.
- Update/delete: original author only.

Required fields:
- `authorId`: string, locked to path author.
- `author`: string, 1-40 chars.
- `category`: string, 1-30 chars.
- `title`: string, 2-80 chars.
- `body`: string, 4-2000 chars.
- `createdAt`: number.

Optional fields:
- `authorType`: string, max 40 chars.
- `authorImage`: null or string, usually a profile image URL.
- `authorBio`: string, max 80 chars.
- `groupCode`: null or string, exactly 6 chars.
- `image`: null or string, max 700000 chars for community post image data.
- `cheerCount`: number >= 0.
- `commentCount`: number >= 0.

### `communityPostCheers/{postId}/{uid}`

Purpose: post likes/cheers.

Writer:
- The cheering user can write/remove their cheer.
- The post author can remove cheers on their own post during cleanup/moderation.
- The post author can delete the whole `communityPostCheers/{postId}` subtree when deleting the post.

Accepted value:
- `true`, or object with:
- `authorId`: string, must equal uid.
- `createdAt`: number.

### `communityPostComments/{postId}/{commentId}`

Purpose: post comments.

Writer:
- Create/update: comment author only.
- Delete: comment author or post author.
- The post author can delete the whole `communityPostComments/{postId}` subtree when deleting the post.

Required fields:
- `authorId`: string.
- `author`: string, 1-40 chars.
- `body`: string, 1-1000 chars.
- `createdAt`: number.

Optional fields:
- `authorImage`: null or string, usually a profile image URL.

## Firebase Storage

Rules file: `storage.rules`

### `profileImages/{uid}/avatar.jpg`

Purpose: profile avatar image storage.

Rules:
- Authenticated users can read profile images.
- Only the signed-in owner can upload to their own `uid` path.
- Upload size must be under 2 MB.
- Upload content type must match `image/.*`.

Database link:
- The public download URL is stored in `users/{uid}.image` and copied to related group/community author fields.

## AsyncStorage Keys

Local storage is not trusted for security. It is app state/cache only.

Profile and account:
- `userProfile`: local cached profile.
- `group_member_profile`: cached group member identity.

Study:
- `study_sessions`: finished local study sessions.
- `active_session`: current timer session. Running sessions store `subject`, `startEpoch`, `goalSeconds`, and `running: true`; paused sessions store `subject`, `savedSeconds`, `goalSeconds`, and `running: false`.
- `daily_goal_seconds`: daily goal in seconds.
- `weekly_goal_seconds`: weekly goal in seconds.
- `streak_goal_days`: streak goal in days.
- `primary_dday_goal`: representative D-Day goal.

Settings:
- `studynet_theme_mode`: `"light"` or `"dark"`.
- `settings_notifications_enabled`: legacy/summary notification enabled value.
- `settings_notification_schedule`: notification schedule settings JSON.
- `settings_notification_scheduled_ids`: scheduled local notification ids.
- `settings_study_status_public`: study status privacy flag.
- `settings_community_activity_public`: community activity privacy flag.

Community:
- `community_notifications_read_at:{uid}`: notification read timestamp.
- `community_bookmarked_posts:{uid}`: saved community post ids.

Subjects:
- `custom_subjects_{userType or default}`: custom subject list for the selected user type, or the default-device bucket when no user type is selected.

## Rules Deployment Checklist

1. Validate locally:

```bash
npm.cmd run validate
```

2. Deploy to staging first when available:

```bash
firebase deploy --only database,storage
```

3. Smoke test after deploy:
- Signup/login.
- Public group create and join from another account.
- Private room code join.
- Profile image upload.
- Community post create, cheer, comment, delete.
- Account deletion cleanup.

4. If public rooms are visible but cannot be joined:
- Confirm the deployed rules match local `database.rules.json`.
- Check whether old room records are missing modern fields like `visibility`.
- Check device/server clock skew if timestamp validation fails.
