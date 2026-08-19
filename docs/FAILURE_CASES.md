# StudyNet Failure Cases

This document tracks user-visible failure handling for release readiness.

## Firebase Writes

Shared helper:
- `utils/errorMessages.ts`

Current shared handling:
- Permission denied: tell the user the action is blocked and remind developers to verify deployed Firebase rules.
- Network failure: ask the user to check connection and retry.
- Offline write attempt: tell the user saving is unavailable offline.

Critical flows to keep covered:
- Email verification send/resend and verified-state check.
- Public group join.
- Private code join.
- Group creation.
- Group leave/delete.
- Community post create/delete.
- Community cheer/comment create/delete.
- Profile/public profile save.
- Profile image upload.
- Account deletion cleanup.

## Auth

Known risks:
- Email verification delivery can be delayed or land in spam.
- Kakao login requires both a Kakao REST API key and external console setup.
- Kakao must return `id_token`; Firebase login will fail if Kakao OpenID Connect is not enabled.

Expected handling:
- Unverified email/password users cannot enter the main app until `emailVerified` is true.
- Verification resend failure shows a visible retry message.
- Missing Kakao runtime key shows a configuration error.
- Kakao prompt cancellation does not create a partial account.
- Kakao/Firebase provider errors show a visible auth failure message.

## Group Rooms

Known risk:
- Old room records can be visible but miss modern fields such as `visibility`.

Mitigation:
- `database.rules.json` allows existing room records to be updated without revalidating the complete top-level required-field set.
- New rooms must still include all required fields.

Manual QA:
- Create a public room and join from a different account.
- Join a private room by code.
- Join a legacy public room created before the current schema.
- Leave as member.
- Leave as owner and confirm room/code deletion.

## Notifications

Known risks:
- Expo Go may not support the same notification behavior as a dev or production build.
- OS notification permission may be denied.
- Scheduled notification APIs may be unavailable.

Expected handling:
- Permission denied shows a permission-specific alert.
- API unavailable shows an unavailable/failure alert.
- Test notification should only be considered valid on an appropriate device/build.

## Images

Known risks:
- Local image picker or file read can fail.
- Profile image upload can fail if Firebase Storage rules are not deployed.
- Profile image upload is limited to images under 2 MB.
- Community post images are still stored as database strings and can exceed rule limits.

Expected handling:
- Profile image read/upload errors show a profile-specific alert.
- Profile image download URLs are saved to `users/{uid}.image` only after upload succeeds.
- Community post images are validated by database rules with max string length `700000`.

## Account Deletion

Expected cleanup:
- `users/{uid}` removed.
- Own community posts removed.
- Own cheers removed.
- Own comments removed.
- Owned rooms and room codes removed.
- Membership in other rooms removed.
- Local account/study keys removed.

Manual QA:
- Delete account that owns a group.
- Delete account that is only a member.
- Delete account with posts/comments/cheers.
- Re-login attempt after deletion should fail or create a fresh account.

## Offline/Intermittent Network

Current stance:
- The app is not offline-first.
- Local study sessions continue to use AsyncStorage.
- Firebase-backed group/community/settings writes should fail visibly and ask the user to retry.

Future improvement:
- Add a small retry queue only for low-risk writes such as profile/settings changes.
