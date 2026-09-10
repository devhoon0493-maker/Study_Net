import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";
import { onDisconnect, update } from "firebase/database";

import { ACTIVE_SESSION_KEY, COLORS } from "../../../features/group/groupConstants";
import { useGroupPresenceSync } from "../../../features/group/useGroupPresenceSync";
import type { Room, StoredMember } from "../../../features/group/groupTypes";
import { STUDY_STATUS_PUBLIC_KEY } from "../../../utils/privacySettings";

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
  members: [],
  ...overrides,
});

describe("useGroupPresenceSync", () => {
  let appStateListener: ((state: string) => void) | null = null;

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    appStateListener = null;
    jest.useFakeTimers();
    jest.spyOn(Date, "now").mockReturnValue(10_000);
    Object.defineProperty(AppState, "currentState", {
      configurable: true,
      value: "active",
    });
    jest.spyOn(AppState, "addEventListener").mockImplementation((event, listener) => {
      appStateListener = listener as (state: string) => void;
      return {
        remove: jest.fn(),
      } as never;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("does nothing when there is no member or no joined rooms", async () => {
    const { result } = await renderHook(() =>
      useGroupPresenceSync({
        member: null,
        rooms: [makeRoom()],
        selectedRoomId: null,
        screen: "lobby",
        onError: jest.fn(),
      }),
    );

    await act(async () => {
      await result.current.syncMyStudyStatusToJoinedRooms();
    });

    expect(update).not.toHaveBeenCalled();
    expect(AppState.addEventListener).not.toHaveBeenCalled();
  });

  it("syncs the selected room while viewing a room", async () => {
    await AsyncStorage.multiSet([
      [ACTIVE_SESSION_KEY, JSON.stringify({ subject: "Math", startEpoch: 123 })],
      [STUDY_STATUS_PUBLIC_KEY, "false"],
    ]);

    const { unmount } = await renderHook(() =>
      useGroupPresenceSync({
        member,
        rooms: [
          makeRoom({
            id: "room-1",
            members: [
              {
                id: "member-1",
                name: "Old",
                color: COLORS[1],
                joinedAt: 777,
                speaking: true,
              },
            ],
          }),
        ],
        selectedRoomId: "room-1",
        screen: "room",
        onError: jest.fn(),
      }),
    );

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ path: "rooms/room-1/members/member-1" }),
        expect.objectContaining({
          name: "Member",
          studyStatusPublic: false,
          status: "Math",
          studyStartEpoch: 123,
          online: true,
          lastSeenAt: 10_000,
          joinedAt: 777,
          speaking: true,
        }),
      );
    });

    await act(async () => {
      unmount();
    });
  });

  it("syncs fallback member fields for selected and joined rooms", async () => {
    const joinedRoom = makeRoom({
      id: "joined",
      members: [{ id: "member-2", name: "Old", color: COLORS[1] }],
    });
    const { result } = await renderHook(() =>
      useGroupPresenceSync({
        member: minimalMember,
        rooms: [joinedRoom],
        selectedRoomId: "joined",
        screen: "room",
        onError: jest.fn(),
      }),
    );

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ path: "rooms/joined/members/member-2" }),
        expect.objectContaining({
          image: null,
          userType: "",
          bio: "",
        }),
      );
    });

    await act(async () => {
      await result.current.syncMyStudyStatusToJoinedRooms();
    });

    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        "rooms/joined/members/member-2": expect.objectContaining({
          image: null,
          userType: "",
          bio: "",
          joinedAt: 10_000,
        }),
      }),
    );

    jest.clearAllMocks();
    const nullishRoom = makeRoom({
      id: "nullish",
      members: [{ id: "member-3", name: "Old", color: COLORS[2] }],
    });
    const nullishHook = await renderHook(() =>
      useGroupPresenceSync({
        member: nullishMember,
        rooms: [nullishRoom],
        selectedRoomId: "nullish",
        screen: "room",
        onError: jest.fn(),
      }),
    );

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith(
        expect.objectContaining({ path: "rooms/nullish/members/member-3" }),
        expect.objectContaining({
          userType: "",
          bio: "",
        }),
      );
    });

    await act(async () => {
      await nullishHook.result.current.syncMyStudyStatusToJoinedRooms();
    });
    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        "rooms/nullish/members/member-3": expect.objectContaining({
          userType: "",
          bio: "",
        }),
      }),
    );
  });

  it("reports selected-room sync errors", async () => {
    jest.mocked(update).mockRejectedValueOnce(new Error("sync failed"));
    const onError = jest.fn();

    await renderHook(() =>
      useGroupPresenceSync({
        member,
        rooms: [],
        selectedRoomId: "room-1",
        screen: "room",
        onError,
      }),
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("sync failed");
    });
  });

  it("syncs joined rooms, app state presence, and disconnect cleanup", async () => {
    const disconnectCancel = jest.fn(() => Promise.resolve());
    const disconnectUpdate = jest.fn(() => Promise.resolve());
    jest.mocked(onDisconnect).mockReturnValue({
      cancel: disconnectCancel,
      update: disconnectUpdate,
    } as never);
    const joinedRoom = makeRoom({
      id: "joined",
      members: [
        {
          id: "member-1",
          name: "Old",
          color: COLORS[1],
          joinedAt: 123,
        },
      ],
    });
    const unjoinedRoom = makeRoom({
      id: "unjoined",
      members: [{ id: "other", name: "Other", color: COLORS[2] }],
    });

    const { result, unmount } = await renderHook(() =>
      useGroupPresenceSync({
        member,
        rooms: [joinedRoom, unjoinedRoom],
        selectedRoomId: null,
        screen: "lobby",
        onError: jest.fn(),
      }),
    );

    await waitFor(() => {
      expect(disconnectUpdate).toHaveBeenCalledWith({
        online: false,
        lastSeenAt: 10_000,
      });
    });
    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        "rooms/joined/members/member-1": expect.objectContaining({
          name: "Member",
          speaking: false,
          joinedAt: 123,
          online: true,
        }),
      }),
    );

    await act(async () => {
      await result.current.syncMyStudyStatusToJoinedRooms();
    });
    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        "rooms/joined/members/member-1": expect.any(Object),
      }),
    );

    await act(async () => {
      unmount();
    });
    expect(disconnectCancel).toHaveBeenCalled();
  });

  it("reports joined-room sync errors from effects and intervals", async () => {
    const getItemSpy = jest
      .spyOn(AsyncStorage, "getItem")
      .mockRejectedValueOnce(new Error("joined sync failed"));
    const onError = jest.fn();
    const joinedRoom = makeRoom({
      id: "joined",
      members: [{ id: "member-1", name: "Old", color: COLORS[1] }],
    });

    await renderHook(() =>
      useGroupPresenceSync({
        member,
        rooms: [joinedRoom],
        selectedRoomId: null,
        screen: "lobby",
        onError,
      }),
    );

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("joined sync failed");
    });

    jest.clearAllMocks();
    getItemSpy.mockRejectedValueOnce(new Error("interval failed"));
    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith("interval failed");
    });
  });

  it("handles app state presence update failures without surfacing errors", async () => {
    const joinedRoom = makeRoom({
      id: "joined",
      members: [{ id: "member-1", name: "Old", color: COLORS[1] }],
    });
    const onError = jest.fn();

    await renderHook(() =>
      useGroupPresenceSync({
        member,
        rooms: [joinedRoom],
        selectedRoomId: null,
        screen: "lobby",
        onError,
      }),
    );

    await waitFor(() => {
      expect(appStateListener).toEqual(expect.any(Function));
    });
    jest.mocked(update).mockRejectedValueOnce(new Error("background failed"));
    await act(async () => {
      appStateListener?.("background");
    });

    expect(onError).not.toHaveBeenCalledWith("background failed");
  });
});
