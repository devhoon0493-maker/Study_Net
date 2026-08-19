import { useCallback, useEffect, useRef } from "react";
import type { ScrollView } from "react-native";

import type { Category } from "./communityConstants";
import type { CommunityPost } from "./communityTypes";

const getRouteParam = (value?: string | string[]) =>
  Array.isArray(value) ? value[0] : value;

export function useCommunityPostTarget({
  postIdParam,
  openCommentsParam,
  posts,
  loadingPosts,
  onSelectCategory,
  onOpenComments,
}: {
  postIdParam?: string | string[];
  openCommentsParam?: string | string[];
  posts: CommunityPost[];
  loadingPosts: boolean;
  onSelectCategory: (category: Category) => void;
  onOpenComments: (post: CommunityPost) => void;
}) {
  const feedScrollRef = useRef<ScrollView>(null);
  const postLayoutsRef = useRef<Record<string, number>>({});
  const handledTargetRef = useRef("");
  const targetPostId = getRouteParam(postIdParam);
  const shouldOpenTargetComments = getRouteParam(openCommentsParam) === "1";

  const getTargetMarker = useCallback(
    (postId: string) => `${postId}:${shouldOpenTargetComments ? "comments" : "post"}`,
    [shouldOpenTargetComments],
  );

  const scrollToPost = useCallback((postId: string) => {
    const y = postLayoutsRef.current[postId];
    if (typeof y !== "number") return false;

    requestAnimationFrame(() => {
      feedScrollRef.current?.scrollTo({
        y: Math.max(y - 12, 0),
        animated: true,
      });
    });
    return true;
  }, []);

  useEffect(() => {
    if (!targetPostId) return;

    onSelectCategory("전체");
    handledTargetRef.current = "";
  }, [onSelectCategory, shouldOpenTargetComments, targetPostId]);

  useEffect(() => {
    if (!targetPostId || loadingPosts) return;

    const targetPost = posts.find((post) => post.id === targetPostId);
    if (!targetPost) return;

    const marker = getTargetMarker(targetPostId);
    if (handledTargetRef.current === marker) return;

    const didScroll = scrollToPost(targetPostId);
    if (shouldOpenTargetComments) {
      onOpenComments(targetPost);
    }

    if (didScroll || shouldOpenTargetComments) {
      handledTargetRef.current = marker;
    }
  }, [
    getTargetMarker,
    loadingPosts,
    onOpenComments,
    posts,
    scrollToPost,
    shouldOpenTargetComments,
    targetPostId,
  ]);

  const registerPostLayout = useCallback(
    (postId: string, y: number) => {
      postLayoutsRef.current[postId] = y;

      if (!targetPostId || targetPostId !== postId) return;

      const marker = getTargetMarker(postId);
      if (handledTargetRef.current === marker) return;

      const didScroll = scrollToPost(postId);
      if (didScroll && !shouldOpenTargetComments) {
        handledTargetRef.current = marker;
      }
    },
    [getTargetMarker, scrollToPost, shouldOpenTargetComments, targetPostId],
  );

  return {
    feedScrollRef,
    registerPostLayout,
    targetPostId,
  };
}
