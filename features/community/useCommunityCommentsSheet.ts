import { useCallback, useMemo, useState } from "react";

import type { CommunityComment, CommunityPost } from "./communityTypes";

export function useCommunityCommentsSheet(
  commentsByPost: Record<string, CommunityComment[]>,
) {
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [draftComment, setDraftComment] = useState("");

  const comments = useMemo(() => {
    if (!selectedPost) return [];
    return commentsByPost[selectedPost.id] ?? [];
  }, [commentsByPost, selectedPost]);

  const openComments = useCallback((post: CommunityPost) => {
    setSelectedPost(post);
    setDraftComment("");
  }, []);

  const closeComments = useCallback(() => {
    setSelectedPost(null);
    setDraftComment("");
  }, []);

  const resetDraftComment = useCallback(() => {
    setDraftComment("");
  }, []);

  return {
    selectedPost,
    comments,
    draftComment,
    setDraftComment,
    openComments,
    closeComments,
    resetDraftComment,
  };
}
