import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import CommunityScreen from "../../app/community";

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
};
const mockLoadAuthorProfile = jest.fn();
const mockLoadBookmarks = jest.fn();
const mockToggleBookmark = jest.fn();
const mockSubmitPost = jest.fn(() => Promise.resolve(true));
const mockToggleLike = jest.fn();
const mockDeletePost = jest.fn();
const mockSubmitComment = jest.fn(() => Promise.resolve(true));
const mockDeleteComment = jest.fn();
const mockOpenComments = jest.fn();
const mockResetDraft = jest.fn();
const mockResetDraftComment = jest.fn();

jest.mock("expo-router", () => ({
  useFocusEffect: jest.fn((effect: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(effect, [effect]);
  }),
  useLocalSearchParams: jest.fn(() => ({})),
  useRouter: () => mockRouter,
}));

jest.mock("../../components/BottomNav", () => ({
  __esModule: true,
  default: () => null,
  getBottomNavSpace: jest.fn((bottomInset: number) => 80 + bottomInset),
}));

jest.mock("../../features/community/components", () => {
  const React = require("react");
  const { Text, TouchableOpacity, View } = require("react-native");

  return {
    CategoryTabs: ({ onSelectCategory }: { onSelectCategory: (category: string) => void }) => (
      <TouchableOpacity
        testID="community-category-tab"
        onPress={() => onSelectCategory("질문")}
      >
        <Text>Category Tabs</Text>
      </TouchableOpacity>
    ),
    CommentSheet: ({ onSubmit }: { onSubmit: () => void }) => (
      <TouchableOpacity testID="community-comment-submit" onPress={onSubmit}>
        <Text>Comment Sheet</Text>
      </TouchableOpacity>
    ),
    ComposeSheet: ({
      visible,
      onSubmit,
    }: {
      visible: boolean;
      onSubmit: () => void;
    }) =>
      visible ? (
        <TouchableOpacity testID="community-compose-submit" onPress={onSubmit}>
          <Text>Compose Sheet</Text>
        </TouchableOpacity>
      ) : null,
    CommunityHeader: ({
      onBack,
      onCompose,
    }: {
      onBack: () => void;
      onCompose: () => void;
    }) => (
      <View>
        <TouchableOpacity testID="community-back-button" onPress={onBack}>
          <Text>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="community-compose-button" onPress={onCompose}>
          <Text>Compose</Text>
        </TouchableOpacity>
      </View>
    ),
    LiveStudyPanel: ({ onOpenGroup }: { onOpenGroup: () => void }) => (
      <TouchableOpacity testID="community-live-group-button" onPress={onOpenGroup}>
        <Text>Live Study Panel</Text>
      </TouchableOpacity>
    ),
    PostCard: ({
      post,
      onOpenComments,
      onBookmark,
      onOpenGroup,
      onToggleLike,
    }: {
      post: { id: string };
      onOpenComments: (post: unknown) => void;
      onBookmark: (postId: string) => void;
      onOpenGroup: (post: unknown) => void;
      onToggleLike: (postId: string) => void;
    }) => (
      <View>
        <Text>Mock Post</Text>
        <TouchableOpacity
          testID="community-post-comments-button"
          onPress={() => onOpenComments(post)}
        >
          <Text>Comments</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="community-post-like-button"
          onPress={() => onToggleLike(post.id)}
        >
          <Text>Like</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="community-post-bookmark-button"
          onPress={() => onBookmark(post.id)}
        >
          <Text>Bookmark</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="community-post-group-button"
          onPress={() => onOpenGroup(post)}
        >
          <Text>Group</Text>
        </TouchableOpacity>
      </View>
    ),
    ProfilePreviewModal: () => null,
  };
});

jest.mock("../../features/community/useCommunityAuthorProfile", () => ({
  useCommunityAuthorProfile: () => ({
    authorProfile: {
      authorName: "Tester",
      authorImage: null,
      authorType: "Student",
    },
    loadAuthorProfile: mockLoadAuthorProfile,
  }),
}));

jest.mock("../../features/community/useCommunityBookmarks", () => ({
  useCommunityBookmarks: () => ({
    bookmarkedPostIds: [],
    loadBookmarks: mockLoadBookmarks,
    toggleBookmark: mockToggleBookmark,
  }),
}));

jest.mock("../../features/community/useCommunityCategoryFilter", () => ({
  useCommunityCategoryFilter: (posts: unknown[]) => ({
    selectedCategory: "전체",
    setSelectedCategory: jest.fn(),
    filteredPosts: posts,
  }),
}));

jest.mock("../../features/community/useCommunityCommentsSheet", () => ({
  useCommunityCommentsSheet: () => ({
    selectedPost: null,
    comments: [],
    draftComment: "Nice work",
    openComments: mockOpenComments,
    closeComments: jest.fn(),
    resetDraftComment: mockResetDraftComment,
    setDraftComment: jest.fn(),
  }),
}));

jest.mock("../../features/community/useCommunityComposeDraft", () => ({
  useCommunityComposeDraft: () => ({
    draftBody: "Body",
    draftCategory: "질문",
    draftGroupCode: "",
    draftImage: null,
    draftTitle: "Title",
    changeCategory: jest.fn(),
    changeGroupCode: jest.fn(),
    pickImage: jest.fn(),
    removeImage: jest.fn(),
    resetDraft: mockResetDraft,
    setDraftBody: jest.fn(),
    setDraftTitle: jest.fn(),
  }),
}));

jest.mock("../../features/community/useCommunityFeed", () => ({
  useCommunityFeed: () => ({
    commentsByPost: {},
    loadError: "",
    loadingPosts: false,
    posts: [
      {
        id: "post-1",
        authorId: "user-1",
        author: "Tester",
        category: "질문",
        title: "Mock Post",
        body: "Body",
        createdAt: Date.now(),
        likes: 0,
        comments: 0,
        groupCode: "ABC123",
      },
    ],
  }),
}));

jest.mock("../../features/community/useCommunityActions", () => ({
  useCommunityActions: () => ({
    deleteComment: mockDeleteComment,
    deletePost: mockDeletePost,
    submitComment: mockSubmitComment,
    submitPost: mockSubmitPost,
    toggleLike: mockToggleLike,
  }),
}));

jest.mock("../../features/community/useCommunityPostTarget", () => ({
  useCommunityPostTarget: () => ({
    feedScrollRef: { current: null },
    registerPostLayout: jest.fn(),
    targetPostId: null,
  }),
}));

jest.mock("../../features/community/useCommunityProfilePreview", () => ({
  useCommunityProfilePreview: () => ({
    closeProfilePreview: jest.fn(),
    openProfilePreview: jest.fn(),
    selectedProfile: null,
  }),
}));

jest.mock("../../features/community/useLiveStudyRooms", () => ({
  useLiveStudyRooms: () => [],
}));

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 24, right: 0, bottom: 24, left: 0 },
};

describe("CommunityScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders feed and wires primary navigation/actions", async () => {
    const { getByTestId, getByText } = await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CommunityScreen />
      </SafeAreaProvider>,
    );

    await waitFor(() => {
      expect(getByText("Mock Post")).toBeTruthy();
    });
    expect(mockLoadAuthorProfile).toHaveBeenCalled();
    expect(mockLoadBookmarks).toHaveBeenCalled();

    await fireEvent.press(getByTestId("community-back-button"));
    await fireEvent.press(getByTestId("community-live-group-button"));
    await fireEvent.press(getByTestId("community-post-comments-button"));
    await fireEvent.press(getByTestId("community-post-like-button"));
    await fireEvent.press(getByTestId("community-post-bookmark-button"));
    await fireEvent.press(getByTestId("community-post-group-button"));

    expect(mockRouter.replace).toHaveBeenCalledWith("/main");
    expect(mockRouter.push).toHaveBeenCalledWith("/Group");
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/Group",
      params: { code: "ABC123" },
    });
    expect(mockOpenComments).toHaveBeenCalled();
    expect(mockToggleLike).toHaveBeenCalledWith("post-1");
    expect(mockToggleBookmark).toHaveBeenCalledWith("post-1");
  });

  it("opens compose sheet and submits a post", async () => {
    const { getByTestId } = await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <CommunityScreen />
      </SafeAreaProvider>,
    );

    await fireEvent.press(getByTestId("community-compose-button"));
    await fireEvent.press(getByTestId("community-compose-submit"));

    await waitFor(() => {
      expect(mockSubmitPost).toHaveBeenCalledWith(
        expect.objectContaining({
          authorName: "Tester",
          draftTitle: "Title",
          draftBody: "Body",
        }),
      );
    });
    expect(mockResetDraft).toHaveBeenCalled();
  });
});
