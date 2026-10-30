import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { get, push, update } from "firebase/database";

import {
  ACTIVE_SESSION_KEY,
  COLORS,
  MAX_GROUP_MEMBERS,
} from "../../../features/group/groupConstants";
import { useGroupJoinActions } from "../../../features/group/useGroupJoinActions";
import { useGroupRoomActions } from "../../../features/group/useGroupRoomActions";
import type { Room, StoredMember } from "../../../features/group/groupTypes";
import { STUDY_STATUS_PUBLIC_KEY } from "../../../utils/privacySettings";

jest.mock("firebase/database", () => ({
  get: jest.fn(),
  getDatabase: jest.fn(() => ({})),
  onValue: jest.fn(),
  push: jest.fn(() => ({ key: "room-new" })),
  ref: jest.fn((db, path) => ({ db, path })),
  set: jest.fn(() => Promise.resolve()),
  update: jest.fn(() => Promise.resolve()),
}));

const member: StoredMember = {
  id: "member-1",
  name: "Member",
  color: COLORS[0],
  image: "member.jpg",
  userType: "Student",
  bio: "bio",
};

const minimalMember: StoredMember = {
  id: "member-2",
  name: "Minimal",
  color: COLORS[1],
  image: null,
  userType: "",
  bio: "",
};

const nullishMember = {
  ...minimalMember,
  id: "member-3",
  userType: null,
  bio: null,
} as never as StoredMember;

const makeRoom = (overrides: Partial<Room> = {}): Room => ({
  id: "room-1",
  ownerId: "owner",
  name: "Room",
  emoji: "S",
  subjects: "Math",
  color: COLORS[0],
  max: 6,
  code: "ABC123",
  visibility: "public",
  createdAt: 1,
  members: [],
  ...overrides,
});

describe("group action hooks", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.spyOn(Date, "now").mockReturnValue(10_000);
    jest.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("normalizes code input and rejects short code joins", async () => {
    const { result } = await renderHook(() =>
      useGroupJoinActions({
        member,
        onJoined: jest.fn(),
        onLobbyError: jest.fn(),
      }),
    );

    await act(async () => {
      result.current.updateCodeInput("ab-cd123!");
    });
    expect(result.current.codeInput).toBe("ABCD12");

    await act(async () => {
      await result.current.joinByCode("ABC");
    });

    expect(result.current.codeError).toMatch(/\S+/);
    expect(get).not.toHaveBeenCalled();
  });

  it("ignores joins and room creation when required context is missing", async () => {
    const joinHook = await renderHook(() =>
      useGroupJoinActions({
        member: null,
        onJoined: jest.fn(),
        onLobbyError: jest.fn(),
      }),
    );

    await act(async () => {
      await joinHook.result.current.joinByCode("ABC123");
      await joinHook.result.current.joinLobbyRoom(makeRoom());
    });
    expect(get).not.toHaveBeenCalled();

    const roomHook = await renderHook(() =>
      useGroupRoomActions({
        member: null,
        selectedRoom: null,
        onError: jest.fn(),
        onCreated: jest.fn(),
        onLeft: jest.fn(),
      }),
    );
    await act(async () => {
      await roomHook.result.current.createRoom({
        roomName: "Valid Room",
        roomSubjects: "Math",
        roomMax: 4,
        roomVisibility: "public",
      });
    });
    expect(push).not.toHaveBeenCalled();
  });

  it("joins a room by code and preserves existing joinedAt", async () => {
    await AsyncStorage.multiSet([
      [ACTIVE_SESSION_KEY, JSON.stringify({ subject: "Math", startEpoch: 123 })],
      [STUDY_STATUS_PUBLIC_KEY, "false"],
    ]);
    jest
      .mocked(get)
      .mockResolvedValueOnce({
        exists: () => true,
        val: () => "room-1",
      } as never)
      .mockResolvedValueOnce({
        exists: () => true,
        val: () => ({
          ownerId: "owner",
          name: "Room",
          max: 6,
          code: "ABC123",
          members: {
            "member-1": {
              name: "Old",
              joinedAt: 500,
            },
          },
        }),
      } as never);
    const onJoined = jest.fn();
    const { result } = await renderHook(() =>
      useGroupJoinActions({
        member,
        onJoined,
        onLobbyError: jest.fn(),
      }),
    );

    await act(async () => {
      await result.current.joinByCode("abc123");
    });

    expect(update).not.toHaveBeenCalled();
    expect(result.current.codeInput).toBe("");
    expect(onJoined).toHaveBeenCalledWith("room-1");
    expect(result.current.joining).toBe(false);
  });

  it("does not rewrite the database when the member is already in the target room", async () => {
    jest.mocked(get).mockResolvedValueOnce({
      exists: () => true,
      val: () => ({
        ownerId: "owner",
        name: "Already Joined",
        max: 6,
        members: {
          "member-1": { name: "Member", joinedAt: 999 },
        },
      }),
    } as never);

    const onJoined = jest.fn();
    const onLobbyError = jest.fn();
    const { result } = await renderHook(() =>
      useGroupJoinActions({
        member,
        onJoined,
        onLobbyError,
      }),
    );

    await act(async () => {
      await result.current.joinLobbyRoom(makeRoom({ id: "already-joined" }));
    });

    expect(update).not.toHaveBeenCalled();
    expect(onJoined).toHaveBeenCalledWith("already-joined");
    expect(onLobbyError).toHaveBeenCalledWith("");
    expect(result.current.joining).toBe(false);
  });

  it("joins using the current code input and reports code lookup failures", async () => {
    jest
      .mocked(get)
      .mockResolvedValueOnce({
        exists: () => true,
        val: () => "room-2",
      } as never)
      .mockResolvedValueOnce({
        exists: () => true,
        val: () => ({
          ownerId: "owner",
          name: "Room 2",
          max: 6,
          code: "ZXCVBN",
          members: {},
        }),
      } as never);
    const onJoined = jest.fn();
    const { result } = await renderHook(() =>
      useGroupJoinActions({
        member,
        onJoined,
        onLobbyError: jest.fn(),
      }),
    );

    await act(async () => {
      result.current.setCodeInput("ZXCVBN");
    });
    await act(async () => {
      await result.current.handleCodeJoin();
    });

    expect(onJoined).toHaveBeenCalledWith("room-2");

    jest.mocked(get).mockRejectedValueOnce(new Error("lookup failed"));
    await act(async () => {
      await result.current.joinByCode("ABC123");
    });

    expect(result.current.codeError).toMatch(/lookup failed|\S+/);
  });

  it("joins by code with fallback member fields and current joinedAt", async () => {
    jest
      .mocked(get)
      .mockResolvedValueOnce({
        exists: () => true,
        val: () => "room-3",
      } as never)
      .mockResolvedValueOnce({
        exists: () => true,
        val: () => ({
          ownerId: "owner",
          name: "Room 3",
          max: 6,
          code: "ROOM33",
          members: {
            "member-2": {
              name: "Old",
            },
          },
        }),
      } as never);
    const { result } = await renderHook(() =>
      useGroupJoinActions({
        member: minimalMember,
        onJoined: jest.fn(),
        onLobbyError: jest.fn(),
      }),
    );

    await act(async () => {
      await result.current.joinByCode("ROOM33");
    });

    expect(update).not.toHaveBeenCalled();

    jest
      .mocked(get)
      .mockResolvedValueOnce({
        exists: () => true,
        val: () => "room-4",
      } as never)
      .mockResolvedValueOnce({
        exists: () => true,
        val: () => ({
          ownerId: "owner",
          name: "Room 4",
          max: 6,
          code: "ROOM44",
          members: {},
        }),
      } as never);
    const nullishHook = await renderHook(() =>
      useGroupJoinActions({
        member: nullishMember,
        onJoined: jest.fn(),
        onLobbyError: jest.fn(),
      }),
    );
    await act(async () => {
      await nullishHook.result.current.joinByCode("ROOM44");
    });
    expect(update).toHaveBeenCalledTimes(2);
  });

  it("handles missing code, stale room, full room, and join failures", async () => {
    const onLobbyError = jest.fn();
    const { result } = await renderHook(() =>
      useGroupJoinActions({
        member,
        onJoined: jest.fn(),
        onLobbyError,
      }),
    );

    jest.mocked(get).mockResolvedValueOnce({
      exists: () => false,
      val: () => null,
    } as never);
    await act(async () => {
      await result.current.joinByCode("ABC123");
    });
    expect(result.current.codeError).toMatch(/\S+/);

    jest
      .mocked(get)
      .mockResolvedValueOnce({
        exists: () => true,
        val: () => "missing-room",
      } as never)
      .mockResolvedValueOnce({
        exists: () => false,
        val: () => null,
      } as never);
    await act(async () => {
      await result.current.joinByCode("ABC123");
    });
    expect(update).toHaveBeenCalledWith(expect.anything(), {
      "roomCodes/ABC123": null,
    });

    jest.mocked(get).mockResolvedValueOnce({
      exists: () => true,
      val: () => ({
        ownerId: "owner",
        name: "Full",
        max: 1,
        members: {
          other: { name: "Other" },
        },
      }),
    } as never);
    await act(async () => {
      await result.current.joinLobbyRoom(makeRoom({ id: "full" }));
    });
    expect(onLobbyError).toHaveBeenCalledWith(expect.stringMatching(/\S+/));

    jest
      .mocked(get)
      .mockResolvedValueOnce({
        exists: () => true,
        val: () => "full-room",
      } as never)
      .mockResolvedValueOnce({
        exists: () => true,
        val: () => ({
          ownerId: "owner",
          name: "Full",
          max: 1,
          members: {
            other: { name: "Other" },
          },
        }),
      } as never);
    await act(async () => {
      await result.current.joinByCode("ABC123");
    });
    expect(result.current.codeError).toMatch(/\S+/);

    jest.mocked(get).mockResolvedValueOnce({
      exists: () => false,
      val: () => null,
    } as never);
    await act(async () => {
      await result.current.joinLobbyRoom(makeRoom({ id: "missing" }));
    });
    expect(onLobbyError).toHaveBeenCalledWith(expect.stringMatching(/\S+/));

    jest.mocked(get).mockResolvedValueOnce({
      exists: () => true,
      val: () => ({
        ownerId: "owner",
        name: "Open",
        max: 6,
        members: {},
      }),
    } as never);
    const onJoined = jest.fn();
    const joinHook = await renderHook(() =>
      useGroupJoinActions({
        member,
        onJoined,
        onLobbyError,
      }),
    );
    await act(async () => {
      await joinHook.result.current.joinLobbyRoom(makeRoom({ id: "open" }));
    });
    expect(onJoined).toHaveBeenCalledWith("open");

    jest.mocked(get).mockRejectedValueOnce(new Error("network"));
    await act(async () => {
      await result.current.joinLobbyRoom(makeRoom({ id: "broken" }));
    });
    expect(onLobbyError).toHaveBeenCalledWith(expect.stringMatching(/\S+/));
  });

  it("creates rooms with generated code, owner member payload, and callbacks", async () => {
    await AsyncStorage.multiSet([
      [ACTIVE_SESSION_KEY, JSON.stringify({ subject: "Science", startEpoch: 55 })],
      [STUDY_STATUS_PUBLIC_KEY, "true"],
    ]);
    jest.mocked(get).mockResolvedValue({
      exists: () => false,
    } as never);
    const onCreated = jest.fn();
    const onError = jest.fn();
    const { result } = await renderHook(() =>
      useGroupRoomActions({
        member,
        selectedRoom: null,
        onError,
        onCreated,
        onLeft: jest.fn(),
      }),
    );

    await act(async () => {
      await result.current.createRoom({
        roomName: "  New Room  ",
        roomSubjects: "",
        roomMax: 8,
        roomVisibility: "private",
      });
    });

    expect(push).toHaveBeenCalledWith(expect.objectContaining({ path: "rooms" }));
    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        "rooms/room-new": expect.objectContaining({
          ownerId: "member-1",
          name: "New Room",
          max: 8,
          visibility: "private",
          members: {
            "member-1": expect.objectContaining({
              name: "Member",
              status: "Science",
              studyStartEpoch: 55,
              studyStatusPublic: true,
              joinedAt: 10_000,
            }),
          },
        }),
      }),
    );
    expect(update).toHaveBeenCalledWith(expect.anything(), {
      "roomCodes/AAAAAA": "room-new",
    });
    expect(onError).toHaveBeenCalledWith("");
    expect(onCreated).toHaveBeenCalledWith("room-new");
    expect(result.current.creating).toBe(false);
  });

  it("rolls back room creation when invite code mapping fails", async () => {
    jest.mocked(get).mockResolvedValue({
      exists: () => false,
    } as never);
    jest
      .mocked(update)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("code map failed"))
      .mockResolvedValueOnce(undefined);
    const onCreated = jest.fn();
    const onError = jest.fn();
    const { result } = await renderHook(() =>
      useGroupRoomActions({
        member,
        selectedRoom: null,
        onError,
        onCreated,
        onLeft: jest.fn(),
      }),
    );

    await act(async () => {
      await result.current.createRoom({
        roomName: "Rollback Room",
        roomSubjects: "Math",
        roomMax: 4,
        roomVisibility: "public",
      });
    });

    expect(update).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      expect.objectContaining({
        "rooms/room-new": expect.objectContaining({
          code: "AAAAAA",
        }),
      }),
    );
    expect(update).toHaveBeenNthCalledWith(2, expect.anything(), {
      "roomCodes/AAAAAA": "room-new",
    });
    expect(update).toHaveBeenNthCalledWith(3, expect.anything(), {
      "rooms/room-new": null,
      "userRooms/member-1/room-new": null,
    });
    expect(onCreated).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/\S+/));

    jest.clearAllMocks();
    jest.mocked(get).mockResolvedValue({
      exists: () => false,
    } as never);
    jest
      .mocked(update)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("code map failed"))
      .mockRejectedValueOnce(new Error("cleanup failed"));
    const onCleanupError = jest.fn();
    const cleanupHook = await renderHook(() =>
      useGroupRoomActions({
        member,
        selectedRoom: null,
        onError: onCleanupError,
        onCreated,
        onLeft: jest.fn(),
      }),
    );

    await act(async () => {
      await cleanupHook.result.current.createRoom({
        roomName: "Cleanup Fail Room",
        roomSubjects: "Math",
        roomMax: 4,
        roomVisibility: "public",
      });
    });

    expect(update).toHaveBeenNthCalledWith(3, expect.anything(), {
      "rooms/room-new": null,
      "userRooms/member-1/room-new": null,
    });
    expect(onCleanupError).toHaveBeenCalledWith(expect.stringMatching(/\S+/));
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("creates rooms with fallback owner member fields", async () => {
    jest.mocked(get).mockResolvedValue({
      exists: () => false,
    } as never);
    const { result } = await renderHook(() =>
      useGroupRoomActions({
        member: minimalMember,
        selectedRoom: null,
        onError: jest.fn(),
        onCreated: jest.fn(),
        onLeft: jest.fn(),
      }),
    );

    await act(async () => {
      await result.current.createRoom({
        roomName: "Fallback Room",
        roomSubjects: "Math",
        roomMax: 4,
        roomVisibility: "public",
      });
    });

    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        "rooms/room-new": expect.objectContaining({
          members: {
            "member-2": expect.objectContaining({
              image: null,
              userType: "",
              bio: "",
            }),
          },
        }),
      }),
    );

    jest.clearAllMocks();
    jest.mocked(get).mockResolvedValue({
      exists: () => false,
    } as never);
    const nullishHook = await renderHook(() =>
      useGroupRoomActions({
        member: nullishMember,
        selectedRoom: null,
        onError: jest.fn(),
        onCreated: jest.fn(),
        onLeft: jest.fn(),
      }),
    );
    await act(async () => {
      await nullishHook.result.current.createRoom({
        roomName: "Nullish Room",
        roomSubjects: "Math",
        roomMax: 4,
        roomVisibility: "public",
      });
    });
    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        "rooms/room-new": expect.objectContaining({
          members: {
            "member-3": expect.objectContaining({
              userType: "",
              bio: "",
            }),
          },
        }),
      }),
    );
  });

  it("skips invalid room creation and reports create failures", async () => {
    const onError = jest.fn();
    const { result } = await renderHook(() =>
      useGroupRoomActions({
        member,
        selectedRoom: null,
        onError,
        onCreated: jest.fn(),
        onLeft: jest.fn(),
      }),
    );

    await act(async () => {
      await result.current.createRoom({
        roomName: "A",
        roomSubjects: "Math",
        roomMax: MAX_GROUP_MEMBERS,
        roomVisibility: "public",
      });
    });
    expect(push).not.toHaveBeenCalled();

    jest.mocked(push).mockReturnValueOnce({ key: null } as never);
    await act(async () => {
      await result.current.createRoom({
        roomName: "Valid",
        roomSubjects: "Math",
        roomMax: MAX_GROUP_MEMBERS,
        roomVisibility: "public",
      });
    });
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/\S+/));
  });

  it("reports a create error when invite code generation is exhausted", async () => {
    jest.mocked(get).mockResolvedValue({
      exists: () => true,
    } as never);
    const onError = jest.fn();
    const { result } = await renderHook(() =>
      useGroupRoomActions({
        member,
        selectedRoom: null,
        onError,
        onCreated: jest.fn(),
        onLeft: jest.fn(),
      }),
    );

    await act(async () => {
      await result.current.createRoom({
        roomName: "Valid Room",
        roomSubjects: "Math",
        roomMax: MAX_GROUP_MEMBERS,
        roomVisibility: "public",
      });
    });

    expect(get).toHaveBeenCalledTimes(8);
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/\S+/));
  });

  it("leaves selected rooms as owner, member, or missing context", async () => {
    const onLeft = jest.fn();
    const onError = jest.fn();

    const ownerHook = await renderHook(() =>
      useGroupRoomActions({
        member,
        selectedRoom: makeRoom({ ownerId: member.id, members: [member] }),
        onError,
        onCreated: jest.fn(),
        onLeft,
      }),
    );
    await act(async () => {
      await ownerHook.result.current.leaveRoomNow();
    });
    expect(update).toHaveBeenNthCalledWith(1, expect.anything(), {
      "roomCodes/ABC123": null,
      "userRooms/member-1/room-1": null,
    });
    expect(update).toHaveBeenNthCalledWith(2, expect.anything(), {
      "rooms/room-1": null,
    });
    expect(onLeft).toHaveBeenCalled();

    const memberHook = await renderHook(() =>
      useGroupRoomActions({
        member,
        selectedRoom: makeRoom({ ownerId: "other" }),
        onError,
        onCreated: jest.fn(),
        onLeft,
      }),
    );
    await act(async () => {
      await memberHook.result.current.leaveRoomNow();
    });
    expect(update).toHaveBeenCalledWith(expect.anything(), {
      "rooms/room-1/members/member-1": null,
      "userRooms/member-1/room-1": null,
    });

    const missingHook = await renderHook(() =>
      useGroupRoomActions({
        member: null,
        selectedRoom: null,
        onError,
        onCreated: jest.fn(),
        onLeft,
      }),
    );
    await act(async () => {
      await missingHook.result.current.leaveRoomNow();
    });
    expect(onLeft).toHaveBeenCalledTimes(2);
  });

  it("transfers ownership and removes the former owner's membership atomically", async () => {
    const onLeft = jest.fn();
    const successor = { ...minimalMember, id: "successor-1", name: "Successor" };
    const { result } = await renderHook(() =>
      useGroupRoomActions({
        member,
        selectedRoom: makeRoom({
          ownerId: member.id,
          members: [member, successor],
        }),
        onError: jest.fn(),
        onCreated: jest.fn(),
        onLeft,
      }),
    );

    await act(async () => {
      await result.current.transferOwnershipAndLeave(successor.id);
    });

    expect(update).toHaveBeenCalledWith(expect.anything(), {
      "rooms/room-1/ownerId": successor.id,
      "rooms/room-1/members/member-1": null,
      "userRooms/member-1/room-1": null,
    });
    expect(onLeft).toHaveBeenCalledTimes(1);
  });

  it("dissolves the room and clears every member index when its owner leaves", async () => {
    const successor = { ...minimalMember, id: "successor-1", name: "Successor" };
    const { result } = await renderHook(() =>
      useGroupRoomActions({
        member,
        selectedRoom: makeRoom({
          ownerId: member.id,
          members: [member, successor],
        }),
        onError: jest.fn(),
        onCreated: jest.fn(),
        onLeft: jest.fn(),
      }),
    );

    await act(async () => {
      await result.current.leaveRoomNow();
    });

    expect(update).toHaveBeenNthCalledWith(1, expect.anything(), {
      "roomCodes/ABC123": null,
      "userRooms/member-1/room-1": null,
      "userRooms/successor-1/room-1": null,
    });
    expect(update).toHaveBeenNthCalledWith(2, expect.anything(), {
      "rooms/room-1": null,
    });
  });

  it("reports leave failures without leaving the room", async () => {
    jest.mocked(update).mockRejectedValueOnce(new Error("bad"));
    const onLeft = jest.fn();
    const onError = jest.fn();
    const { result } = await renderHook(() =>
      useGroupRoomActions({
        member,
        selectedRoom: makeRoom({ ownerId: member.id }),
        onError,
        onCreated: jest.fn(),
        onLeft,
      }),
    );

    await act(async () => {
      await result.current.leaveRoomNow();
    });

    expect(onError).not.toHaveBeenCalled();
    expect(onLeft).not.toHaveBeenCalled();
  });
});
