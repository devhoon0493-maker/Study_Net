import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { update } from "firebase/database";

import { useSettingsOverview } from "../../../features/settings/useSettingsOverview";
import { auth } from "../../../utils/firebaseConfig";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATION_SETTINGS_KEY,
  NOTIFICATIONS_ENABLED_KEY,
} from "../../../utils/notificationSettings";
import { syncStudyNetNotifications } from "../../../utils/notificationScheduler";
import {
  COMMUNITY_ACTIVITY_PUBLIC_KEY,
  STUDY_STATUS_PUBLIC_KEY,
} from "../../../utils/privacySettings";
import { USER_PROFILE_KEY } from "../../../utils/userProfileStorage";

jest.mock("../../../utils/notificationScheduler", () => ({
  syncStudyNetNotifications: jest.fn(() =>
    Promise.resolve({ status: "scheduled", count: 1 }),
  ),
}));

const setCurrentUser = (user: unknown) => {
  Object.defineProperty(auth, "currentUser", {
    configurable: true,
    value: user,
    writable: true,
  });
};

describe("useSettingsOverview", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    jest.spyOn(Date, "now").mockReturnValue(10_000);
    setCurrentUser(null);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads profile, notification, and privacy overview values", async () => {
    await AsyncStorage.multiSet([
      [
        USER_PROFILE_KEY,
        JSON.stringify({
          name: "Tester",
          email: "tester@example.com",
          image: "avatar.jpg",
          userType: "Student",
        }),
      ],
      [STUDY_STATUS_PUBLIC_KEY, "false"],
      [COMMUNITY_ACTIVITY_PUBLIC_KEY, "true"],
      [
        NOTIFICATION_SETTINGS_KEY,
        JSON.stringify({
          ...DEFAULT_NOTIFICATION_SETTINGS,
          enabled: false,
          reminderTime: "07:30",
        }),
      ],
    ]);

    const { result } = await renderHook(() => useSettingsOverview());

    await act(async () => {
      await result.current.loadOverview();
    });

    expect(result.current.profile).toEqual({
      name: "Tester",
      email: "tester@example.com",
      image: "avatar.jpg",
      userType: "Student",
    });
    expect(result.current.notifications).toBe(false);
    expect(result.current.notificationSummary).toMatch(/\S+/);
    expect(result.current.studyStatusPublic).toBe(false);
    expect(result.current.communityActivityPublic).toBe(true);
  });

  it("uses fallback profile fields when stored profile values are missing", async () => {
    await AsyncStorage.setItem(
      USER_PROFILE_KEY,
      JSON.stringify({
        name: "",
        email: "",
        image: "",
        userType: "",
      }),
    );
    const { result } = await renderHook(() => useSettingsOverview());

    await act(async () => {
      await result.current.loadOverview();
    });

    expect(result.current.profile).toEqual({
      name: "Study User",
      email: "user@example.com",
      image: null,
      userType: "",
    });

    await AsyncStorage.clear();
    await act(async () => {
      await result.current.loadOverview();
    });
    expect(result.current.profile.name).toBe("Study User");
  });

  it("falls back to default profile when overview loading fails", async () => {
    jest.spyOn(AsyncStorage, "multiGet").mockRejectedValueOnce(new Error("bad"));

    const { result } = await renderHook(() => useSettingsOverview());

    await act(async () => {
      await result.current.loadOverview();
    });

    expect(result.current.profile).toEqual({
      name: "Study User",
      email: "user@example.com",
      image: null,
      userType: "",
    });
  });

  it("updates notification settings and reports permission failures", async () => {
    const { result } = await renderHook(() => useSettingsOverview());
    jest.mocked(syncStudyNetNotifications).mockResolvedValueOnce({
      status: "permission-denied",
    });

    await act(async () => {
      await result.current.updateNotificationSetting(true);
    });

    expect(result.current.notifications).toBe(true);
    expect(syncStudyNetNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );
    expect(Alert.alert).toHaveBeenCalled();
    await expect(AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY)).resolves.toBe(
      "true",
    );
  });

  it("updates disabled notifications without permission alerts", async () => {
    const { result } = await renderHook(() => useSettingsOverview());
    jest.mocked(syncStudyNetNotifications).mockResolvedValueOnce({
      status: "disabled",
    });

    await act(async () => {
      await result.current.updateNotificationSetting(false);
    });

    expect(result.current.notifications).toBe(false);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it("reports unavailable notification scheduling", async () => {
    const { result } = await renderHook(() => useSettingsOverview());
    jest.mocked(syncStudyNetNotifications).mockResolvedValueOnce({
      status: "unavailable",
    });

    await act(async () => {
      await result.current.updateNotificationSetting(true);
    });

    expect(Alert.alert).toHaveBeenCalled();
  });

  it("updates privacy settings locally and remotely when signed in", async () => {
    setCurrentUser({ uid: "user-1" });
    const { result } = await renderHook(() => useSettingsOverview());

    await act(async () => {
      await result.current.updateStudyStatusPublic(false);
      await result.current.updateCommunityActivityPublic(true);
    });

    expect(result.current.studyStatusPublic).toBe(false);
    expect(result.current.communityActivityPublic).toBe(true);
    await expect(AsyncStorage.getItem(STUDY_STATUS_PUBLIC_KEY)).resolves.toBe(
      "false",
    );
    await expect(
      AsyncStorage.getItem(COMMUNITY_ACTIVITY_PUBLIC_KEY),
    ).resolves.toBe("true");
    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        "users/user-1/studyStatusPublic": false,
        "users/user-1/updatedAt": 10_000,
        "publicProfiles/user-1": expect.objectContaining({
          studyStatusPublic: false,
          updatedAt: 10_000,
        }),
      }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        "users/user-1/communityActivityPublic": true,
        "users/user-1/updatedAt": 10_000,
        "publicProfiles/user-1": expect.objectContaining({
          communityActivityPublic: true,
          updatedAt: 10_000,
        }),
      }),
    );
  });

  it("updates privacy settings locally without remote writes when signed out", async () => {
    const { result } = await renderHook(() => useSettingsOverview());

    await act(async () => {
      await result.current.updateStudyStatusPublic(true);
      await result.current.updateCommunityActivityPublic(false);
    });

    expect(result.current.studyStatusPublic).toBe(true);
    expect(result.current.communityActivityPublic).toBe(false);
    expect(update).not.toHaveBeenCalled();
  });
});
