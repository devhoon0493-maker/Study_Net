export const COMMUNITY_BOOKMARKS_KEY = "community_bookmarked_posts";

export const getCommunityBookmarkStorageKey = (uid?: string | null) =>
  uid ? `${COMMUNITY_BOOKMARKS_KEY}_${uid}` : COMMUNITY_BOOKMARKS_KEY;
