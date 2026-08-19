import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { get } from "firebase/database";

import { useStorageStatus } from "../../../features/settings/useStorageStatus";
import { getCommunityBookmarkStorageKey } from "../../../utils/communityBookmarks";
import { PRIMARY_DDAY_KEY } from "../../../utils/dday";
import { auth } from "../../../utils/firebaseConfig";
import {
  NOTIFICATION_SETTINGS_KEY,
  NOTIFICATIONS_ENABLED_KEY,
} from "../../../utils/notificationSettings";
import {
  COMMUNITY_ACTIVITY_PUBLIC_KEY,
  STUDY_STATUS_PUBLIC_KEY,
} from "../../../utils/privacySettings";
import { getStudyNetNotificationStatus } from "../../../utils/notificationScheduler";
import { USER_PROFILE_KEY } from "../../../utils/userProfileStorage";

jest.mock("../../../utils/notificationScheduler", () => ({
  getStudyNetNotificationStatus: jest.fn(() =>
    Promise.resolve({
      scheduledCount: 0,
      activeScheduledCount: 0,
      permissionGranted: false,
    }),
  ),
}));

const setCurrentUser = (user: unknown) => {
  Object.defineProperty(auth, "currentUser", {
    configurable: true,
    value: user,
    writable: true,
  });
};

describe("useStorageStatus", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    setCurrentUser(null);
  });

  it("loads local storage and notification status without a logged-in user", async () => {
    await AsyncStorage.multiSet([
      [USER_PROFILE_KEY, JSON.stringify({ name: "Tester" })],
      ["study_sessions", JSON.stringify([{ id: 1 }, { id: 2 }])],
      ["daily_goal_seconds", "3600"],
      [PRIMARY_DDAY_KEY, JSON.stringify({ title: "Exam" })],
      [NOTIFICATIONS_ENABLED_KEY, "false"],
      [NOTIFICATION_SETTINGS_KEY, JSON.stringify({ reminderTime: "09:00" })],
      [STUDY_STATUS_PUBLIC_KEY, "true"],
      [COMMUNITY_ACTIVITY_PUBLIC_KEY, "false"],
      [getCommunityBookmarkStorageKey(), JSON.stringify(["post-1", "post-2"])],
    ]);
    jest.mocked(getStudyNetNotificationStatus).mockResolvedValueOnce({
      scheduledCount: 3,
      activeScheduledCount: 0,
      permissionGranted: false,
    });

    const { result } = await renderHook(() => useStorageStatus());

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    await act(async () => {
      await result.current.loadStatus();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.localItems).toHaveLength(12);
    expect(result.current.localItems.filter((item) => item.status === "ok").length)
      .toBeGreaterThan(0);
    expect(result.current.localItems.some((item) => item.value.includes("2")))
      .toBe(true);
    expect(result.current.remoteItems).toHaveLength(3);
    expect(result.current.remoteItems.map((item) => item.status)).toEqual([
      "empty",
      "empty",
      "empty",
    ]);
  });

  it("describes malformed local JSON values as stored data", async () => {
    await AsyncStorage.multiSet([
      ["study_sessions", "{bad json"],
      [getCommunityBookmarkStorageKey(), "{bad json"],
      ["active_session", "{}"],
      ["weekly_goal_seconds", "0"],
      ["streak_goal_days", "abc"],
    ]);
    const { result } = await renderHook(() => useStorageStatus());

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    await act(async () => {
      await result.current.loadStatus();
    });

    const storedDescriptions = result.current.localItems.filter(
      (item) => item.status === "ok",
    );
    expect(storedDescriptions).toHaveLength(5);
    storedDescriptions.forEach((item) => {
      expect(item.value).toMatch(/\S+/);
    });
  });

  it("handles unknown storage keys and non-array serialized collections", async () => {
    jest.spyOn(AsyncStorage, "multiGet").mockResolvedValueOnce([
      ["unknown_key", "value"],
      ["study_sessions", JSON.stringify({ bad: true })],
      [getCommunityBookmarkStorageKey(), JSON.stringify({ bad: true })],
    ]);
    const { result } = await renderHook(() => useStorageStatus());

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    await act(async () => {
      await result.current.loadStatus();
    });

    expect(result.current.localItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "unknown_key", value: expect.any(String) }),
        expect.objectContaining({ status: "ok", value: expect.any(String) }),
      ]),
    );
  });

  it("loads Firebase profile, post, and group counts for a logged-in user", async () => {
    setCurrentUser({ uid: "user-1" });
    await AsyncStorage.setItem(
      getCommunityBookmarkStorageKey("user-1"),
      JSON.stringify(["post-1"]),
    );
    jest.mocked(getStudyNetNotificationStatus).mockResolvedValueOnce({
      scheduledCount: 3,
      activeScheduledCount: 2,
      permissionGranted: true,
    });
    jest
      .mocked(get)
      .mockResolvedValueOnce({
        exists: () => true,
        val: () => ({ name: "Tester" }),
      } as never)
      .mockResolvedValueOnce({
        val: () => ({
          post1: { authorId: "user-1" },
          post2: { authorId: "user-1" },
          post3: { authorId: "other-user" },
        }),
      } as never)
      .mockResolvedValueOnce({
        val: () => ({
          room1: { members: { "user-1": true } },
          room2: { members: { "other-user": true } },
        }),
      } as never);

    const { result } = await renderHook(() => useStorageStatus());

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    await act(async () => {
      await result.current.loadStatus();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.remoteItems).toHaveLength(6);
    expect(result.current.remoteItems.map((item) => item.status)).toEqual([
      "ok",
      "ok",
      "ok",
      "ok",
      "ok",
      "ok",
    ]);
    expect(result.current.remoteItems.some((item) => item.value.includes("2")))
      .toBe(true);
    expect(result.current.remoteItems.some((item) => item.value.includes("1")))
      .toBe(true);
  });

  it("loads empty Firebase profile, post, and group counts for a logged-in user", async () => {
    setCurrentUser({ uid: "user-1" });
    jest
      .mocked(get)
      .mockResolvedValueOnce({
        exists: () => false,
        val: () => null,
      } as never)
      .mockResolvedValueOnce({
        val: () => null,
      } as never)
      .mockResolvedValueOnce({
        val: () => null,
      } as never);

    const { result } = await renderHook(() => useStorageStatus());

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    await act(async () => {
      await result.current.loadStatus();
    });

    expect(result.current.remoteItems).toHaveLength(6);
    expect(result.current.remoteItems.slice(3).map((item) => item.status)).toEqual([
      "empty",
      "empty",
      "empty",
    ]);
  });
});
