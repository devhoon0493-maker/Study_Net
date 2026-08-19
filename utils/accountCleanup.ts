import type { CommunityCheerRecord } from "./communityNotifications";

export type AccountCleanupSnapshot = {
  communityPosts?: Record<string, { authorId?: string }>;
  communityPostCheers?: Record<string, Record<string, CommunityCheerRecord>>;
  communityPostComments?: Record<
    string,
    Record<string, { authorId?: string }>
  >;
  rooms?: Record<
    string,
    { ownerId?: string; code?: string; members?: Record<string, unknown> }
  >;
};

export const buildAccountCleanupUpdates = (
  uid: string,
  snapshot: AccountCleanupSnapshot,
) => {
  const updates: Record<string, null> = {
    [`users/${uid}`]: null,
    [`publicProfiles/${uid}`]: null,
    [`userRooms/${uid}`]: null,
  };
  const myPostIds = new Set<string>();

  Object.entries(snapshot.communityPosts ?? {}).forEach(([postId, post]) => {
    if (post.authorId === uid) {
      myPostIds.add(postId);
      updates[`communityPosts/${postId}`] = null;
    }
  });

  Object.entries(snapshot.communityPostCheers ?? {}).forEach(([postId, cheers]) => {
    Object.keys(cheers ?? {}).forEach((cheerUid) => {
      if (cheerUid === uid || myPostIds.has(postId)) {
        updates[`communityPostCheers/${postId}/${cheerUid}`] = null;
      }
    });
  });

  Object.entries(snapshot.communityPostComments ?? {}).forEach(
    ([postId, comments]) => {
      Object.entries(comments ?? {}).forEach(([commentId, comment]) => {
        if (comment.authorId === uid || myPostIds.has(postId)) {
          updates[`communityPostComments/${postId}/${commentId}`] = null;
        }
      });
    },
  );

  Object.entries(snapshot.rooms ?? {}).forEach(([roomId, room]) => {
    if (room.ownerId === uid) {
      updates[`rooms/${roomId}`] = null;
      if (room.code) updates[`roomCodes/${room.code}`] = null;
      Object.keys(room.members ?? {}).forEach((memberUid) => {
        updates[`userRooms/${memberUid}/${roomId}`] = null;
      });
      return;
    }

    if (room.members?.[uid]) {
      updates[`rooms/${roomId}/members/${uid}`] = null;
      updates[`userRooms/${uid}/${roomId}`] = null;
    }
  });

  return updates;
};
