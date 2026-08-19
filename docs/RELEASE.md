# StudyNet Release Checklist

## Production Readiness

- Run `npm.cmd run validate`.
- Confirm `docs/DATA_SCHEMA.md` matches the current Firebase paths and AsyncStorage keys.
- Confirm `docs/FAILURE_CASES.md` covers critical user-visible failure flows.
- Confirm `docs/OPERATIONS.md` has current data hygiene and migration notes.
- Confirm README feature list and release checks match the current app behavior.

## Auth Configuration

- Firebase Auth email/password provider is enabled.
- Firebase Auth email verification template, sender name, and authorized domains are configured.
- Google provider is enabled and Android/Web client IDs match the build config.
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` match the Google OAuth clients for the Firebase project.
- Firebase Android app package name matches `expo.android.package` in `app.json`.
- Google Sign-In Android OAuth client has the correct package name and signing certificate SHA-1/SHA-256.
- Google native Sign-In is configured with `@react-native-google-signin/google-signin`, `google-services.json`, and the Firebase Web client ID.
- Google login/signup are tested in an Android development or installed build, not Expo Go.
- Kakao Developers OpenID Connect is enabled.
- Kakao redirect URI for the `studynet` scheme is registered.
- `EXPO_PUBLIC_KAKAO_REST_API_KEY` is configured in the build environment.
- Firebase Auth has an OpenID Connect provider with provider ID `oidc.kakao`.

## Firebase Deployment

- Confirm all `EXPO_PUBLIC_FIREBASE_*` values are configured in the build environment.
- Deploy Realtime Database rules to staging before production.
- Deploy Firebase Storage rules to staging before production.
- Confirm `firebase.json` points to `database.rules.json` and `storage.rules`.
- Smoke test signup/login, public group join, private code join, profile image upload, community write flows, and account deletion.
- Confirm public reads/writes are not accidentally enabled.
- If a visible public group cannot be joined, compare deployed rules with local `database.rules.json`.

## Device QA

- Test on a real Android device or development build.
- Confirm Android notification permission appears and the `StudyNet reminders` channel is created.
- Confirm profile image picker and upload work on Android.
- Confirm notification permission, scheduling, cancellation, and test notification flow.
- Confirm dark/light mode on auth, main, study, group, community, notification, and settings screens.
- Confirm auth screens still use solid backgrounds with no decorative circles or gradients.

## Google Play Prep

- Confirm app name, icon, adaptive icon, splash screen, and package name.
- Confirm Play Console app signing status before finalizing Firebase SHA fingerprints.
- Confirm privacy policy URL and support email are ready for the store listing.
- Confirm Data safety answers match Firebase Auth, Realtime Database, Storage, AsyncStorage, notifications, and image picker usage.

## Release Data Hygiene

- Remove test groups and community posts from production.
- Keep a test account separate from production demo data.
- Confirm support email in the contact screen is a real monitored address.
- Confirm privacy policy text matches the actual stored data listed in `docs/DATA_SCHEMA.md`.
- Confirm profile images uploaded during QA are acceptable to keep or remove them before production.

## Post-Release Checks

- New install signup/login works.
- Existing users keep local study sessions and settings after update.
- Firebase Auth, Realtime Database, and Storage error logs show no new release-blocking failures.
- Notification scheduling failures or permission denials are explained to users.
