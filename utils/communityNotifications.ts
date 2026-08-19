import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  equalTo,
  onValue,
  orderByChild,
  query,
  ref,
  type Unsubscribe,
} from "firebase/database";

import type {
  CommunityCommentRecord,
  CommunityPostRecord,
  UserProfileRecord,
} from "../features/community/communityTypes";
import type { PostCategory } from "../features/community/communityConstants";
import { db } from "./firebaseConfig";

export const COMMUNITY_NOTIFICATIONS_READ_KEY = "community_notifications_read_at";

export type CommunityCheerRecord =
  | boolean
  | {
      authorId?: string;
      createdAt?: number;
    };

export type CommunityNotification = {
  id: string;
  type: "cheer" | "comment";
  actorId: string;
  actorName: string;
  actorImage?: string | null;
  postId: string;
  postCategory: PostCategory;
  postTitle: string;
  postBody: string;
  postImage?: string | null;
  body?: string;
  createdAt: number;
  legacy?: boolean;
};

type BuildArgs = {
  posts: Record<string, CommunityPostRecord> | null;
  cheers: Record<string, Record<string, CommunityCheerRecord>> | null;
  comments: Record<string, Record<string, CommunityCommentRecord>> | null;
  users: Record<string, UserProfileRecord> | null;
  uid?: string | null;
};

export type CommunityNotificationSources = Omit<BuildArgs, "uid">;

export const getCommunityNotificationsReadKey = (uid?: string | null) =>
  uid
    ? `${COMMUNITY_NOTIFICATIONS_READ_KEY}_${uid}`
    : COMMUNITY_NOTIFICATIONS_READ_KEY;

export const loadCommunityNotificationsReadAt = async (uid?: string | null) => {
  const raw = await AsyncStorage.getItem(getCommunityNotificationsReadKey(uid));
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
};

export const saveCommunityNotificationsReadAt = async (
  uid?: string | null,
  value = Date.now(),
) => {
  await AsyncStorage.setItem(
    getCommunityNotificationsReadKey(uid),
    String(value),
  );
};

export const buildCommunityNotifications = ({
  posts,
  cheers,
  comments,
  users,
  uid,
}: BuildArgs) => {
  if (!uid || !posts) return [];

  const notifications: CommunityNotification[] = [];

  Object.entries(posts).forEach(([postId, post]) => {
    if (post.authorId !== uid) return;

    const postTitle = post.title || "내 게시글";
    const postBody = post.body || "";

    Object.entries(cheers?.[postId] ?? {}).forEach(([actorId, cheer]) => {
      if (actorId === uid || !cheer) return;

      const createdAt =
        typeof cheer === "object" && typeof cheer.createdAt === "number"
          ? cheer.createdAt
          : post.createdAt;
      const actor = users?.[actorId] ?? {};

      notifications.push({
        id: `cheer-${postId}-${actorId}`,
        type: "cheer",
        actorId,
        actorName: actor.name || "사용자",
        actorImage: actor.image ?? null,
        postId,
        postCategory: post.category,
        postTitle,
        postBody,
        postImage: post.image ?? null,
        createdAt,
        legacy: typeof cheer === "boolean",
      });
    });

    Object.entries(comments?.[postId] ?? {}).forEach(([commentId, comment]) => {
      if (comment.authorId === uid) return;

      const actor = users?.[comment.authorId] ?? {};

      notifications.push({
        id: `comment-${postId}-${commentId}`,
        type: "comment",
        actorId: comment.authorId,
        actorName: actor.name || comment.author || "사용자",
        actorImage: actor.image ?? comment.authorImage ?? null,
        postId,
        postCategory: post.category,
        postTitle,
        postBody,
        postImage: post.image ?? null,
        body: comment.body,
        createdAt: comment.createdAt,
      });
    });
  });

  return notifications.sort((a, b) => b.createdAt - a.createdAt);
};

export const subscribeCommunityNotificationSources = (
  uid: string,
  onChange: (sources: CommunityNotificationSources) => void,
) => {
  const sources: CommunityNotificationSources = {
    posts: null,
    cheers: null,
    comments: null,
    users: null,
  };

  const emit = () => {
    onChange({ ...sources });
  };

  const unsubscribers: Unsubscribe[] = [];
  const postUnsubscribers = new Map<string, Unsubscribe[]>();
  const profileUnsubscribers = new Map<string, Unsubscribe>();

  const clearPostSubscriptions = () => {
    postUnsubscribers.forEach((items) => items.forEach((unsubscribe) => unsubscribe()));
    postUnsubscribers.clear();
    sources.cheers = {};
    sources.comments = {};
  };

  const syncProfiles = () => {
    const actorIds = new Set<string>();

    Object.values(sources.cheers ?? {}).forEach((cheers) => {
      Object.keys(cheers ?? {}).forEach((actorId) => {
        if (actorId !== uid) actorIds.add(actorId);
      });
    });
    Object.values(sources.comments ?? {}).forEach((comments) => {
      Object.values(comments ?? {}).forEach((comment) => {
        if (comment.authorId !== uid) actorIds.add(comment.authorId);
      });
    });

    profileUnsubscribers.forEach((unsubscribe, actorId) => {
      if (!actorIds.has(actorId)) {
        unsubscribe();
        profileUnsubscribers.delete(actorId);
        if (sources.users) delete sources.users[actorId];
      }
    });

    actorIds.forEach((actorId) => {
      if (profileUnsubscribers.has(actorId)) return;
      const unsubscribe = onValue(ref(db, `publicProfiles/${actorId}`), (snapshot) => {
        sources.users = {
          ...(sources.users ?? {}),
          [actorId]: snapshot.val() ?? {},
        };
        emit();
      });
      profileUnsubscribers.set(actorId, unsubscribe);
    });
  };

  unsubscribers.push(
    onValue(
      query(ref(db, "communityPosts"), orderByChild("authorId"), equalTo(uid)),
      (snapshot) => {
      sources.posts = snapshot.val();
      clearPostSubscriptions();
      Object.keys(sources.posts ?? {}).forEach((postId) => {
        postUnsubscribers.set(postId, [
          onValue(ref(db, `communityPostCheers/${postId}`), (cheerSnapshot) => {
            sources.cheers = {
              ...(sources.cheers ?? {}),
              [postId]: cheerSnapshot.val() ?? {},
            };
            syncProfiles();
            emit();
          }),
          onValue(ref(db, `communityPostComments/${postId}`), (commentSnapshot) => {
            sources.comments = {
              ...(sources.comments ?? {}),
              [postId]: commentSnapshot.val() ?? {},
            };
            syncProfiles();
            emit();
          }),
        ]);
      });
      emit();
      },
    ),
  );

  return () => {
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    clearPostSubscriptions();
    profileUnsubscribers.forEach((unsubscribe) => unsubscribe());
    profileUnsubscribers.clear();
  };
};

export const countUnreadCommunityNotifications = (
  notifications: CommunityNotification[],
  readAt: number,
) =>
  notifications.filter((item) => {
    if (item.legacy && readAt === 0) return true;
    return item.createdAt > readAt;
  }).length;
