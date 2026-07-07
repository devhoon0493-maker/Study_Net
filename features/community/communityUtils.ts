import type {
  CommunityComment,
  CommunityCommentRecord,
  CommunityPost,
  CommunityPostRecord,
  LiveStudyRoom,
  LiveStudyRoomRecord,
  UserProfileRecord,
} from "./communityTypes";

export const toEmbeddedImageUri = (base64: string) => `data:image/jpeg;base64,${base64}`;

export const getInitial = (name: string) => name.trim().slice(0, 1).toUpperCase() || "S";

export const formatRelativeTime = (createdAt: number) => {
  const diff = Math.max(0, Date.now() - createdAt);
  const minutes = Math.floor(diff / (1000 * 60));

  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;

  return `${Math.floor(hours / 24)}일 전`;
};

export const sortPosts = (nextPosts: CommunityPost[]) => {
  return [...nextPosts].sort((a, b) => b.createdAt - a.createdAt);
};

export const snapshotToPosts = (
  rawPosts: Record<string, CommunityPostRecord> | null,
  cheers: Record<string, Record<string, boolean>>,
  comments: Record<string, Record<string, CommunityCommentRecord>>,
  profiles: Record<string, UserProfileRecord>,
  uid?: string,
) => {
  if (!rawPosts) return [];

  return sortPosts(
    Object.entries(rawPosts).map(([id, post]) => {
      const postCheers = cheers[id] ?? {};
      const postComments = comments[id] ?? {};
      const likes = Object.values(postCheers).filter(Boolean).length;
      const profile = profiles[post.authorId] ?? {};

      return {
        id,
        authorId: post.authorId,
        author: profile.name || post.author,
        authorType: profile.userType ?? post.authorType,
        authorImage: profile.image ?? post.authorImage ?? null,
        authorBio: profile.bio ?? post.authorBio,
        category: post.category,
        title: post.title,
        body: post.body,
        image: post.image ?? null,
        createdAt: post.createdAt,
        likes,
        comments: Object.keys(postComments).length,
        liked: uid ? !!postCheers[uid] : false,
      };
    }),
  );
};

export const snapshotToCommentsByPost = (
  rawComments: Record<string, Record<string, CommunityCommentRecord>> | null,
): Record<string, CommunityComment[]> => {
  if (!rawComments) return {};

  return Object.fromEntries(
    Object.entries(rawComments).map(([postId, comments]) => [
      postId,
      Object.entries(comments)
        .map(([id, comment]) => ({
          id,
          postId,
          authorId: comment.authorId,
          author: comment.author,
          authorImage: comment.authorImage ?? null,
          body: comment.body,
          createdAt: comment.createdAt,
        }))
        .sort((a, b) => a.createdAt - b.createdAt),
    ]),
  );
};

export const snapshotToRooms = (
  rawRooms: Record<string, LiveStudyRoomRecord> | null,
): LiveStudyRoom[] => {
  if (!rawRooms) return [];

  return Object.entries(rawRooms)
    .filter(([, room]) => (room?.visibility ?? "public") === "public")
    .map(([id, room]) => ({
      id,
      name: room.name ?? "스터디룸",
      subjects: room.subjects ?? "자유 공부",
      memberCount: Object.keys(room.members ?? {}).length,
      code: room.code ?? "",
      createdAt: room.createdAt ?? 0,
    }))
    .filter((room) => room.memberCount > 0)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 5);
};
