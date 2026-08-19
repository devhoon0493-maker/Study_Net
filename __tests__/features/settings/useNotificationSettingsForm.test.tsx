import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import { useNotificationSettingsForm } from "../../../features/settings/useNotificationSettingsForm";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATION_SETTINGS_KEY,
} from "../../../utils/notificationSettings";
import {
  scheduleStudyNetTestNotification,
  syncStudyNetNotifications,
} from "../../../utils/notificationScheduler";

jest.mock("../../../utils/notificationScheduler", () => ({
  scheduleStudyNetTestNotification: jest.fn(() =>
    Promise.resolve({ status: "scheduled" }),
  ),
  syncStudyNetNotifications: jest.fn(() =>
    Promise.resolve({ status: "scheduled", count: 2 }),
  ),
}));

describe("useNotificationSettingsForm", () => {
  const onSaved = jest.fn();

  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads settings, updates values, and toggles custom days", async () => {
    await AsyncStorage.setItem(
      NOTIFICATION_SETTINGS_KEY,
      JSON.stringify({
        ...DEFAULT_NOTIFICATION_SETTINGS,
        reminderTime: "07:30",
        customDays: [1, 3],
      }),
    );

    const { result } = await renderHook(() =>
      useNotificationSettingsForm({ onSaved }),
    );

    await waitFor(() => {
      expect(result.current.settings.reminderTime).toBe("07:30");
      expect(result.current.settings.customDays).toEqual([1, 3]);
    });

    await act(async () => {
      result.current.updateSetting("frequency", "custom");
      result.current.toggleCustomDay(3);
      result.current.toggleCustomDay(5);
    });

    expect(result.current.settings.frequency).toBe("custom");
    expect(result.current.settings.customDays).toEqual([1, 5]);
  });

  it("blocks saving invalid reminder time and empty custom days", async () => {
    const { result } = await renderHook(() =>
      useNotificationSettingsForm({ onSaved }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      result.current.updateSetting("reminderTime", "25:00");
    });
    await act(async () => {
      await result.current.handleSave();
    });

    expect(Alert.alert).toHaveBeenCalled();
    expect(syncStudyNetNotifications).not.toHaveBeenCalled();

    jest.mocked(Alert.alert).mockClear();

    await act(async () => {
      result.current.updateSetting("reminderTime", "20:00");
      result.current.updateSetting("frequency", "custom");
      result.current.updateSetting("customDays", []);
    });
    await act(async () => {
      await result.current.handleSave();
    });

    expect(Alert.alert).toHaveBeenCalled();
    expect(syncStudyNetNotifications).not.toHaveBeenCalled();
  });

  it("saves valid settings and wires the alert confirm action", async () => {
    const { result } = await renderHook(() =>
      useNotificationSettingsForm({ onSaved }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      result.current.updateSetting("reminderTime", "06:45");
    });
    await act(async () => {
      await result.current.handleSave();
    });

    expect(syncStudyNetNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ reminderTime: "06:45" }),
    );
    expect(Alert.alert).toHaveBeenCalled();

    const alertArgs = jest.mocked(Alert.alert).mock.calls.at(-1);
    const buttons = alertArgs?.[2];
    if (Array.isArray(buttons)) {
      buttons[0]?.onPress?.();
    }

    expect(onSaved).toHaveBeenCalled();
  });

  it("ignores duplicate save and test actions while already busy", async () => {
    let resolveSync: ((value: { status: "disabled" }) => void) | undefined;
    jest.mocked(syncStudyNetNotifications).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSync = resolve;
      }) as never,
    );
    const { result } = await renderHook(() =>
      useNotificationSettingsForm({ onSaved }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });
    let firstSave: Promise<void>;
    await act(async () => {
      firstSave = result.current.handleSave();
    });
    expect(result.current.saving).toBe(true);
    await act(async () => {
      await result.current.handleSave();
    });
    expect(syncStudyNetNotifications).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveSync?.({ status: "disabled" });
      await firstSave!;
    });

    let resolveTest: ((value: { status: "scheduled" }) => void) | undefined;
    jest.mocked(scheduleStudyNetTestNotification).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveTest = resolve;
      }) as never,
    );
    let firstTest: Promise<void>;
    await act(async () => {
      firstTest = result.current.sendTestNotification();
    });
    expect(result.current.testing).toBe(true);
    await act(async () => {
      await result.current.sendTestNotification();
    });
    expect(scheduleStudyNetTestNotification).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveTest?.({ status: "scheduled" });
      await firstTest!;
    });
  });

  it("shows a disabled reminder save message", async () => {
    jest.mocked(syncStudyNetNotifications).mockResolvedValueOnce({
      status: "disabled",
    });
    const { result } = await renderHook(() =>
      useNotificationSettingsForm({ onSaved }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      await result.current.handleSave();
    });

    const alertArgs = jest.mocked(Alert.alert).mock.calls.at(-1);
    expect(alertArgs?.[0]).toMatch(/\S+/);
    expect(alertArgs?.[1]).toMatch(/\S+/);
  });

  it("shows save alerts for permission, unavailable, and storage failures", async () => {
    const { result } = await renderHook(() =>
      useNotificationSettingsForm({ onSaved }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    jest.mocked(syncStudyNetNotifications).mockResolvedValueOnce({
      status: "permission-denied",
    });
    await act(async () => {
      await result.current.handleSave();
    });
    expect(Alert.alert).toHaveBeenCalled();

    jest.mocked(Alert.alert).mockClear();
    jest.mocked(syncStudyNetNotifications).mockResolvedValueOnce({
      status: "unavailable",
    });
    await act(async () => {
      await result.current.handleSave();
    });
    expect(Alert.alert).toHaveBeenCalled();

    jest.mocked(Alert.alert).mockClear();
    jest
      .spyOn(AsyncStorage, "multiSet")
      .mockRejectedValueOnce(new Error("storage"));
    await act(async () => {
      await result.current.handleSave();
    });
    expect(Alert.alert).toHaveBeenCalled();
  });

  it("sends a test notification", async () => {
    const { result } = await renderHook(() =>
      useNotificationSettingsForm({ onSaved }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    await act(async () => {
      await result.current.sendTestNotification();
    });

    expect(scheduleStudyNetTestNotification).toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });

  it("shows test notification failure states", async () => {
    const { result } = await renderHook(() =>
      useNotificationSettingsForm({ onSaved }),
    );

    await waitFor(() => {
      expect(result.current).not.toBeNull();
    });

    jest.mocked(scheduleStudyNetTestNotification).mockResolvedValueOnce({
      status: "permission-denied",
    });
    await act(async () => {
      await result.current.sendTestNotification();
    });
    expect(Alert.alert).toHaveBeenCalled();

    jest.mocked(Alert.alert).mockClear();
    jest.mocked(scheduleStudyNetTestNotification).mockResolvedValueOnce({
      status: "unavailable",
    });
    await act(async () => {
      await result.current.sendTestNotification();
    });
    expect(Alert.alert).toHaveBeenCalled();
  });
});
