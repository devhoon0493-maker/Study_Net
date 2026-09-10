# StudyNet Demo Script

This script is for a 60-90 second portfolio demo video. The goal is to show a realistic user flow instead of narrating every feature.

## Before Recording

- Prepare one test account.
- Connect the app to a Firebase development or staging project.
- Prepare one public group and one private group with an invite code.
- Prepare the community feed with one regular post and one recruitment post.
- Allow notification permission if the recording includes notification behavior.
- Replace personal email, name, and profile image data with demo-safe data.

## Recommended 60-90 Second Flow

### 0-10s: Entry

Show:

- Login/signup or auth gate.
- Home dashboard.

Talk track:

```text
StudyNet is a React Native and Expo study app that combines a personal timer, local study records, group study rooms, and a community feed in one product flow.
```

### 10-25s: Study Session

Show:

- Subject selection.
- Timer start.
- Pause and resume.
- Minimize to home.
- Active session banner restore.

Talk track:

```text
The timer stores running sessions by start time and paused sessions by saved seconds, so elapsed time survives navigation and app backgrounding without counting time while paused.
```

### 25-38s: Records and Progress

Show:

- Finish the session.
- Home recent activity.
- Calendar.
- Statistics.

Talk track:

```text
Finished sessions are saved locally and reused across home, calendar, and statistics views so the user sees the same study history in different contexts.
```

### 38-55s: Group Study

Show:

- Group lobby.
- Join a public room or enter a private invite code.
- Group room member cards and study status.

Talk track:

```text
Groups use Firebase Realtime Database to sync membership, presence, public profile details, and study status. Public rooms and invite-code rooms are handled as separate flows.
```

### 55-72s: Community

Show:

- Community feed.
- Create or open a post.
- Cheer, comment, bookmark.
- Open a recruitment post and enter the linked group.

Talk track:

```text
The community feed supports posts, images, comments, cheers, bookmarks, notifications, and recruitment posts that connect directly to group rooms by invite code.
```

### 72-90s: Settings and Quality

Show:

- Goal or D-Day settings.
- Notification settings.
- Privacy or storage status.
- Test result or README validation section.

Talk track:

```text
The settings flow covers goals, notifications, privacy, storage status, password and account management. The project currently passes lint, TypeScript, config validation, and 293 Jest tests across 50 suites.
```

## Screenshot Checklist

- Login or signup
- Email verification
- Home dashboard
- Subject picker
- Study timer running
- Study timer paused
- Active session banner
- Calendar
- Statistics
- Group lobby
- Group room
- Community feed
- Compose/comment UI
- Notifications
- Settings main
- Goal/D-Day settings
- Privacy/storage settings

## Short Submission Description

```text
StudyNet is a React Native + Expo study management app with a personal study timer, local records/statistics, Firebase-backed group rooms, a community feed, notifications, profile/privacy settings, and account cleanup flows. It is structured as a product-style portfolio project with automated tests, Firebase rules, QA docs, release docs, and data-schema documentation.
```

## Technical Emphasis Description

```text
StudyNet uses Expo Router and TypeScript across a multi-screen mobile app. Local study records are stored with AsyncStorage, while shared account, group, community, and profile-image data are separated into Firebase Auth, Realtime Database, and Storage. The project currently passes lint, TypeScript, config validation, and 293 Jest tests across 50 suites.
```
