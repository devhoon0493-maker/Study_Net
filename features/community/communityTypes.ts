import type { PostCategory } from "./communityConstants";

export type CommunityPost = {
  id: string;
  authorId: string;
  author: string;
  authorType?: string;
  authorImage?: string | null;
  authorBio?: string;
  category: PostCategory;
  title: string;
  body: string;
  image?: string | null;
  createdAt: number;
  likes: number;
  comments: number;
  liked?: boolean;
  bookmarked?: boolean;
};

export type LiveStudyRoom = {
  id: string;
  name: string;
  subjects: string;
  memberCount: number;
  code: string;
  createdAt: number;
};

export type LiveStudyRoomRecord = {
  name?: string;
  subjects?: string;
  members?: Record<string, unknown>;
  code?: string;
  createdAt?: number;
  visibility?: "public" | "private";
};

export type CommunityPostRecord = Omit<
  CommunityPost,
  "id" | "likes" | "comments" | "liked" | "bookmarked"
> & {
  cheerCount?: number;
  commentCount?: number;
};

export type CommunityComment = {
  id: string;
  postId: string;
  authorId: string;
  author: string;
  authorImage?: string | null;
  body: string;
  createdAt: number;
};

export type CommunityCommentRecord = Omit<CommunityComment, "id" | "postId">;

export type UserProfileRecord = {
  name?: string;
  userType?: string;
  image?: string | null;
  bio?: string;
};

export type ProfilePreview = {
  uid: string;
  name: string;
  userType?: string;
  image?: string | null;
  bio?: string;
  postCount: number;
  cheerCount: number;
};
