import { act, renderHook, waitFor } from "@testing-library/react-native";

import { categories } from "../../../features/community/communityConstants";
import { useCommunityCategoryFilter } from "../../../features/community/useCommunityCategoryFilter";

describe("useCommunityCategoryFilter", () => {
  const posts = [
    { id: "study", category: categories[2], bookmarked: false },
    { id: "question", category: categories[3], bookmarked: true },
    { id: "goal", category: categories[4], bookmarked: true },
  ] as never;

  it("shows all posts by default", async () => {
    const { result } = await renderHook(() => useCommunityCategoryFilter(posts));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    expect(result.current.selectedCategory).toBe(categories[0]);
    expect(result.current.filteredPosts.map((post) => post.id)).toEqual([
      "study",
      "question",
      "goal",
    ]);
  });

  it("filters saved posts and category posts", async () => {
    const { result } = await renderHook(() => useCommunityCategoryFilter(posts));

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      result.current.setSelectedCategory(categories[1]);
    });

    expect(result.current.filteredPosts.map((post) => post.id)).toEqual([
      "question",
      "goal",
    ]);

    await act(async () => {
      result.current.setSelectedCategory(categories[3]);
    });

    expect(result.current.filteredPosts.map((post) => post.id)).toEqual([
      "question",
    ]);
  });
});
