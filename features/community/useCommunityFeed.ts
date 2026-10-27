import { useEffect, useState } from "react";
import { limitToLast, onValue, query, ref } from "firebase/database";

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
  blockedUserIds,
  uid,
}: {
  bookmarkedPostIds: Set<string>;
  blockedUserIds?: Set<string>;
  uid?: string;
}) {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, CommunityComment[]>>({});
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let rawPosts: Record<string, CommunityPostRecord> | null = null;
    const rawCheers: Record<string, Record<string, CommunityCheerRecord>> = {};
    const rawComments: Record<string, Record<string, CommunityCommentRecord>> = {};
    let rawProfiles: Record<string, UserProfileRecord> = {};
    const postUnsubscribers: Array<() => void> = [];
    const profileUnsubscribers = new Map<string, () => void>();

    const clearPostSubscriptions = () => {
      while (postUnsubscribers.length > 0) {
        postUnsubscribers.pop()?.();
      }
      Object.keys(rawCheers).forEach((postId) => delete rawCheers[postId]);
      Object.keys(rawComments).forEach((postId) => delete rawComments[postId]);
    };

    const syncComments = () => {
      const next = snapshotToCommentsByPost(rawComments);
      if (blockedUserIds?.size) {
        Object.keys(next).forEach((postId) => {
          next[postId] = next[postId].filter((comment) => !blockedUserIds.has(comment.authorId));
        });
      }
      setCommentsByPost(next);
    };

    const syncProfiles = () => {
      const authorIds = new Set(
        Object.values(rawPosts ?? {}).map((post) => post.authorId),
      );

      profileUnsubscribers.forEach((unsubscribe, authorId) => {
        if (!authorIds.has(authorId)) {
          if (typeof unsubscribe === "function") unsubscribe();
          profileUnsubscribers.delete(authorId);
          delete rawProfiles[authorId];
        }
      });

      authorIds.forEach((authorId) => {
        if (profileUnsubscribers.has(authorId)) return;

        const unsubscribe = onValue(ref(db, `publicProfiles/${authorId}`), (snapshot) => {
          rawProfiles = {
            ...rawProfiles,
            [authorId]: snapshot.val() ?? {},
          };
          syncPosts();
        });
        profileUnsubscribers.set(authorId, unsubscribe);
      });
    };

    const syncPosts = () => {
      const nextPosts = snapshotToPosts(
          rawPosts,
          rawCheers,
          rawComments,
          rawProfiles,
          bookmarkedPostIds,
          uid,
        ).filter((post) => !blockedUserIds?.has(post.authorId));
      nextPosts.forEach((post) => {
        const visibleComments = Object.values(rawComments[post.id] ?? {}).filter(
          (comment) => !blockedUserIds?.has(comment.authorId),
        );
        post.comments = visibleComments.length;
      });
      setPosts(nextPosts);
      setLoadingPosts(false);
    };

    const unsubscribePosts = onValue(
      query(ref(db, "communityPosts"), limitToLast(50)),
      (snapshot) => {
        rawPosts = snapshot.val();
        setLoadError("");
        clearPostSubscriptions();
        Object.keys(rawPosts ?? {}).forEach((postId) => {
          postUnsubscribers.push(
            onValue(ref(db, `communityPostCheers/${postId}`), (cheerSnapshot) => {
              rawCheers[postId] = cheerSnapshot.val() ?? {};
              syncPosts();
            }),
          );
          postUnsubscribers.push(
            onValue(ref(db, `communityPostComments/${postId}`), (commentSnapshot) => {
              rawComments[postId] = commentSnapshot.val() ?? {};
              syncComments();
              syncPosts();
            }),
          );
        });
        syncProfiles();
        syncPosts();
      },
      () => {
        setLoadingPosts(false);
        setLoadError("커뮤니티 게시글을 불러오지 못했어요.");
      },
    );

    return () => {
      unsubscribePosts();
      clearPostSubscriptions();
      profileUnsubscribers.forEach((unsubscribe) => {
        if (typeof unsubscribe === "function") unsubscribe();
      });
      profileUnsubscribers.clear();
    };
  }, [bookmarkedPostIds, blockedUserIds, uid]);

  return {
    posts,
    loadingPosts,
    commentsByPost,
    loadError,
  };
}
