import { buildAccountCleanupUpdates } from "../../utils/accountCleanup";

describe("account cleanup helpers", () => {
  it("always removes the deleted user profile", () => {
    expect(buildAccountCleanupUpdates("user-1", {})).toEqual({
      "users/user-1": null,
      "publicProfiles/user-1": null,
      "userRooms/user-1": null,
    });
  });

  it("removes posts owned by the user and dependent reactions/comments", () => {
    expect(
      buildAccountCleanupUpdates("user-1", {
        communityPosts: {
          "post-1": { authorId: "user-1" },
          "post-2": { authorId: "other" },
        },
        communityPostCheers: {
          "post-1": {
            "user-2": { authorId: "user-2", createdAt: 1 },
          },
          "post-2": {
            "user-1": true,
            "user-2": true,
          },
        },
        communityPostComments: {
          "post-1": {
            "comment-1": { authorId: "user-2" },
          },
          "post-2": {
            "comment-2": { authorId: "user-1" },
            "comment-3": { authorId: "user-2" },
          },
        },
      }),
    ).toEqual({
      "users/user-1": null,
      "publicProfiles/user-1": null,
      "userRooms/user-1": null,
      "communityPosts/post-1": null,
      "communityPostCheers/post-1/user-2": null,
      "communityPostCheers/post-2/user-1": null,
      "communityPostComments/post-1/comment-1": null,
      "communityPostComments/post-2/comment-2": null,
    });
  });

  it("removes owned rooms and joined memberships", () => {
    expect(
      buildAccountCleanupUpdates("user-1", {
        rooms: {
          "room-owned": {
            ownerId: "user-1",
            code: "ABC123",
            members: { "user-2": true },
          },
          "room-joined": {
            ownerId: "user-2",
            members: { "user-1": true, "user-2": true },
          },
          "room-unrelated": {
            ownerId: "user-3",
            members: { "user-2": true },
          },
        },
      }),
    ).toEqual({
      "users/user-1": null,
      "publicProfiles/user-1": null,
      "userRooms/user-1": null,
      "rooms/room-owned": null,
      "roomCodes/ABC123": null,
      "rooms/room-joined/members/user-1": null,
      "userRooms/user-1/room-joined": null,
      "userRooms/user-2/room-owned": null,
    });
  });

  it("handles nullish nested cleanup collections and owner rooms without codes", () => {
    expect(
      buildAccountCleanupUpdates("user-1", {
        communityPostCheers: {
          "post-1": null as never,
        },
        communityPostComments: {
          "post-1": null as never,
        },
        rooms: {
          "room-owned": {
            ownerId: "user-1",
            code: "",
          },
        },
      }),
    ).toEqual({
      "users/user-1": null,
      "publicProfiles/user-1": null,
      "userRooms/user-1": null,
      "rooms/room-owned": null,
    });
  });
});
