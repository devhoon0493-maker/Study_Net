import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";

import { db } from "../../utils/firebaseConfig";
import type { CommunityCheerRecord } from "../../utils/communityNotifications";
import type {
  CommunityComment,
  CommunityCommentRecord,
  CommunityPost,
  CommunityPostRecord,
  UserProfileRecord,
} from "./communityTypes";
import {
  snapshotToCommentsByPost,
  snapshotToPosts,
} from "./communityUtils";

export function useCommunityFeed({
  bookmarkedPostIds,
  uid,
}: {
  bookmarkedPostIds: Set<string>;
  uid?: string;
}) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>({});
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let rawPosts: Record<string, CommunityPostRecord> | null = null;
    let rawCheers: Record<string, Record<string, CommunityCheerRecord>> = {};
    let rawComments: Record<string, Record<string, CommunityCommentRecord>> = {};
    let rawProfiles: Record<string, UserProfileRecord> = {};

    const syncPosts = () => {
      setPosts(
        snapshotToPosts(
          rawPosts,
          rawCheers,
          rawComments,
          rawProfiles,
          bookmarkedPostIds,
          uid,
        ),
      );
      setLoadingPosts(false);
    };

    const unsubscribePosts = onValue(
      ref(db, "communityPosts"),
      (snapshot) => {
        rawPosts = snapshot.val();
        setLoadError("");
        syncPosts();
      },
      () => {
        setLoadingPosts(false);
        setLoadError("커뮤니티 게시글을 불러오지 못했어요.");
      },
    );

    const unsubscribeCheers = onValue(
      ref(db, "communityPostCheers"),
      (snapshot) => {
        rawCheers = snapshot.val() ?? {};
        syncPosts();
      },
      () => {
        setLoadingPosts(false);
      },
    );

    const unsubscribeComments = onValue(ref(db, "communityPostComments"), (snapshot) => {
      rawComments = snapshot.val() ?? {};
      setCommentsByPost(snapshotToCommentsByPost(rawComments));
      syncPosts();
    });

    const unsubscribeProfiles = onValue(ref(db, "users"), (snapshot) => {
      rawProfiles = snapshot.val() ?? {};
      syncPosts();
    });

    return () => {
      unsubscribePosts();
      unsubscribeCheers();
      unsubscribeComments();
      unsubscribeProfiles();
    };
  }, [bookmarkedPostIds, uid]);

  return {
    posts,
    loadingPosts,
    commentsByPost,
    loadError,
  };
}
