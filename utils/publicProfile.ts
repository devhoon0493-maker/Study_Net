import type { StoredUserProfile } from "./userProfileStorage";

export type PublicProfileRecord = {
  name: string;
  userType?: string;
  image?: string | null;
  bio?: string;
  color?: string;
  studyStatusPublic?: boolean;
  communityActivityPublic?: boolean;
  updatedAt?: number;
};

export const toPublicProfile = (
  profile: StoredUserProfile,
): PublicProfileRecord => ({
  name: profile.name || "Study User",
  userType: profile.userType || "",
  image: profile.image ?? null,
  bio: profile.bio || "",
  color: profile.color || "",
  studyStatusPublic: profile.studyStatusPublic,
  communityActivityPublic: profile.communityActivityPublic,
  updatedAt: profile.updatedAt ?? Date.now(),
});

export const publicProfileUpdate = (uid: string, profile: StoredUserProfile) => ({
  [`publicProfiles/${uid}`]: toPublicProfile(profile),
});
