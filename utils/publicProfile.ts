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
): PublicProfileRecord => {
  const publicProfile: PublicProfileRecord = {
    name: profile.name || "Study User",
    userType: profile.userType || "",
    image: profile.image ?? null,
    bio: profile.bio || "",
    color: profile.color || "",
    updatedAt: profile.updatedAt ?? Date.now(),
  };

  if (typeof profile.studyStatusPublic === "boolean") {
    publicProfile.studyStatusPublic = profile.studyStatusPublic;
  }
  if (typeof profile.communityActivityPublic === "boolean") {
    publicProfile.communityActivityPublic = profile.communityActivityPublic;
  }

  return publicProfile;
};

export const publicProfileUpdate = (uid: string, profile: StoredUserProfile) => ({
  [`publicProfiles/${uid}`]: toPublicProfile(profile),
});
