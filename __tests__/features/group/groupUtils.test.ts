import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  ACTIVE_SESSION_KEY,
  CODE_LENGTH,
  COLORS,
} from "../../../features/group/groupConstants";
import {
  formatTimer,
  getColorFromId,
  getCurrentStudySession,
  getInitial,
  getMemberSliderRatio,
  isMemberOnline,
  isMemberStudying,
  makeCode,
  snapshotToRoom,
  withAlpha,
} from "../../../features/group/groupUtils";

describe("group utils", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("adds alpha to supported hex colors", () => {
    expect(withAlpha("#ABC", "80")).toBe("#AABBCC80");
    expect(withAlpha("#AABBCC", "80")).toBe("#AABBCC80");
    expect(withAlpha("red", "80")).toBe("red");
  });

  it("calculates member slider ratio", () => {
    expect(getMemberSliderRatio(2)).toBe(0);
    expect(getMemberSliderRatio(20)).toBe(1);
  });

  it("creates invite codes with the expected alphabet", () => {
    const code = makeCode();

    expect(code).toHaveLength(CODE_LENGTH);
    expect(code).toMatch(/^[A-Z2-9]+$/);
    expect(code).not.toMatch(/[IO01]/);
  });

  it("derives initials, colors, and timers", () => {
    expect(getInitial(" Study")).toBe("S");
    expect(getInitial("")).toBe("?");
    expect(COLORS).toContain(getColorFromId("member-a"));
    expect(formatTimer(1_000, 3_661_000)).toBe("01:01:00");
    expect(formatTimer(undefined, 3_661_000)).toBe("00:00:00");
    expect(formatTimer(Date.now() - 1_000)).toMatch(/\d\d:\d\d:\d\d/);
  });

  it("detects member study and online states", () => {
    expect(isMemberStudying({ studyStartEpoch: 123 } as never)).toBe(true);
    expect(isMemberStudying({ studyStartEpoch: null } as never)).toBe(false);
    expect(isMemberOnline({ online: false } as never)).toBe(false);
    expect(isMemberOnline({ online: true } as never)).toBe(true);
    expect(isMemberOnline({ lastSeenAt: 10_000 } as never, 20_000)).toBe(true);
    expect(isMemberOnline({ lastSeenAt: 10_000 } as never, 50_001)).toBe(false);
    expect(isMemberOnline({ studyStartEpoch: 123 } as never)).toBe(true);
    expect(isMemberOnline({} as never)).toBe(false);
  });

  it("loads the active study session with fallback values", async () => {
    await expect(getCurrentStudySession()).resolves.toMatchObject({
      studyStartEpoch: null,
    });

    await AsyncStorage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({ subject: "  Biology  ", startEpoch: 123 }),
    );
    await expect(getCurrentStudySession()).resolves.toEqual({
      status: "Biology",
      studyStartEpoch: 123,
    });

    await AsyncStorage.setItem(ACTIVE_SESSION_KEY, "{bad json");
    await expect(getCurrentStudySession()).resolves.toMatchObject({
      studyStartEpoch: null,
    });

    await AsyncStorage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({ subject: "   " }),
    );
    await expect(getCurrentStudySession()).resolves.toMatchObject({
      studyStartEpoch: null,
    });

    await AsyncStorage.setItem(
      ACTIVE_SESSION_KEY,
      JSON.stringify({ subject: "Math", savedSeconds: 120, running: false }),
    );
    await expect(getCurrentStudySession()).resolves.toEqual({
      status: "접속중",
      studyStartEpoch: null,
    });
  });

  it("converts room snapshots into UI room models", () => {
    const room = snapshotToRoom("room-1", {
      ownerId: "owner",
      name: "Morning Study",
      members: {
        userA: {
          name: "A",
          joinedAt: 100,
          online: true,
        },
      },
    } as never);

    expect(room.id).toBe("room-1");
    expect(room.ownerId).toBe("owner");
    expect(room.name).toBe("Morning Study");
    expect(room.members).toHaveLength(1);
    expect(room.members[0]).toMatchObject({
      id: "userA",
      name: "A",
      joinedAt: 100,
      online: true,
    });

    const fallbackRoom = snapshotToRoom("fallback", {
      max: 99,
      members: {
        empty: {
          lastSeenAt: 123,
        },
        badLastSeen: {
          lastSeenAt: "bad",
        },
      },
    } as never);

    expect(fallbackRoom).toMatchObject({
      id: "fallback",
      ownerId: "",
      code: "",
      max: 20,
      visibility: "public",
      createdAt: 0,
    });
    expect(fallbackRoom.members[0]).toMatchObject({
      id: "empty",
      image: null,
      online: false,
      lastSeenAt: 123,
    });
    expect(fallbackRoom.members[1].lastSeenAt).toBeUndefined();
    expect(snapshotToRoom("empty", {} as never).members).toEqual([]);
  });
});
