import { act, renderHook, waitFor } from "@testing-library/react-native";

import { categories } from "../../../features/community/communityConstants";
import { useCommunityPostTarget } from "../../../features/community/useCommunityPostTarget";
import type { CommunityPost } from "../../../features/community/communityTypes";

const makePost = (id: string): CommunityPost => ({
  id,
  authorId: "author",
  author: "Author",
  category: categories[2],
  title: "Title",
  body: "Body",
  createdAt: 1,
  likes: 0,
  comments: 0,
});

describe("useCommunityPostTarget", () => {
  const originalRequestAnimationFrame = global.requestAnimationFrame;

  beforeEach(() => {
    jest.clearAllMocks();
    global.requestAnimationFrame = ((callback: FrameRequestCallback) => {
      callback(0);
      return 0;
    }) as never;
  });

  afterEach(() => {
    global.requestAnimationFrame = originalRequestAnimationFrame;
  });

  it("normalizes route params and selects all category for a target", async () => {
    const onSelectCategory = jest.fn();
    const onOpenComments = jest.fn();

    const { result } = await renderHook(() =>
      useCommunityPostTarget({
        postIdParam: ["post-1", "ignored"],
        openCommentsParam: undefined,
        posts: [],
        loadingPosts: true,
        onSelectCategory,
        onOpenComments,
      }),
    );

    await waitFor(() => {
      expect(result.current.targetPostId).toBe("post-1");
    });
    expect(onSelectCategory).toHaveBeenCalledWith(categories[0]);
    expect(onOpenComments).not.toHaveBeenCalled();
  });

  it("opens target comments when requested after posts load", async () => {
    const onSelectCategory = jest.fn();
    const onOpenComments = jest.fn();
    const post = makePost("post-1");

    const props = {
        postIdParam: "post-1",
        openCommentsParam: "1",
        posts: [post],
        loadingPosts: false,
        onSelectCategory,
        onOpenComments,
    };
    const { result, rerender } = await renderHook(
      (hookProps: typeof props) => useCommunityPostTarget(hookProps),
      { initialProps: props },
    );

    await waitFor(() => {
      expect(onOpenComments).toHaveBeenCalledWith(post);
    });
    rerender({ ...props, posts: [post] });
    expect(onOpenComments).toHaveBeenCalledTimes(1);
    expect(result.current.targetPostId).toBe("post-1");
  });

  it("registers post layout and scrolls to a matching target once", async () => {
    const onSelectCategory = jest.fn();
    const onOpenComments = jest.fn();
    const scrollTo = jest.fn();

    const { result } = await renderHook(() =>
      useCommunityPostTarget({
        postIdParam: "post-1",
        openCommentsParam: undefined,
        posts: [makePost("post-1")],
        loadingPosts: false,
        onSelectCategory,
        onOpenComments,
      }),
    );

    await waitFor(() => {
      expect(result.current.targetPostId).toBe("post-1");
    });

    await act(async () => {
      result.current.feedScrollRef.current = { scrollTo } as never;
      result.current.registerPostLayout("post-1", 42);
      result.current.registerPostLayout("post-1", 84);
    });

    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(scrollTo).toHaveBeenCalledWith({
      y: 30,
      animated: true,
    });

    await act(async () => {
      result.current.registerPostLayout("other-post", 24);
    });
    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("does not mark comment targets as handled from layout-only scrolls", async () => {
    const onSelectCategory = jest.fn();
    const onOpenComments = jest.fn();
    const scrollTo = jest.fn();

    const { result } = await renderHook(() =>
      useCommunityPostTarget({
        postIdParam: "post-1",
        openCommentsParam: "1",
        posts: [makePost("post-1")],
        loadingPosts: true,
        onSelectCategory,
        onOpenComments,
      }),
    );

    await waitFor(() => {
      expect(result.current.targetPostId).toBe("post-1");
    });
    await act(async () => {
      result.current.feedScrollRef.current = { scrollTo } as never;
      result.current.registerPostLayout("post-1", 42);
      result.current.registerPostLayout("post-1", 84);
    });

    expect(scrollTo).toHaveBeenCalledTimes(2);
    expect(onOpenComments).not.toHaveBeenCalled();
  });

  it("does nothing without a target post id or matching loaded post", async () => {
    const onSelectCategory = jest.fn();
    const onOpenComments = jest.fn();

    const { result } = await renderHook(() =>
      useCommunityPostTarget({
        postIdParam: undefined,
        openCommentsParam: undefined,
        posts: [],
        loadingPosts: false,
        onSelectCategory,
        onOpenComments,
      }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    expect(result.current.targetPostId).toBeUndefined();
    expect(onSelectCategory).not.toHaveBeenCalled();

    await renderHook(() =>
      useCommunityPostTarget({
        postIdParam: "missing",
        openCommentsParam: undefined,
        posts: [] as CommunityPost[],
        loadingPosts: false,
        onSelectCategory,
        onOpenComments,
      }),
    );

    expect(onSelectCategory).toHaveBeenCalledWith(categories[0]);
    expect(onOpenComments).not.toHaveBeenCalled();
  });
});
