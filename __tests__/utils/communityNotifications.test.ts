import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  buildCommunityNotifications,
  countUnreadCommunityNotifications,
  getCommunityNotificationsReadKey,
  loadCommunityNotificationsReadAt,
  saveCommunityNotificationsReadAt,
  subscribeCommunityNotificationSources,
} from "../../utils/communityNotifications";
import { onValue, ref } from "firebase/database";

describe("community notifications", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("uses user-scoped read keys", () => {
    expect(getCommunityNotificationsReadKey()).toBe(
      "community_notifications_read_at",
    );
    expect(getCommunityNotificationsReadKey("uid")).toBe(
      "community_notifications_read_at_uid",
    );
  });

  it("stores and loads read timestamps", async () => {
    await expect(loadCommunityNotificationsReadAt("uid")).resolves.toBe(0);

    await saveCommunityNotificationsReadAt("uid", 1234);

    await expect(loadCommunityNotificationsReadAt("uid")).resolves.toBe(1234);

    await AsyncStorage.setItem(getCommunityNotificationsReadKey("uid"), "bad");
    await expect(loadCommunityNotificationsReadAt("uid")).resolves.toBe(0);

    jest.spyOn(Date, "now").mockReturnValueOnce(5678);
    await saveCommunityNotificationsReadAt(null);
    await expect(loadCommunityNotificationsReadAt(null)).resolves.toBe(5678);
  });

  it("builds cheer and comment notifications only for my posts", () => {
    const notifications = buildCommunityNotifications({
      uid: "owner",
      posts: {
        mine: {
          authorId: "owner",
          author: "Me",
          category: "질문",
          title: "My post",
          body: "Body",
          createdAt: 100,
        },
        others: {
          authorId: "other",
          author: "Other",
          category: "질문",
          title: "Other post",
          body: "Body",
          createdAt: 100,
        },
      } as never,
      cheers: {
        mine: {
          actor: { createdAt: 300 },
          owner: { createdAt: 400 },
        },
      },
      comments: {
        mine: {
          comment1: {
            authorId: "actor",
            author: "Actor fallback",
            body: "Nice",
            createdAt: 200,
          },
          ownComment: {
            authorId: "owner",
            author: "Me",
            body: "Thanks",
            createdAt: 250,
          },
        },
      } as never,
      users: {
        actor: {
          name: "Actor",
          image: "actor-image",
        },
      },
    });

    expect(notifications.map((item) => item.id)).toEqual([
      "cheer-mine-actor",
      "comment-mine-comment1",
    ]);
    expect(notifications[0]).toMatchObject({
      type: "cheer",
      actorName: "Actor",
      createdAt: 300,
    });
    expect(notifications[1]).toMatchObject({
      type: "comment",
      body: "Nice",
      createdAt: 200,
    });
  });

  it("handles empty notification inputs and fallback actor/post values", () => {
    expect(
      buildCommunityNotifications({
        uid: null,
        posts: {},
        cheers: null,
        comments: null,
        users: null,
      }),
    ).toEqual([]);
    expect(
      buildCommunityNotifications({
        uid: "owner",
        posts: null,
        cheers: null,
        comments: null,
        users: null,
      }),
    ).toEqual([]);

    const notifications = buildCommunityNotifications({
      uid: "owner",
      posts: {
        mine: {
          authorId: "owner",
          author: "Me",
          category: "吏덈Ц",
          title: "",
          body: "",
          image: "post.jpg",
          createdAt: 100,
        },
      } as never,
      cheers: {
        mine: {
          falseCheer: false,
          legacyActor: true,
        },
      },
      comments: {
        mine: {
          comment1: {
            authorId: "commenter",
            author: "",
            authorImage: "commenter.jpg",
            body: "Nice",
            createdAt: 200,
          },
        },
      } as never,
      users: null,
    });

    expect(notifications).toHaveLength(2);
    expect(notifications.find((item) => item.type === "cheer")).toMatchObject({
      actorId: "legacyActor",
      actorImage: null,
      createdAt: 100,
      legacy: true,
      postBody: "",
      postImage: "post.jpg",
    });
    expect(notifications.find((item) => item.type === "comment")).toMatchObject({
      actorId: "commenter",
      actorImage: "commenter.jpg",
      body: "Nice",
      postImage: "post.jpg",
    });

    expect(
      buildCommunityNotifications({
        uid: "owner",
        posts: {
          mine: {
            authorId: "owner",
            author: "Me",
            category: "吏덈Ц",
            title: "No activity",
            body: "Body",
            createdAt: 100,
          },
        } as never,
        cheers: null,
        comments: null,
        users: null,
      }),
    ).toEqual([]);

    expect(
      buildCommunityNotifications({
        uid: "owner",
        posts: {
          mine: {
            authorId: "owner",
            author: "Me",
            category: "吏덈Ц",
            title: "Title",
            body: "Body",
            createdAt: 100,
          },
        } as never,
        cheers: {},
        comments: {
          mine: {
            commentNoImage: {
              authorId: "commenter",
              author: "",
              body: "No image",
              createdAt: 200,
            },
          },
        } as never,
        users: {},
      })[0],
    ).toMatchObject({
      actorImage: null,
      postImage: null,
    });
  });

  it("counts unread notifications with legacy handling", () => {
    expect(
      countUnreadCommunityNotifications(
        [
          { createdAt: 10, legacy: true },
          { createdAt: 20 },
          { createdAt: 30 },
        ] as never,
        20,
      ),
    ).toBe(1);

    expect(
      countUnreadCommunityNotifications(
        [
          { createdAt: 10, legacy: true },
          { createdAt: 20 },
        ] as never,
        0,
      ),
    ).toBe(2);
  });

  it("subscribes to all notification sources and cleans up", () => {
    const unsubscribeFns = [jest.fn(), jest.fn(), jest.fn(), jest.fn()];
    const unsubscribers = [...unsubscribeFns];
    const onChange = jest.fn();
    jest.mocked(onValue).mockImplementation((sourceRef, callback) => {
      const path = (sourceRef as unknown as { path: string }).path;
      callback({
        val: () => ({ [path]: true }),
      } as never);
      return unsubscribers.shift() ?? jest.fn();
    });

    const unsubscribe = subscribeCommunityNotificationSources(onChange);

    expect(ref).toHaveBeenCalledWith(expect.anything(), "communityPosts");
    expect(ref).toHaveBeenCalledWith(expect.anything(), "communityPostCheers");
    expect(ref).toHaveBeenCalledWith(expect.anything(), "communityPostComments");
    expect(ref).toHaveBeenCalledWith(expect.anything(), "users");
    expect(onChange).toHaveBeenCalledTimes(4);
    expect(onChange).toHaveBeenLastCalledWith({
      posts: { communityPosts: true },
      cheers: { communityPostCheers: true },
      comments: { communityPostComments: true },
      users: { users: true },
    });

    unsubscribe();
    unsubscribeFns.forEach((unsubscribeFn) => {
      expect(unsubscribeFn).toHaveBeenCalled();
    });
  });
});
