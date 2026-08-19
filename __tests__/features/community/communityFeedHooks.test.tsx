import { act, renderHook, waitFor } from "@testing-library/react-native";
import { get, onValue, ref } from "firebase/database";

import { categories } from "../../../features/community/communityConstants";
import { useCommunityCommentsSheet } from "../../../features/community/useCommunityCommentsSheet";
import { useCommunityFeed } from "../../../features/community/useCommunityFeed";
import { useCommunityProfilePreview } from "../../../features/community/useCommunityProfilePreview";
import type {
  CommunityComment,
  CommunityPost,
} from "../../../features/community/communityTypes";

const postCategory = categories[2];

const makePost = (overrides: Partial<CommunityPost> = {}): CommunityPost => ({
  id: "post-1",
  authorId: "author-1",
  author: "Author",
  authorType: "Student",
  authorImage: null,
  authorBio: "fallback bio",
  communityActivityPublic: false,
  category: postCategory,
  title: "Title",
  body: "Body",
  image: null,
  createdAt: 1,
  likes: 0,
  comments: 0,
  ...overrides,
});

describe("community feed hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("opens, filters, resets, and closes comment sheets", async () => {
    const post = makePost();
    const commentsByPost: Record<string, CommunityComment[]> = {
      "post-1": [
        {
          id: "comment-1",
          postId: "post-1",
          authorId: "commenter",
          author: "Commenter",
          body: "Hello",
          createdAt: 1,
        },
      ],
    };

    const { result } = await renderHook(() =>
      useCommunityCommentsSheet(commentsByPost),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    expect(result.current.selectedPost).toBeNull();
    expect(result.current.comments).toEqual([]);

    await act(async () => {
      result.current.setDraftComment("stale");
      result.current.openComments(post);
    });

    expect(result.current.selectedPost).toBe(post);
    expect(result.current.comments.map((comment) => comment.id)).toEqual([
      "comment-1",
    ]);
    expect(result.current.draftComment).toBe("");

    await act(async () => {
      result.current.setDraftComment("draft");
      result.current.resetDraftComment();
    });
    expect(result.current.draftComment).toBe("");

    await act(async () => {
      result.current.setDraftComment("draft");
      result.current.closeComments();
    });
    expect(result.current.selectedPost).toBeNull();
    expect(result.current.comments).toEqual([]);
    expect(result.current.draftComment).toBe("");

    await act(async () => {
      result.current.openComments(makePost({ id: "post-without-comments" }));
    });
    expect(result.current.comments).toEqual([]);
  });

  it("builds a fallback profile preview and hydrates it from Firebase", async () => {
    const posts = [
      makePost({ id: "post-1", likes: 2 }),
      makePost({ id: "post-2", likes: 3 }),
      makePost({ id: "other", authorId: "author-2", likes: 10 }),
    ];
    jest.mocked(get).mockResolvedValueOnce({
      exists: () => true,
      val: () => ({
        name: "Remote Author",
        userType: "Teacher",
        image: "https://cdn.example.com/author.jpg",
        bio: "remote bio",
        communityActivityPublic: true,
      }),
    } as never);

    const { result } = await renderHook(() =>
      useCommunityProfilePreview(posts),
    );

    await act(async () => {
      await result.current.openProfilePreview(posts[0]);
    });

    expect(ref).toHaveBeenCalledWith(expect.anything(), "publicProfiles/author-1");
    expect(result.current.selectedProfile).toEqual({
      uid: "author-1",
      name: "Remote Author",
      userType: "Teacher",
      image: "https://cdn.example.com/author.jpg",
      bio: "remote bio",
      postCount: 2,
      cheerCount: 5,
      communityActivityPublic: true,
    });

    await act(async () => {
      result.current.closeProfilePreview();
    });
    expect(result.current.selectedProfile).toBeNull();
  });

  it("keeps fallback profile preview when Firebase profile is missing or fails", async () => {
    const post = makePost({
      author: "Fallback",
      authorType: "Student",
      authorImage: "local.jpg",
      authorBio: "local bio",
      likes: 4,
      communityActivityPublic: true,
    });
    jest.mocked(get).mockResolvedValueOnce({
      exists: () => false,
      val: () => null,
    } as never);

    const { result } = await renderHook(() => useCommunityProfilePreview([post]));

    await act(async () => {
      await result.current.openProfilePreview(post);
    });

    expect(result.current.selectedProfile).toEqual({
      uid: "author-1",
      name: "Fallback",
      userType: "Student",
      image: "local.jpg",
      bio: "local bio",
      postCount: 1,
      cheerCount: 4,
      communityActivityPublic: true,
    });

    jest.mocked(get).mockRejectedValueOnce(new Error("network"));
    await act(async () => {
      await result.current.openProfilePreview(post);
    });

    expect(result.current.selectedProfile?.name).toBe("Fallback");
  });

  it("keeps fallback profile preview fields when Firebase profile values are empty", async () => {
    const post = makePost({
      author: "Fallback",
      authorType: "Student",
      authorImage: "local.jpg",
      authorBio: "local bio",
    });
    jest.mocked(get).mockResolvedValueOnce({
      exists: () => true,
      val: () => ({
        name: "",
        userType: "",
        image: undefined,
        bio: "",
        communityActivityPublic: false,
      }),
    } as never);
    const { result } = await renderHook(() => useCommunityProfilePreview([post]));

    await act(async () => {
      await result.current.openProfilePreview(post);
    });

    expect(result.current.selectedProfile).toMatchObject({
      name: "Fallback",
      userType: "Student",
      image: "local.jpg",
      bio: "local bio",
      communityActivityPublic: false,
    });
  });

  it("subscribes to feed sources and maps posts, comments, profiles, and bookmarks", async () => {
    const unsubscribers = {
      communityPosts: jest.fn(),
      communityPostCheers: jest.fn(),
      communityPostComments: jest.fn(),
      publicProfiles: jest.fn(),
    };
    jest.mocked(onValue).mockImplementation((sourceRef, callback) => {
      const path = (sourceRef as unknown as { path: string }).path;
      if (path === "communityPosts") {
        callback({
          val: () => ({
            "post-1": {
              authorId: "author-1",
              author: "Fallback",
              authorType: "Student",
              category: postCategory,
              title: "Post",
              body: "Body",
              createdAt: 10,
            },
          }),
        } as never);
      }
      if (path === "communityPostCheers/post-1") {
        callback({
          val: () => ({
            "user-1": true,
            other: { createdAt: 12 },
          }),
        } as never);
        return unsubscribers.communityPostCheers;
      }
      if (path === "communityPostComments/post-1") {
        callback({
          val: () => ({
            "comment-1": {
              authorId: "commenter",
              author: "Commenter",
              body: "Comment",
              createdAt: 11,
            },
          }),
        } as never);
        return unsubscribers.communityPostComments;
      }
      if (path === "publicProfiles/author-1") {
        callback({
          val: () => ({
            name: "Profile Author",
            userType: "Teacher",
            image: "profile.jpg",
            communityActivityPublic: true,
          }),
        } as never);
        return unsubscribers.publicProfiles;
      }
      return unsubscribers.communityPosts;
    });

    const bookmarkedPostIds = new Set(["post-1"]);
    const { result, unmount } = await renderHook(() =>
      useCommunityFeed({ bookmarkedPostIds, uid: "user-1" }),
    );

    await waitFor(() => {
      expect(result.current.posts).toHaveLength(1);
    });

    expect(ref).toHaveBeenCalledWith(expect.anything(), "communityPosts");
    expect(ref).toHaveBeenCalledWith(expect.anything(), "communityPostCheers/post-1");
    expect(ref).toHaveBeenCalledWith(expect.anything(), "communityPostComments/post-1");
    expect(ref).toHaveBeenCalledWith(expect.anything(), "publicProfiles/author-1");
    expect(result.current.loadingPosts).toBe(false);
    expect(result.current.loadError).toBe("");
    expect(result.current.posts[0]).toMatchObject({
      id: "post-1",
      author: "Profile Author",
      authorType: "Teacher",
      likes: 2,
      comments: 1,
      liked: true,
      bookmarked: true,
      communityActivityPublic: true,
    });
    expect(result.current.commentsByPost["post-1"][0]).toMatchObject({
      id: "comment-1",
      body: "Comment",
    });

    await act(async () => {
      unmount();
    });
    Object.values(unsubscribers).forEach((unsubscribe) => {
      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  it("removes stale public profile subscriptions when feed authors change", async () => {
    const oldProfileUnsubscribe = jest.fn();
    const callbacks: Record<string, (snapshot: { val: () => unknown }) => void> = {};
    jest.mocked(onValue).mockImplementation((sourceRef, callback) => {
      const path = (sourceRef as unknown as { path: string }).path;
      callbacks[path] = callback as never;
      if (path === "communityPosts") {
        callback({
          val: () => ({
            "post-1": {
              authorId: "author-1",
              author: "Old",
              category: postCategory,
              title: "Old post",
              body: "Body",
              createdAt: 10,
            },
          }),
        } as never);
      }
      if (path === "publicProfiles/author-1") {
        return oldProfileUnsubscribe;
      }
      return jest.fn();
    });

    const bookmarkedPostIds = new Set<string>();
    await renderHook(() =>
      useCommunityFeed({ bookmarkedPostIds, uid: "user-1" }),
    );

    await act(async () => {
      callbacks.communityPosts?.({
        val: () => ({
          "post-2": {
            authorId: "author-2",
            author: "New",
            category: postCategory,
            title: "New post",
            body: "Body",
            createdAt: 20,
          },
        }),
      });
    });

    expect(oldProfileUnsubscribe).toHaveBeenCalled();
    expect(ref).toHaveBeenCalledWith(expect.anything(), "publicProfiles/author-2");
  });

  it("sets a load error when the posts subscription fails", async () => {
    jest.mocked(onValue).mockImplementation((sourceRef, callback, onError) => {
      const path = (sourceRef as unknown as { path: string }).path;
      if (path === "communityPosts") {
        onError?.(new Error("denied") as never);
      } else {
        callback({ val: () => null } as never);
      }
      return jest.fn();
    });

    const bookmarkedPostIds = new Set<string>();
    const { result } = await renderHook(() =>
      useCommunityFeed({ bookmarkedPostIds, uid: "user-1" }),
    );

    await waitFor(() => {
      expect(result.current.loadingPosts).toBe(false);
    });
    expect(result.current.posts).toEqual([]);
    expect(result.current.loadError).toMatch(/\S+/);
  });

  it("stops loading when the cheers subscription fails", async () => {
    jest.mocked(onValue).mockImplementation((sourceRef, callback, onError) => {
      const path = (sourceRef as unknown as { path: string }).path;
      if (path === "communityPostCheers") {
        onError?.(new Error("denied") as never);
      } else {
        callback({ val: () => null } as never);
      }
      return jest.fn();
    });

    const bookmarkedPostIds = new Set<string>();
    const { result } = await renderHook(() =>
      useCommunityFeed({ bookmarkedPostIds, uid: "user-1" }),
    );

    await waitFor(() => {
      expect(result.current.loadingPosts).toBe(false);
    });
    expect(result.current.loadError).toBe("");
  });
});
