import { useCallback, useState } from "react";
import { get, ref } from "firebase/database";

import { db } from "../../utils/firebaseConfig";
import type { CommunityPost, ProfilePreview } from "./communityTypes";

export function useCommunityProfilePreview(posts: CommunityPost[]) {
  const [selectedProfile, setSelectedProfile] = useState<ProfilePreview | null>(null);

  const openProfilePreview = useCallback(
    async (post: CommunityPost) => {
      const fallbackProfile: ProfilePreview = {
        uid: post.authorId,
        name: post.author,
        userType: post.authorType,
        image: post.authorImage ?? null,
        bio: post.authorBio,
        postCount: posts.filter((item) => item.authorId === post.authorId).length,
        cheerCount: posts
          .filter((item) => item.authorId === post.authorId)
          .reduce((sum, item) => sum + item.likes, 0),
        communityActivityPublic: post.communityActivityPublic === true,
      };

      setSelectedProfile(fallbackProfile);

      try {
        const snapshot = await get(ref(db, `publicProfiles/${post.authorId}`));
        if (!snapshot.exists()) return;

        const profile = snapshot.val();
        setSelectedProfile({
          ...fallbackProfile,
          name: profile.name || fallbackProfile.name,
          userType: profile.userType || fallbackProfile.userType,
          image: profile.image ?? fallbackProfile.image,
          bio: profile.bio || fallbackProfile.bio,
          communityActivityPublic: profile.communityActivityPublic === true,
        });
      } catch {
        // The post already carries enough profile data for a compact preview.
      }
    },
    [posts],
  );

  const closeProfilePreview = useCallback(() => {
    setSelectedProfile(null);
  }, []);

  return {
    selectedProfile,
    openProfilePreview,
    closeProfilePreview,
  };
}
