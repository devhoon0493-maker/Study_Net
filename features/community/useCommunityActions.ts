import { Alert } from "react-native";
import { push, ref, remove, set, update } from "firebase/database";

import { auth, db } from "../../utils/firebaseConfig";
import type { CommunityPost, CommunityPostRecord, CommunityComment, CommunityCommentRecord } from "./communityTypes";
import type { PostCategory } from "./communityConstants";

type AuthorDraft = {
  authorName: string;
  authorType: string;
  authorImage: string | null;
  authorBio: string;
};

type SubmitPostInput = AuthorDraft & {
  draftCategory: PostCategory;
  draftGroupCode: string;
  draftTitle: string;
  draftBody: string;
  draftImage: string | null;
};

type SubmitCommentInput = {
  selectedPost: CommunityPost | null;
  draftComment: string;
  authorName: string;
  authorImage: string | null;
};

export function useCommunityActions({
  posts,
  uid,
}: {
  posts: CommunityPost[];
  uid?: string;
}) {
  const submitPost = async ({
    authorName,
    authorType,
    authorImage,
    authorBio,
    draftCategory,
    draftGroupCode,
    draftTitle,
    draftBody,
    draftImage,
  }: SubmitPostInput) => {
    const title = draftTitle.trim();
    const body = draftBody.trim();
    const groupCode = draftGroupCode.trim().toUpperCase();

    if (title.length < 2 || body.length < 4) {
      Alert.alert("입력 확인", "제목과 내용을 조금 더 작성해주세요.");
      return false;
    }

    if (draftCategory === "그룹 모집" && groupCode.length > 0 && groupCode.length !== 6) {
      Alert.alert("코드 확인", "초대 코드는 6자리로 입력해주세요.");
      return false;
    }

    const user = auth.currentUser;
    if (!user) {
      Alert.alert("로그인 필요", "커뮤니티 글을 작성하려면 로그인이 필요해요.");
      return false;
    }

    const postRef = push(ref(db, "communityPosts"));
    const newPost: CommunityPostRecord = {
      authorId: user.uid,
      author: authorName,
      authorType,
      authorImage,
      authorBio,
      category: draftCategory,
      groupCode: draftCategory === "그룹 모집" && groupCode ? groupCode : null,
      title,
      body,
      image: draftImage,
      createdAt: Date.now(),
      cheerCount: 0,
      commentCount: 0,
    };

    try {
      await set(postRef, newPost);
      return true;
    } catch {
      Alert.alert("저장 실패", "게시글을 저장하지 못했어요.");
      return false;
    }
  };

  const toggleLike = async (postId: string) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("로그인 필요", "응원하려면 로그인이 필요해요.");
      return;
    }

    const post = posts.find((item) => item.id === postId);
    const cheerRef = ref(db, `communityPostCheers/${postId}/${user.uid}`);

    try {
      if (post?.liked) {
        await remove(cheerRef);
      } else {
        await set(cheerRef, {
          authorId: user.uid,
          createdAt: Date.now(),
        });
      }
    } catch {
      Alert.alert("저장 실패", "응원 상태를 저장하지 못했어요.");
    }
  };

  const deletePost = (post: CommunityPost) => {
    if (post.authorId !== uid) return;

    Alert.alert("게시글 삭제", "이 게시글을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await update(ref(db), {
              [`communityPosts/${post.id}`]: null,
              [`communityPostCheers/${post.id}`]: null,
              [`communityPostComments/${post.id}`]: null,
            });
          } catch {
            Alert.alert("삭제 실패", "게시글을 삭제하지 못했어요.");
          }
        },
      },
    ]);
  };

  const submitComment = async ({
    selectedPost,
    draftComment,
    authorName,
    authorImage,
  }: SubmitCommentInput) => {
    const body = draftComment.trim();
    const user = auth.currentUser;

    if (!selectedPost) return false;

    if (!user) {
      Alert.alert("로그인 필요", "댓글을 작성하려면 로그인이 필요해요.");
      return false;
    }

    if (body.length < 1) {
      Alert.alert("입력 확인", "댓글 내용을 입력해주세요.");
      return false;
    }

    const commentRef = push(ref(db, `communityPostComments/${selectedPost.id}`));
    const newComment: CommunityCommentRecord = {
      authorId: user.uid,
      author: authorName,
      authorImage,
      body,
      createdAt: Date.now(),
    };

    try {
      await set(commentRef, newComment);
      return true;
    } catch {
      Alert.alert("저장 실패", "댓글을 저장하지 못했어요.");
      return false;
    }
  };

  const deleteComment = (comment: CommunityComment) => {
    if (comment.authorId !== uid) return;

    Alert.alert("댓글 삭제", "이 댓글을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await remove(ref(db, `communityPostComments/${comment.postId}/${comment.id}`));
          } catch {
            Alert.alert("삭제 실패", "댓글을 삭제하지 못했어요.");
          }
        },
      },
    ]);
  };

  return {
    submitPost,
    toggleLike,
    deletePost,
    submitComment,
    deleteComment,
  };
}
