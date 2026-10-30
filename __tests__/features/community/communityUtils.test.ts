import {
  formatRelativeTime,
  getInitial,
  snapshotToCommentsByPost,
  snapshotToPosts,
  snapshotToRooms,
  sortPosts,
  toEmbeddedImageUri,
} from "../../../features/community/communityUtils";

describe("community utils", () => {
  it("formats image uri and initials", () => {
    expect(toEmbeddedImageUri("abc")).toBe("data:image/jpeg;base64,abc");
    expect(getInitial(" study")).toBe("S");
    expect(getInitial("")).toBe("S");
  });

  it("formats relative timestamps across minute, hour, and day buckets", () => {
    jest.spyOn(Date, "now").mockReturnValue(1000 * 60 * 60 * 25);

    expect(formatRelativeTime(Date.now())).toMatch(/\S+/);
    expect(formatRelativeTime(Date.now() - 30 * 60 * 1000)).toMatch(/\S+/);
    expect(formatRelativeTime(Date.now() - 3 * 60 * 60 * 1000)).toMatch(/\S+/);
    expect(formatRelativeTime(Date.now() - 25 * 60 * 60 * 1000)).toMatch(/\S+/);

    jest.restoreAllMocks();
  });

  it("sorts posts newest first without mutating input", () => {
    const posts = [
      { id: "old", createdAt: 1 },
      { id: "new", createdAt: 3 },
      { id: "mid", createdAt: 2 },
    ];

    expect(sortPosts(posts as never).map((post) => post.id)).toEqual([
      "new",
      "mid",
      "old",
    ]);
    expect(posts.map((post) => post.id)).toEqual(["old", "new", "mid"]);
  });

  it("maps post snapshots with profile, cheer, comment, and bookmark state", () => {
    const posts = snapshotToPosts(
      {
        post1: {
          authorId: "owner",
          author: "Fallback",
          authorType: "Student",
          category: "질문",
          title: "Title",
          body: "Body",
          createdAt: 10,
        },
      } as never,
      {
        post1: {
          uid: true,
          other: { createdAt: 20 },
        },
      },
      {
        post1: {
          comment1: {
            authorId: "other",
            author: "Other",
            body: "Comment",
            createdAt: 30,
          },
        },
      } as never,
      {
        owner: {
          name: "Owner",
          userType: "Teacher",
          image: "image",
          communityActivityPublic: true,
        },
      },
      new Set(["post1"]),
      "uid",
    );

    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      id: "post1",
      author: "Owner",
      authorType: "Teacher",
      likes: 2,
      comments: 1,
      liked: true,
      bookmarked: true,
      communityActivityPublic: true,
    });
  });

  it("maps empty and fallback post/comment snapshots", () => {
    expect(
      snapshotToPosts(null, {}, {}, {}, new Set(), undefined),
    ).toEqual([]);
    expect(snapshotToCommentsByPost(null)).toEqual({});

    const posts = snapshotToPosts(
      {
        post1: {
          authorId: "owner",
          author: "Fallback",
          authorType: "Student",
          authorImage: "fallback.jpg",
          authorBio: "bio",
          category: "吏덈Ц",
          groupCode: "ABC123",
          title: "Title",
          body: "Body",
          image: "post.jpg",
          createdAt: 10,
        },
      } as never,
      {},
      {},
      {},
      new Set(),
      undefined,
    );

    expect(posts[0]).toMatchObject({
      author: "Fallback",
      authorImage: "fallback.jpg",
      authorBio: "bio",
      groupCode: "ABC123",
      image: "post.jpg",
      liked: false,
      bookmarked: false,
      comments: 0,
    });
  });

  it("sorts comments oldest first", () => {
    expect(
      snapshotToCommentsByPost({
        post1: {
          later: { authorId: "a", author: "A", body: "2", createdAt: 2 },
          earlier: { authorId: "b", author: "B", body: "1", createdAt: 1 },
        },
      } as never).post1.map((comment) => comment.id),
    ).toEqual(["earlier", "later"]);
  });

  it("returns public live rooms with public member counts", () => {
    const rooms = snapshotToRooms({
      newest: {
        visibility: "public",
        name: "Newest",
        createdAt: 10,
        members: { a: { online: true, studyStartEpoch: 1 } },
      },
      second: {
        visibility: "public",
        name: "Second",
        createdAt: 9,
        members: { a: { online: true, studyStartEpoch: 1 } },
      },
      third: {
        visibility: "public",
        name: "Third",
        createdAt: 8,
        members: { a: { online: true, studyStartEpoch: 1 } },
      },
      fourth: {
        visibility: "public",
        name: "Fourth",
        createdAt: 7,
        members: { a: { online: true, studyStartEpoch: 1 } },
      },
      fifth: {
        visibility: "public",
        name: "Fifth",
        createdAt: 6,
        members: { a: { online: true, studyStartEpoch: 1 } },
      },
      sixth: {
        visibility: "public",
        name: "Sixth",
        createdAt: 5,
        members: { a: { online: true, studyStartEpoch: 1 } },
      },
      privateRoom: {
        visibility: "private",
        createdAt: 3,
        members: { a: { online: true, studyStartEpoch: 1 } },
      },
      emptyPublic: {
        visibility: "public",
        createdAt: 2,
        members: {},
      },
      publicRoom: {
        visibility: "public",
        name: "Public",
        code: "ABC123",
        createdAt: 1,
        members: {
          visible: { online: true, studyStartEpoch: 1 },
          hidden: { studyStatusPublic: false },
        },
      },
    } as never);

    expect(rooms).toHaveLength(5);
    expect(rooms.map((room) => room.id)).toEqual([
      "newest",
      "second",
      "third",
      "fourth",
      "fifth",
    ]);

    expect(snapshotToRooms(null)).toEqual([]);
    expect(
      snapshotToRooms({
        noMembers: {
          visibility: "public",
        },
        fallbackRoom: {
          members: {
            nullMember: null,
            primitive: true,
            visible: { studyStatusPublic: true, online: true, studyStartEpoch: 1 },
          },
        },
      } as never)[0],
    ).toMatchObject({
      id: "fallbackRoom",
      code: "",
      createdAt: 0,
      memberCount: 1,
    });
  });
});
