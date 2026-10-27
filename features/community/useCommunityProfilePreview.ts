import { useCallback, useEffect, useRef, useState } from "react";
import { onValue, ref } from "firebase/database";

import { db } from "../../utils/firebaseConfig";
import type { CommunityPost, ProfilePreview } from "./communityTypes";

export function useCommunityProfilePreview(posts: CommunityPost[]) {
  const [selectedProfile, setSelectedProfile] = useState<ProfilePreview | null>(null);
  const profileUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(
    () => () => {
      profileUnsubscribeRef.current?.();
      profileUnsubscribeRef.current = null;
    },
    [],
  );

  const openProfilePreview = useCallback(
    (post: CommunityPost) => {
      profileUnsubscribeRef.current?.();
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
      profileUnsubscribeRef.current = onValue(
        ref(db, `publicProfiles/${post.authorId}`),
        (snapshot) => {
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
        },
      );
    },
    [posts],
  );

  const closeProfilePreview = useCallback(() => {
    profileUnsubscribeRef.current?.();
    profileUnsubscribeRef.current = null;
    setSelectedProfile(null);
  }, []);

  return {
    selectedProfile,
    openProfilePreview,
    closeProfilePreview,
  };
}
