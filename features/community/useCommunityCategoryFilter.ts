import { useMemo, useState } from "react";

import type { Category } from "./communityConstants";
import type { CommunityPost } from "./communityTypes";

export function useCommunityCategoryFilter(posts: CommunityPost[]) {
  const [selectedCategory, setSelectedCategory] = useState<Category>("전체");

  const filteredPosts = useMemo(() => {
    if (selectedCategory === "전체") return posts;
    if (selectedCategory === "저장됨") {
      return posts.filter((post) => post.bookmarked);
    }
    return posts.filter((post) => post.category === selectedCategory);
  }, [posts, selectedCategory]);

  return {
    selectedCategory,
    setSelectedCategory,
    filteredPosts,
  };
}
