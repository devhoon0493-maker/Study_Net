import { act, renderHook, waitFor } from "@testing-library/react-native";
import { onValue, ref } from "firebase/database";

import { useGroupLobbyStats } from "../../../features/group/useGroupLobbyStats";
import { useGroupRoomMemberStats } from "../../../features/group/useGroupRoomMemberStats";
import { useGroupRooms } from "../../../features/group/useGroupRooms";
import { useLivePulse } from "../../../features/group/useLivePulse";
import { useNow } from "../../../features/group/useNow";
import { useSelectedGroupRoom } from "../../../features/group/useSelectedGroupRoom";
import type { Room } from "../../../features/group/groupTypes";

const makeRoom = (overrides: Partial<Room> = {}): Room => ({
  id: "room-1",
  ownerId: "owner",
  name: "Room",
  emoji: "S",
  subjects: "Math",
  color: "#111111",
  max: 6,
  code: "ABC123",
  visibility: "public",
  members: [],
  ...overrides,
});

describe("group hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("updates the current timestamp on an interval", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-28T00:00:00.000Z"));

    const { result, unmount } = await renderHook(() => useNow(1000));
    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    const initialNow = result.current;

    expect(initialNow).toBe(Date.now());

    jest.setSystemTime(new Date("2026-07-28T00:00:01.000Z"));
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current).toBe(Date.now());

    await act(async () => {
      unmount();
    });

    const defaultHook = await renderHook(() => useNow());
    await waitFor(() => {
      expect(defaultHook.result.current).toBe(Date.now());
    });
    await act(async () => {
      defaultHook.unmount();
    });
  });

  it("starts and stops the live pulse animation", async () => {
    const { result, unmount } = await renderHook(() => useLivePulse());

    await waitFor(() => {
      expect(result.current).toBeTruthy();
    });

    await act(async () => {
      unmount();
    });
  });

  it("derives lobby public rooms and studying members", async () => {
    const now = 50_000;
    const rooms = [
      makeRoom({
        id: "public",
        visibility: "public",
        members: [
          {
            id: "studying",
            name: "Studying",
            color: "#111",
            online: true,
            studyStartEpoch: 10,
          },
          {
            id: "offline",
            name: "Offline",
            color: "#222",
            lastSeenAt: 1,
            studyStartEpoch: 10,
          },
        ],
      }),
      makeRoom({
        id: "private",
        visibility: "private",
        members: [
          {
            id: "private-studying",
            name: "Private",
            color: "#333",
            online: true,
            studyStartEpoch: 10,
          },
        ],
      }),
    ];

    const { result } = await renderHook(() =>
      useGroupLobbyStats(rooms, now, "private-studying"),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    expect(result.current.publicRooms.map((room) => room.id)).toEqual([
      "public",
    ]);
    expect(result.current.lobbyRooms.map((room) => room.id)).toEqual([
      "public",
      "private",
    ]);
    expect(
      result.current.lobbyStudyingMembers.map((member) => member.id),
    ).toEqual(["studying", "private-studying"]);
    expect(result.current.lobbyStudyingCount).toBe(2);
  });

  it("derives selected room member buckets", async () => {
    const now = 50_000;
    const room = makeRoom({
      max: 8,
      members: [
        {
          id: "me",
          name: "Me",
          color: "#111",
          online: true,
          studyStartEpoch: 10,
        },
        {
          id: "waiting",
          name: "Waiting",
          color: "#222",
          online: true,
          studyStartEpoch: null,
        },
        {
          id: "offline",
          name: "Offline",
          color: "#333",
          online: false,
          studyStartEpoch: null,
        },
      ],
    });

    const { result } = await renderHook(() =>
      useGroupRoomMemberStats(room, "me", now),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    expect(result.current.myMember?.id).toBe("me");
    expect(result.current.memberCountText).toBe("3/8");
    expect(result.current.studyingMembers.map((member) => member.id)).toEqual([
      "me",
    ]);
    expect(result.current.waitingMemberList.map((member) => member.id)).toEqual([
      "waiting",
    ]);
    expect(result.current.waitingMembers).toBe(1);
    expect(result.current.offlineMemberList.map((member) => member.id)).toEqual([
      "offline",
    ]);
    expect(result.current.offlineMembers).toBe(1);
  });

  it("uses empty selected room member stats when no room is selected", async () => {
    const { result } = await renderHook(() =>
      useGroupRoomMemberStats(null, undefined, 0),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    expect(result.current.roomMembers).toEqual([]);
    expect(result.current.myMember).toBeUndefined();
    expect(result.current.memberCountText).toBe("0/6");
  });

  it("clears selected room when no room id is selected", async () => {
    const onRoomMissing = jest.fn();
    const { result } = await renderHook(() =>
      useSelectedGroupRoom({
        selectedRoomId: null,
        onRoomMissing,
      }),
    );

    await waitFor(() => {
      expect(result.current).toBeNull();
    });
    expect(result.current).toBeNull();
    expect(onValue).not.toHaveBeenCalled();
  });

  it("loads selected room snapshots and unsubscribes", async () => {
    const unsubscribe = jest.fn();
    jest.mocked(onValue).mockImplementation((roomRef, callback) => {
      callback({
        exists: () => true,
        val: () => ({
          ownerId: "owner",
          name: "Loaded Room",
          members: {
            member: {
              name: "Member",
              online: true,
            },
          },
        }),
      } as never);
      return unsubscribe;
    });

    const onRoomLoaded = jest.fn();
    const onRoomMissing = jest.fn();
    const { result, unmount } = await renderHook(() =>
      useSelectedGroupRoom({
        selectedRoomId: "room-1",
        onRoomMissing,
        onRoomLoaded,
      }),
    );

    await waitFor(() => {
      expect(onValue).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(result.current?.name).toBe("Loaded Room");
    });

    expect(ref).toHaveBeenCalledWith(expect.anything(), "rooms/room-1");
    expect(onRoomLoaded).toHaveBeenCalled();

    await act(async () => {
      unmount();
    });
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("merges public rooms with rooms joined by the current user", async () => {
    const unsubscribers: Array<jest.Mock> = [];
    jest.mocked(onValue).mockImplementation((roomRef, callback) => {
      const path = (roomRef as unknown as { path: string }).path;
      const unsubscribe = jest.fn();
      unsubscribers.push(unsubscribe);

      if (path === "rooms") {
        callback({
          exists: () => true,
          val: () => ({
            "public-room": {
              ownerId: "owner",
              name: "Public Room",
              visibility: "public",
              createdAt: 1,
              members: {},
            },
          }),
        } as never);
      } else if (path === "userRooms/me") {
        callback({
          exists: () => true,
          val: () => ({ "private-room": true, "public-room": true }),
        } as never);
      } else if (path === "rooms/private-room") {
        callback({
          exists: () => true,
          val: () => ({
            ownerId: "owner",
            name: "Private Room",
            visibility: "private",
            createdAt: 2,
            members: {
              me: {
                name: "Me",
                online: true,
              },
            },
          }),
        } as never);
      } else if (path === "rooms/public-room") {
        callback({
          exists: () => true,
          val: () => ({
            ownerId: "owner",
            name: "Public Room",
            visibility: "public",
            createdAt: 1,
            members: {},
          }),
        } as never);
      }

      return unsubscribe;
    });

    const { result, unmount } = await renderHook(() => useGroupRooms("me"));

    await waitFor(() => {
      expect(result.current.map((room) => room.id)).toEqual([
        "private-room",
        "public-room",
      ]);
    });
    expect(onValue).toHaveBeenCalledWith(
      expect.objectContaining({ path: "userRooms/me" }),
      expect.any(Function),
      expect.any(Function),
    );

    await act(async () => {
      unmount();
    });
    unsubscribers.forEach((unsubscribe) => {
      expect(unsubscribe).toHaveBeenCalled();
    });
  });

  it("notifies when a selected room snapshot is missing", async () => {
    jest.mocked(onValue).mockImplementation((roomRef, callback) => {
      callback({
        exists: () => false,
        val: () => null,
      } as never);
      return jest.fn();
    });
    const onRoomMissing = jest.fn();

    const { result } = await renderHook(() =>
      useSelectedGroupRoom({
        selectedRoomId: "missing-room",
        onRoomMissing,
      }),
    );

    await waitFor(() => {
      expect(onRoomMissing).toHaveBeenCalled();
    });
    expect(result.current).toBeNull();
  });
});
