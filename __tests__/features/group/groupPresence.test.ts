import AsyncStorage from "@react-native-async-storage/async-storage";

import { ACTIVE_SESSION_KEY, MEMBER_KEY } from "../../../features/group/groupConstants";
import { syncCurrentMemberToJoinedRooms } from "../../../features/group/groupPresence";
import { auth } from "../../../utils/firebaseConfig";
import { STUDY_STATUS_PUBLIC_KEY } from "../../../utils/privacySettings";
import { USER_PROFILE_KEY } from "../../../utils/userProfileStorage";
import { get, onDisconnect, ref, update } from "firebase/database";

jest.mock("firebase/database", () => ({
  get: jest.fn(),
  getDatabase: jest.fn(() => ({})),
  onDisconnect: jest.fn(() => ({
    cancel: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
  })),
  onValue: jest.fn(),
  ref: jest.fn((db, path) => ({ db, path })),
  set: jest.fn(() => Promise.resolve()),
  update: jest.fn(() => Promise.resolve()),
}));

const setCurrentUser = (user: unknown) => {
  Object.defineProperty(auth, "currentUser", {
    configurable: true,
    value: user,
    writable: true,
  });
};

describe("group presence sync", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(10_000);
    setCurrentUser(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("does nothing when there is no current member", async () => {
    await syncCurrentMemberToJoinedRooms();

    expect(get).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it("syncs a stored local member to joined rooms", async () => {
    await AsyncStorage.multiSet([
      [
        MEMBER_KEY,
        JSON.stringify({
          id: "member-1",
          name: "Local Member",
          color: "#111111",
          image: "local.jpg",
          userType: "Student",
          bio: "bio",
        }),
      ],
      [
        ACTIVE_SESSION_KEY,
        JSON.stringify({
          subject: "Math",
          startEpoch: 1_000,
        }),
      ],
      [STUDY_STATUS_PUBLIC_KEY, "false"],
    ]);
    const disconnectUpdate = jest.fn(() => Promise.resolve());
    jest.mocked(onDisconnect).mockReturnValue({
      cancel: jest.fn(() => Promise.resolve()),
      update: disconnectUpdate,
    } as never);
    jest.mocked(get).mockResolvedValueOnce({
      val: () => ({ joined: true }),
    } as never);
    jest.mocked(get).mockResolvedValueOnce({
      val: () => ({
        members: {
          "member-1": {
            joinedAt: 100,
            speaking: true,
            status: "old",
          },
        },
      }),
    } as never);

    await syncCurrentMemberToJoinedRooms();

    expect(ref).toHaveBeenCalledWith(expect.anything(), "userRooms/member-1");
    expect(ref).toHaveBeenCalledWith(expect.anything(), "rooms/joined");
    expect(ref).toHaveBeenCalledWith(
      expect.anything(),
      "rooms/joined/members/member-1",
    );
    expect(disconnectUpdate).toHaveBeenCalledWith({
      online: false,
      lastSeenAt: 10_000,
    });
    expect(update).toHaveBeenCalledWith(expect.anything(), {
      "rooms/joined/members/member-1": {
        joinedAt: 100,
        speaking: true,
        status: "Math",
        name: "Local Member",
        color: "#111111",
        image: "local.jpg",
        userType: "Student",
        bio: "bio",
        studyStatusPublic: false,
        online: true,
        lastSeenAt: 10_000,
        studyStartEpoch: 1_000,
      },
    });

    jest.clearAllMocks();
    await AsyncStorage.setItem(
      MEMBER_KEY,
      JSON.stringify({
        id: "member-2",
        name: "Nullish Member",
        color: "#222222",
        userType: null,
        bio: null,
      }),
    );
    jest.mocked(get).mockResolvedValueOnce({
      val: () => ({ joined: true }),
    } as never);
    jest.mocked(get).mockResolvedValueOnce({
      val: () => ({
        members: {
          "member-2": {},
        },
      }),
    } as never);

    await syncCurrentMemberToJoinedRooms();

    expect(update).toHaveBeenCalledWith(expect.anything(), {
      "rooms/joined/members/member-2": expect.objectContaining({
        userType: "",
        bio: "",
      }),
    });
  });

  it("uses authenticated profile data, explicit session, and requested online state", async () => {
    setCurrentUser({
      uid: "user-1",
      displayName: "Display",
      email: "user@example.com",
      photoURL: "photo.jpg",
    });
    await AsyncStorage.multiSet([
      [
        MEMBER_KEY,
        JSON.stringify({
          id: "old-local",
          name: "Stored Name",
          color: "#222222",
          image: "stored.jpg",
          userType: "Stored",
          bio: "stored bio",
        }),
      ],
      [
        USER_PROFILE_KEY,
        JSON.stringify({
          name: "Profile Name",
          image: "profile.jpg",
          userType: "Teacher",
          bio: "profile bio",
        }),
      ],
      [STUDY_STATUS_PUBLIC_KEY, "true"],
    ]);
    jest.mocked(get).mockResolvedValueOnce({
      val: () => ({ room: true }),
    } as never);
    jest.mocked(get).mockResolvedValueOnce({
      val: () => ({
        members: {
          "user-1": {
            joinedAt: 200,
          },
        },
      }),
    } as never);

    await syncCurrentMemberToJoinedRooms({
      online: false,
      session: { status: "Paused", studyStartEpoch: null },
    });

    await expect(AsyncStorage.getItem(MEMBER_KEY)).resolves.toContain(
      "Profile Name",
    );
    expect(update).toHaveBeenCalledWith(expect.anything(), {
      "rooms/room/members/user-1": expect.objectContaining({
        name: "Profile Name",
        color: "#222222",
        image: "profile.jpg",
        userType: "Teacher",
        bio: "profile bio",
        studyStatusPublic: true,
        online: false,
        status: "Paused",
        studyStartEpoch: null,
      }),
    });
  });

  it("skips updates when there are no rooms or no joined rooms", async () => {
    await AsyncStorage.setItem(
      MEMBER_KEY,
      JSON.stringify({
        id: "member-1",
        name: "Member",
        color: "#111111",
      }),
    );

    jest.mocked(get).mockResolvedValueOnce({ val: () => null } as never);
    await syncCurrentMemberToJoinedRooms();
    expect(update).not.toHaveBeenCalled();

    jest.mocked(get).mockResolvedValueOnce({
      val: () => ({ room: true }),
    } as never);
    jest.mocked(get).mockResolvedValueOnce({
      val: () => ({ members: { other: {} } }),
    } as never);
    await syncCurrentMemberToJoinedRooms();
    expect(update).toHaveBeenCalledWith(expect.anything(), {
      "userRooms/member-1/room": null,
    });

    jest.clearAllMocks();
    jest.mocked(get).mockResolvedValueOnce({
      val: () => ({ missing: true }),
    } as never);
    jest.mocked(get).mockResolvedValueOnce({ val: () => null } as never);
    await syncCurrentMemberToJoinedRooms();
    expect(update).toHaveBeenCalledWith(expect.anything(), {
      "userRooms/member-1/missing": null,
    });
  });

  it("falls back when stored member and profile JSON cannot be parsed", async () => {
    setCurrentUser({
      uid: "user-1",
      email: "fallback@example.com",
      displayName: null,
      photoURL: null,
    });
    await AsyncStorage.multiSet([
      [MEMBER_KEY, "{bad json"],
      [USER_PROFILE_KEY, "{bad json"],
    ]);
    jest.mocked(get).mockResolvedValueOnce({
      val: () => ({ room: true }),
    } as never);
    jest.mocked(get).mockResolvedValueOnce({
      val: () => ({
        members: {
          "user-1": {},
        },
      }),
    } as never);

    await syncCurrentMemberToJoinedRooms();

    expect(update).toHaveBeenCalledWith(expect.anything(), {
      "rooms/room/members/user-1": expect.objectContaining({
        name: "fallback",
      }),
    });
  });

  it("uses anonymous authenticated fallbacks when no profile fields exist", async () => {
    setCurrentUser({
      uid: "user-2",
      email: null,
      displayName: null,
      photoURL: null,
    });
    await AsyncStorage.multiSet([
      [
        MEMBER_KEY,
        JSON.stringify({
          id: "user-2",
          name: "",
          color: "",
          image: null,
          userType: null,
          bio: null,
        }),
      ],
      [
        USER_PROFILE_KEY,
        JSON.stringify({
          name: "",
          color: "",
          image: null,
          userType: null,
          bio: null,
        }),
      ],
    ]);
    jest.mocked(get).mockResolvedValueOnce({
      val: () => ({ room: true }),
    } as never);
    jest.mocked(get).mockResolvedValueOnce({
      val: () => ({
        members: {
          "user-2": {},
        },
      }),
    } as never);

    await syncCurrentMemberToJoinedRooms();

    expect(update).toHaveBeenCalledWith(expect.anything(), {
      "rooms/room/members/user-2": expect.objectContaining({
        color: expect.any(String),
        image: null,
        userType: "",
        bio: "",
        speaking: false,
      }),
    });
  });
});
