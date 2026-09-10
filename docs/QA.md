# StudyNet QA Checklist

Use this checklist before a release candidate. Run automated validation first, then test the user-visible flows on a real device or development build.

## Automated Checks

- Run `npm.cmd run validate`.
- Confirm config validation covers required Firebase, Google, and Kakao public environment variables.
- Confirm `database.rules.json`, `storage.rules`, and `firebase.json` are the intended files for Firebase deployment.
- Confirm `docs/DATA_SCHEMA.md`, `docs/FAILURE_CASES.md`, and `docs/RELEASE.md` match the current app behavior.

## Auth

- Email signup creates a Firebase Auth account and `users/{uid}` profile.
- Email signup sends a Firebase verification email and blocks main entry until the email is verified.
- Unverified email/password users are redirected to the verification screen on app start and login.
- Signup requires privacy policy agreement and stores `privacyPolicyAgreedAt`.
- Email login, logout, and password reset work.
- Google login/signup work with the configured Firebase client IDs.
- Google login/signup use the native Google Sign-In SDK and return an ID token accepted by Firebase Auth.
- Google login/signup are tested on an Android development or installed build, not Expo Go.
- Apple login/signup work on a supported iOS build with the Firebase Apple provider enabled.
- Kakao login/signup work only after Kakao OpenID Connect and Firebase OIDC provider `oidc.kakao` are configured.
- If `EXPO_PUBLIC_KAKAO_REST_API_KEY` or Kakao OIDC setup is missing, the app shows a configuration error instead of silently failing.

## Study

- Start, pause, resume, minimize, and finish study sessions.
- Finished sessions appear in recent history and calendar/statistics views.
- Subject selection and custom subject add/remove persist after app restart.
- Reset study data removes local sessions, goals, and group study state from settings.

## Groups

- Create a public group and join it from a different account.
- Create a private group and join it by invite code.
- Public groups appear in the lobby; private groups do not appear in the public list.
- Community recruitment posts with invite codes can enter the matching group.
- Member presence, study status, and profile previews update correctly.
- Leaving as a member removes only that membership.
- Leaving as owner deletes the owned room and invite-code mapping.

## Community

- Create posts with and without images.
- Cheer, uncheer, comment, and delete own posts/comments.
- Saved posts persist locally and update the saved state label.
- Notification list shows cheers/comments on the user's posts.
- Tapping a notification opens the related post and shows the original post plus the relevant comment context.
- Account deletion removes own posts, comments, cheers, and group memberships.

## Settings

- Profile edit saves name/type/bio and uploads profile image to Firebase Storage.
- Public profile, study status visibility, and community activity visibility persist.
- D-Day and study goals persist after app restart.
- Notification enablement, reminder time, repeat days, and scheduled IDs persist.
- Storage status screen shows local storage, Firebase storage, notification permission, and scheduled notification status.
- Contact screen opens a mail client or shows a no-mail-app message.
- Privacy policy screen opens and scrolls normally.
- Change password works for email/password accounts and handles provider accounts clearly.
- Account deletion cleans up Firebase and local data.

## Theme QA

- Toggle light/dark mode and inspect login, signup, password reset, home, study, calendar, statistics, community, notifications, groups, and all settings screens.
- Confirm text, icons, dividers, disabled controls, placeholders, empty states, modals, and error messages remain readable.
- Confirm auth screens use a plain solid background with no decorative circles or gradients.

## Notification Device QA

- Test on a development or production build, not only Expo Go.
- Android creates the `StudyNet reminders` notification channel.
- Test notification arrives after the expected delay.
- Daily, weekday, and selected-day schedules produce the expected scheduled notification count.
- Turning notifications off cancels existing scheduled notifications.
- Foreground, background, and terminated app states show acceptable notification behavior.

## Firebase Rules

- Unauthenticated users cannot read or write account, group, or community data.
- Only post authors can update/delete their posts.
- Comment authors can update/delete their comments; post authors can delete comments on their own posts.
- Only room owners can update/delete rooms and valid invite-code mappings.
- Signed-in users can delete invite-code mappings whose referenced room no longer exists.
- Users can only write their own room membership profile.
- Only authenticated users can read profile images.
- Users can only upload their own profile image under `profileImages/{uid}/avatar.jpg`.
