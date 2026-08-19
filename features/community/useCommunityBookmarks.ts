import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

import { getCommunityBookmarkStorageKey } from "../../utils/communityBookmarks";

const parseBookmarkIds = (raw: string | null) => {
  const parsed = raw ? JSON.parse(raw) : [];
  return Array.isArray(parsed)
    ? parsed.filter((id): id is string => typeof id === "string")
    : [];
};

export function useCommunityBookmarks(uid?: string) {
  const [bookmarkedPostIds, setBookmarkedPostIds] = useState<Set<string>>(new Set());

  const loadBookmarks = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(getCommunityBookmarkStorageKey(uid));
      setBookmarkedPostIds(new Set(parseBookmarkIds(raw)));
    } catch {
      setBookmarkedPostIds(new Set());
    }
  }, [uid]);

  const toggleBookmark = useCallback(
    async (postId: string) => {
      const previous = bookmarkedPostIds;
      const next = new Set(previous);

      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
      }

      setBookmarkedPostIds(next);
      try {
        await AsyncStorage.setItem(
          getCommunityBookmarkStorageKey(uid),
          JSON.stringify([...next]),
        );
      } catch {
        setBookmarkedPostIds(previous);
        Alert.alert("저장 실패", "게시글 저장 상태를 바꾸지 못했어요.");
      }
    },
    [bookmarkedPostIds, uid],
  );

  return {
    bookmarkedPostIds,
    loadBookmarks,
    toggleBookmark,
  };
}
