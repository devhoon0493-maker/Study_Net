import {
  publicProfileUpdate,
  toPublicProfile,
} from "../../utils/publicProfile";

describe("public profile helpers", () => {
  it("omits undefined privacy flags from Firebase update payloads", () => {
    const profile = toPublicProfile({
      name: "Park",
      email: "park@example.com",
      userType: "대학생",
    });

    expect(profile).toEqual({
      name: "Park",
      userType: "대학생",
      image: null,
      bio: "",
      color: "",
      updatedAt: expect.any(Number),
    });
    expect(profile).not.toHaveProperty("studyStatusPublic");
    expect(profile).not.toHaveProperty("communityActivityPublic");
  });

  it("keeps explicit privacy flags in public profile updates", () => {
    expect(
      publicProfileUpdate("user-1", {
        name: "Park",
        studyStatusPublic: false,
        communityActivityPublic: true,
        updatedAt: 1000,
      }),
    ).toEqual({
      "publicProfiles/user-1": {
        name: "Park",
        userType: "",
        image: null,
        bio: "",
        color: "",
        studyStatusPublic: false,
        communityActivityPublic: true,
        updatedAt: 1000,
      },
    });
  });
});
