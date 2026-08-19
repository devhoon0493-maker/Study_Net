import { useCallback, useState } from "react";

import { loadStoredUserProfile } from "../../utils/userProfileStorage";

export type CommunityAuthorProfile = {
  authorName: string;
  authorType: string;
  authorImage: string | null;
  authorBio: string;
};

const fallbackAuthorProfile: CommunityAuthorProfile = {
  authorName: "나",
  authorType: "",
  authorImage: null,
  authorBio: "",
};

export function useCommunityAuthorProfile() {
  const [authorProfile, setAuthorProfile] =
    useState<CommunityAuthorProfile>(fallbackAuthorProfile);

  const loadAuthorProfile = useCallback(async () => {
    const profile = await loadStoredUserProfile();

    if (!profile) {
      setAuthorProfile(fallbackAuthorProfile);
      return;
    }

    setAuthorProfile({
      authorName: profile.name || "나",
      authorType: profile.userType || "",
      authorImage: profile.image || null,
      authorBio: profile.bio || "",
    });
  }, []);

  return {
    authorProfile,
    loadAuthorProfile,
  };
}
