import { fireEvent, render } from "@testing-library/react-native";

import { monoLight } from "../../../constants/mono";
import { CategoryTabs } from "../../../features/community/components/CategoryTabs";
import { CommentSheet } from "../../../features/community/components/CommentSheet";
import { PostCard } from "../../../features/community/components/PostCard";
import { categories } from "../../../features/community/communityConstants";
import { createStyles } from "../../../features/community/communityStyles";
import type { CommunityPost } from "../../../features/community/communityTypes";

describe("community components", () => {
  const styles = createStyles(monoLight);

  const basePost: CommunityPost = {
    id: "post-1",
    authorId: "user-1",
    author: "Alice",
    authorType: "Student",
    category: categories[3],
    title: "How do I study algorithms?",
    body: "I need a weekly plan.",
    createdAt: Date.now(),
    likes: 3,
    comments: 2,
    liked: false,
    bookmarked: false,
  };

  it("selects a category tab", async () => {
    const onSelectCategory = jest.fn();
    const { getByText } = await render(
      <CategoryTabs
        selectedCategory={categories[0]}
        onSelectCategory={onSelectCategory}
        s={styles}
      />,
    );

    await fireEvent.press(getByText(categories[3]));

    expect(onSelectCategory).toHaveBeenCalledWith(categories[3]);
  });

  it("renders a post and wires core actions", async () => {
    const onOpenProfile = jest.fn();
    const onDelete = jest.fn();
    const onToggleLike = jest.fn();
    const onOpenComments = jest.fn();
    const onBookmark = jest.fn();
    const onOpenGroup = jest.fn();
    const onMore = jest.fn();

    const { getAllByLabelText, getByLabelText, getByText } = await render(
      <PostCard
        post={basePost}
        uid="user-1"
        s={styles}
        C={monoLight}
        onOpenProfile={onOpenProfile}
        onDelete={onDelete}
        onToggleLike={onToggleLike}
        onOpenComments={onOpenComments}
        onBookmark={onBookmark}
        onOpenGroup={onOpenGroup}
        onMore={onMore}
      />,
    );

    expect(getByText("Alice")).toBeTruthy();
    expect(getByText("How do I study algorithms?")).toBeTruthy();
    expect(getByText("I need a weekly plan.")).toBeTruthy();

    await fireEvent.press(getAllByLabelText("Alice 프로필 열기")[0]);
    await fireEvent.press(getByLabelText("게시글 삭제"));
    await fireEvent.press(getByLabelText("게시글 응원"));
    await fireEvent.press(getByLabelText("댓글 열기"));
    await fireEvent.press(getByLabelText("게시글 저장"));

    expect(onOpenProfile).toHaveBeenCalledWith(basePost);
    expect(onDelete).toHaveBeenCalledWith(basePost);
    expect(onToggleLike).toHaveBeenCalledWith("post-1");
    expect(onOpenComments).toHaveBeenCalledWith(basePost);
    expect(onBookmark).toHaveBeenCalledWith("post-1");
    expect(onOpenGroup).not.toHaveBeenCalled();
  });

  it("opens the group action for recruiting posts", async () => {
    const onBookmark = jest.fn();
    const onOpenGroup = jest.fn();
    const recruitingPost: CommunityPost = {
      ...basePost,
      id: "post-2",
      category: categories[5],
      groupCode: "ABC123",
    };

    const { getByText } = await render(
      <PostCard
        post={recruitingPost}
        uid="other-user"
        s={styles}
        C={monoLight}
        onOpenProfile={jest.fn()}
        onDelete={jest.fn()}
        onToggleLike={jest.fn()}
        onOpenComments={jest.fn()}
        onBookmark={onBookmark}
        onOpenGroup={onOpenGroup}
        onMore={jest.fn()}
      />,
    );

    await fireEvent.press(getByText("바로 입장"));

    expect(onOpenGroup).toHaveBeenCalledWith(recruitingPost);
    expect(onBookmark).not.toHaveBeenCalled();
  });

  it("opens a comment author's public profile", async () => {
    const onOpenProfile = jest.fn();
    const comment = {
      id: "comment-1",
      postId: basePost.id,
      authorId: "commenter-1",
      author: "Commenter",
      body: "Helpful advice",
      createdAt: Date.now(),
    };

    const { getByText } = await render(
      <CommentSheet
        selectedPost={basePost}
        comments={[comment]}
        draftComment=""
        uid="user-1"
        bottomInset={0}
        topInset={0}
        s={styles}
        C={monoLight}
        onClose={jest.fn()}
        onChangeComment={jest.fn()}
        onSubmit={jest.fn()}
        onDeleteComment={jest.fn()}
        onMoreComment={jest.fn()}
        onOpenProfile={onOpenProfile}
      />,
    );

    await fireEvent.press(getByText("Commenter"));

    expect(onOpenProfile).toHaveBeenCalledWith("commenter-1");
  });
});
