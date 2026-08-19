import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { push, remove, set, update } from "firebase/database";

import { categories } from "../../../features/community/communityConstants";
import { useCommunityActions } from "../../../features/community/useCommunityActions";
import type {
  CommunityComment,
  CommunityPost,
} from "../../../features/community/communityTypes";
import { auth } from "../../../utils/firebaseConfig";

jest.mock("firebase/database", () => ({
  get: jest.fn(),
  getDatabase: jest.fn(() => ({})),
  onValue: jest.fn(),
  push: jest.fn(() => ({ key: "new-key" })),
  ref: jest.fn((db, path) => ({ db, path })),
  remove: jest.fn(() => Promise.resolve()),
  set: jest.fn(() => Promise.resolve()),
  update: jest.fn(() => Promise.resolve()),
}));

const postCategory = categories[2];
const groupCategory = categories[5];

const setCurrentUser = (user: unknown) => {
  Object.defineProperty(auth, "currentUser", {
    configurable: true,
    value: user,
    writable: true,
  });
};

const makePost = (overrides: Partial<CommunityPost> = {}): CommunityPost => ({
  id: "post-1",
  authorId: "user-1",
  author: "Author",
  category: postCategory,
  title: "Title",
  body: "Body",
  createdAt: 1,
  likes: 0,
  comments: 0,
  ...overrides,
});

const pressAlertButton = async (index: number) => {
  const buttons = jest.mocked(Alert.alert).mock.calls.at(-1)?.[2];
  if (Array.isArray(buttons)) {
    await buttons[index]?.onPress?.();
  }
};

const renderActions = async (
  params: Parameters<typeof useCommunityActions>[0] = {
    posts: [],
    uid: "user-1",
  },
) => {
  const rendered = await renderHook(() => useCommunityActions(params));
  await waitFor(() => {
    expect(rendered.result.current).not.toBeNull();
  });
  return rendered;
};

describe("useCommunityActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.spyOn(Date, "now").mockReturnValue(10_000);
    setCurrentUser({ uid: "user-1" });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("validates post input before writing", async () => {
    const { result } = await renderActions();

    await expect(
      result.current.submitPost({
        authorName: "Author",
        authorType: "Student",
        authorImage: null,
        authorBio: "",
        draftCategory: postCategory,
        draftGroupCode: "",
        draftTitle: "T",
        draftBody: "Body",
        draftImage: null,
      }),
    ).resolves.toBe(false);

    await expect(
      result.current.submitPost({
        authorName: "Author",
        authorType: "Student",
        authorImage: null,
        authorBio: "",
        draftCategory: groupCategory,
        draftGroupCode: "ABC",
        draftTitle: "Title",
        draftBody: "Body",
        draftImage: null,
      }),
    ).resolves.toBe(false);

    expect(Alert.alert).toHaveBeenCalledTimes(2);
    expect(set).not.toHaveBeenCalled();
  });

  it("requires login and writes valid posts", async () => {
    const { result } = await renderActions();
    setCurrentUser(null);

    await expect(
      result.current.submitPost({
        authorName: "Author",
        authorType: "Student",
        authorImage: "avatar.jpg",
        authorBio: "bio",
        draftCategory: postCategory,
        draftGroupCode: "",
        draftTitle: "Title",
        draftBody: "Body",
        draftImage: "image.jpg",
      }),
    ).resolves.toBe(false);
    expect(Alert.alert).toHaveBeenCalled();

    setCurrentUser({ uid: "user-1" });
    await expect(
      result.current.submitPost({
        authorName: "Author",
        authorType: "Student",
        authorImage: "avatar.jpg",
        authorBio: "bio",
        draftCategory: groupCategory,
        draftGroupCode: "abc123",
        draftTitle: "  Title  ",
        draftBody: "  Body  ",
        draftImage: "image.jpg",
      }),
    ).resolves.toBe(true);

    expect(push).toHaveBeenCalledWith(expect.objectContaining({ path: "communityPosts" }));
    expect(set).toHaveBeenCalledWith(expect.anything(), {
      authorId: "user-1",
      author: "Author",
      authorType: "Student",
      authorImage: "avatar.jpg",
      authorBio: "bio",
      category: groupCategory,
      groupCode: "ABC123",
      title: "Title",
      body: "Body",
      image: "image.jpg",
      createdAt: 10_000,
      cheerCount: 0,
      commentCount: 0,
    });
  });

  it("reports post write failures", async () => {
    jest.mocked(set).mockRejectedValueOnce(new Error("write failed"));
    const { result } = await renderActions();

    await expect(
      result.current.submitPost({
        authorName: "Author",
        authorType: "Student",
        authorImage: null,
        authorBio: "",
        draftCategory: postCategory,
        draftGroupCode: "",
        draftTitle: "Title",
        draftBody: "Body",
        draftImage: null,
      }),
    ).resolves.toBe(false);

    expect(Alert.alert).toHaveBeenCalled();
  });

  it("toggles likes for signed-in users and reports failures", async () => {
    const { result } = await renderActions({
        posts: [makePost({ liked: true }), makePost({ id: "post-2" })],
        uid: "user-1",
      });

    await act(async () => {
      await result.current.toggleLike("post-1");
    });
    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({ path: "communityPostCheers/post-1/user-1" }),
    );

    await act(async () => {
      await result.current.toggleLike("post-2");
    });
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ path: "communityPostCheers/post-2/user-1" }),
      { authorId: "user-1", createdAt: 10_000 },
    );

    jest.mocked(set).mockRejectedValueOnce(new Error("bad"));
    await act(async () => {
      await result.current.toggleLike("post-2");
    });
    expect(Alert.alert).toHaveBeenCalled();
  });

  it("blocks likes when signed out", async () => {
    setCurrentUser(null);
    const { result } = await renderActions({ posts: [], uid: undefined });

    await act(async () => {
      await result.current.toggleLike("post-1");
    });

    expect(Alert.alert).toHaveBeenCalled();
    expect(set).not.toHaveBeenCalled();
  });

  it("confirms and deletes owned posts only", async () => {
    const { result } = await renderActions();

    await act(async () => {
      result.current.deletePost(makePost({ authorId: "other" }));
    });
    expect(Alert.alert).not.toHaveBeenCalled();

    await act(async () => {
      result.current.deletePost(makePost());
    });
    await act(async () => {
      await pressAlertButton(1);
    });

    expect(update).toHaveBeenCalledWith(expect.anything(), {
      "communityPostCheers/post-1": null,
      "communityPostComments/post-1": null,
      "communityPosts/post-1": null,
    });
  });

  it("reports post delete failures", async () => {
    jest.mocked(update).mockRejectedValueOnce(new Error("bad"));
    const { result } = await renderActions();

    await act(async () => {
      result.current.deletePost(makePost());
    });
    await act(async () => {
      await pressAlertButton(1);
    });

    expect(Alert.alert).toHaveBeenCalledTimes(2);
  });

  it("validates and writes comments", async () => {
    const selectedPost = makePost();
    const { result } = await renderActions();

    await expect(
      result.current.submitComment({
        selectedPost: null,
        draftComment: "Comment",
        authorName: "Author",
        authorImage: null,
      }),
    ).resolves.toBe(false);

    setCurrentUser(null);
    await expect(
      result.current.submitComment({
        selectedPost,
        draftComment: "Comment",
        authorName: "Author",
        authorImage: null,
      }),
    ).resolves.toBe(false);

    setCurrentUser({ uid: "user-1" });
    await expect(
      result.current.submitComment({
        selectedPost,
        draftComment: "   ",
        authorName: "Author",
        authorImage: null,
      }),
    ).resolves.toBe(false);

    await expect(
      result.current.submitComment({
        selectedPost,
        draftComment: "  Comment  ",
        authorName: "Author",
        authorImage: "avatar.jpg",
      }),
    ).resolves.toBe(true);

    expect(set).toHaveBeenCalledWith(expect.anything(), {
      authorId: "user-1",
      author: "Author",
      authorImage: "avatar.jpg",
      body: "Comment",
      createdAt: 10_000,
    });
  });

  it("reports comment write failures", async () => {
    jest.mocked(set).mockRejectedValueOnce(new Error("bad"));
    const { result } = await renderActions();

    await expect(
      result.current.submitComment({
        selectedPost: makePost(),
        draftComment: "Comment",
        authorName: "Author",
        authorImage: null,
      }),
    ).resolves.toBe(false);

    expect(Alert.alert).toHaveBeenCalled();
  });

  it("confirms and deletes owned comments only", async () => {
    const comment: CommunityComment = {
      id: "comment-1",
      postId: "post-1",
      authorId: "user-1",
      author: "Author",
      body: "Comment",
      createdAt: 1,
    };
    const { result } = await renderActions();

    await act(async () => {
      result.current.deleteComment({ ...comment, authorId: "other" });
    });
    expect(Alert.alert).not.toHaveBeenCalled();

    await act(async () => {
      result.current.deleteComment(comment);
    });
    await act(async () => {
      await pressAlertButton(1);
    });

    expect(remove).toHaveBeenCalledWith(
      expect.objectContaining({
        path: "communityPostComments/post-1/comment-1",
      }),
    );
  });

  it("reports comment delete failures", async () => {
    jest.mocked(remove).mockRejectedValueOnce(new Error("bad"));
    const { result } = await renderActions();

    await act(async () => {
      result.current.deleteComment({
        id: "comment-1",
        postId: "post-1",
        authorId: "user-1",
        author: "Author",
        body: "Comment",
        createdAt: 1,
      });
    });
    await act(async () => {
      await pressAlertButton(1);
    });

    expect(Alert.alert).toHaveBeenCalledTimes(2);
  });
});
