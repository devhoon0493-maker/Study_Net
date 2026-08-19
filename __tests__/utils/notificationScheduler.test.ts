import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import { DEFAULT_NOTIFICATION_SETTINGS } from "../../utils/notificationSettings";

const mockSetNotificationHandler = jest.fn();
const mockCancelScheduledNotificationAsync = jest.fn();
const mockGetAllScheduledNotificationsAsync = jest.fn();
const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockScheduleNotificationAsync = jest.fn();
const mockSetNotificationChannelAsync = jest.fn();

jest.mock("expo-notifications", () => ({
  AndroidImportance: {
    HIGH: "high",
  },
  SchedulableTriggerInputTypes: {
    DAILY: "daily",
    TIME_INTERVAL: "timeInterval",
    WEEKLY: "weekly",
  },
  cancelScheduledNotificationAsync: mockCancelScheduledNotificationAsync,
  getAllScheduledNotificationsAsync: mockGetAllScheduledNotificationsAsync,
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  scheduleNotificationAsync: mockScheduleNotificationAsync,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  setNotificationHandler: mockSetNotificationHandler,
}));

const {
  cancelStudyNetNotifications,
  getStudyNetNotificationStatus,
  scheduleStudyNetTestNotification,
  syncStudyNetNotifications,
} = require("../../utils/notificationScheduler") as typeof import("../../utils/notificationScheduler");

const registeredNotificationHandler = mockSetNotificationHandler.mock.calls[0]?.[0];
const SCHEDULED_IDS_KEY = "settings_notification_scheduled_ids";

describe("notification scheduler", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    mockCancelScheduledNotificationAsync.mockResolvedValue(undefined);
    mockGetAllScheduledNotificationsAsync.mockResolvedValue([]);
    mockGetPermissionsAsync.mockResolvedValue({ granted: true });
    mockRequestPermissionsAsync.mockResolvedValue({ granted: true });
    mockScheduleNotificationAsync.mockImplementation(({ identifier }) =>
      Promise.resolve(identifier),
    );
    mockSetNotificationChannelAsync.mockResolvedValue(undefined);
  });

  it("registers a notification handler at module load", () => {
    expect(registeredNotificationHandler).toEqual({
      handleNotification: expect.any(Function),
    });
  });

  it("returns the expected foreground notification behavior", async () => {
    await expect(registeredNotificationHandler.handleNotification()).resolves.toEqual({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    });
  });

  it("cancels stored notification ids and clears storage", async () => {
    await AsyncStorage.setItem(
      SCHEDULED_IDS_KEY,
      JSON.stringify(["id-1", "id-2", 3]),
    );
    mockCancelScheduledNotificationAsync.mockRejectedValueOnce(
      new Error("already gone"),
    );

    await cancelStudyNetNotifications();

    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith("id-1");
    expect(mockCancelScheduledNotificationAsync).toHaveBeenCalledWith("id-2");
    await expect(AsyncStorage.getItem(SCHEDULED_IDS_KEY)).resolves.toBeNull();
  });

  it("returns disabled without requesting permission when reminders are off", async () => {
    const result = await syncStudyNetNotifications({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      enabled: false,
    });

    expect(result).toEqual({ status: "disabled" });
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("returns disabled when all reminder channels are off", async () => {
    await expect(
      syncStudyNetNotifications({
        ...DEFAULT_NOTIFICATION_SETTINGS,
        studyReminderEnabled: false,
        communityReminderEnabled: false,
      }),
    ).resolves.toEqual({ status: "disabled" });

    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("does not request permission when explicitly disabled by options", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(
      syncStudyNetNotifications(DEFAULT_NOTIFICATION_SETTINGS, {
        requestPermission: false,
      }),
    ).resolves.toEqual({ status: "permission-denied" });

    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });

  it("returns permission-denied when permission cannot be granted", async () => {
    mockGetPermissionsAsync.mockResolvedValue({ granted: false });
    mockRequestPermissionsAsync.mockResolvedValue({ granted: false });

    await expect(
      syncStudyNetNotifications(DEFAULT_NOTIFICATION_SETTINGS),
    ).resolves.toEqual({ status: "permission-denied" });

    expect(mockRequestPermissionsAsync).toHaveBeenCalled();
    expect(mockScheduleNotificationAsync).not.toHaveBeenCalled();
  });

  it("schedules daily reminders and stores returned ids", async () => {
    const originalOS = Platform.OS;
    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });

    await expect(
      syncStudyNetNotifications({
        ...DEFAULT_NOTIFICATION_SETTINGS,
        reminderTime: "07:30",
        frequency: "daily",
      }),
    ).resolves.toEqual({ status: "scheduled", count: 1 });

    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "studynet-reminder-0",
        trigger: expect.objectContaining({
          type: "daily",
          hour: 7,
          minute: 30,
        }),
      }),
    );
    await expect(AsyncStorage.getItem(SCHEDULED_IDS_KEY)).resolves.toBe(
      JSON.stringify(["studynet-reminder-0"]),
    );
    expect(mockSetNotificationChannelAsync).toHaveBeenCalledWith(
      "studynet-reminders",
      expect.objectContaining({
        importance: "high",
        sound: "default",
      }),
    );

    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalOS,
    });
  });

  it("schedules weekday and custom weekly reminders", async () => {
    await syncStudyNetNotifications({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      frequency: "weekdays",
    });

    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(5);
    expect(
      mockScheduleNotificationAsync.mock.calls.map(
        ([request]) => request.trigger.weekday,
      ),
    ).toEqual([2, 3, 4, 5, 6]);

    jest.clearAllMocks();
    mockScheduleNotificationAsync.mockImplementation(({ identifier }) =>
      Promise.resolve(identifier),
    );

    await syncStudyNetNotifications({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      frequency: "custom",
      customDays: [0, 6],
    });

    expect(mockScheduleNotificationAsync).toHaveBeenCalledTimes(2);
    expect(
      mockScheduleNotificationAsync.mock.calls.map(
        ([request]) => request.trigger.weekday,
      ),
    ).toEqual([1, 7]);
  });

  it("builds notification content for combined and community-only reminders", async () => {
    await syncStudyNetNotifications({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      studyReminderEnabled: true,
      communityReminderEnabled: true,
    });
    expect(mockScheduleNotificationAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: "StudyNet",
          sound: "default",
        }),
      }),
    );

    jest.clearAllMocks();
    mockScheduleNotificationAsync.mockImplementation(({ identifier }) =>
      Promise.resolve(identifier),
    );

    await syncStudyNetNotifications({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      studyReminderEnabled: false,
      communityReminderEnabled: true,
    });
    expect(mockScheduleNotificationAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          sound: "default",
        }),
      }),
    );
  });

  it("reports unavailable when scheduling fails", async () => {
    mockScheduleNotificationAsync.mockRejectedValue(new Error("native failed"));

    await expect(
      syncStudyNetNotifications(DEFAULT_NOTIFICATION_SETTINGS),
    ).resolves.toEqual({ status: "unavailable" });
  });

  it("reports stored, active, and permission status", async () => {
    await AsyncStorage.setItem(
      SCHEDULED_IDS_KEY,
      JSON.stringify(["id-1", "id-2"]),
    );
    mockGetAllScheduledNotificationsAsync.mockResolvedValue([
      { identifier: "id-1" },
      { identifier: "other" },
    ]);

    await expect(getStudyNetNotificationStatus()).resolves.toEqual({
      scheduledCount: 2,
      activeScheduledCount: 1,
      permissionGranted: true,
    });
  });

  it("handles malformed stored ids and status API failures", async () => {
    await AsyncStorage.setItem(SCHEDULED_IDS_KEY, "{bad json");
    mockGetAllScheduledNotificationsAsync.mockRejectedValueOnce(
      new Error("native failed"),
    );
    mockGetPermissionsAsync.mockRejectedValueOnce(new Error("native failed"));

    await expect(getStudyNetNotificationStatus()).resolves.toEqual({
      scheduledCount: 0,
      activeScheduledCount: 0,
      permissionGranted: false,
    });
  });

  it("ignores non-array stored notification ids", async () => {
    await AsyncStorage.setItem(
      SCHEDULED_IDS_KEY,
      JSON.stringify({ id: "stored-id" }),
    );

    await cancelStudyNetNotifications();

    expect(mockCancelScheduledNotificationAsync).not.toHaveBeenCalled();
    await expect(AsyncStorage.getItem(SCHEDULED_IDS_KEY)).resolves.toBeNull();
  });

  it("schedules and handles test notification outcomes", async () => {
    await expect(scheduleStudyNetTestNotification()).resolves.toEqual({
      status: "scheduled",
    });
    expect(mockScheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: "studynet-test-notification",
        trigger: expect.objectContaining({
          type: "timeInterval",
          seconds: 5,
        }),
      }),
    );

    mockGetPermissionsAsync.mockResolvedValue({ granted: false });
    mockRequestPermissionsAsync.mockResolvedValue({ granted: false });
    await expect(scheduleStudyNetTestNotification()).resolves.toEqual({
      status: "permission-denied",
    });

    mockGetPermissionsAsync.mockResolvedValue({ granted: true });
    mockScheduleNotificationAsync.mockRejectedValue(new Error("native failed"));
    await expect(scheduleStudyNetTestNotification()).resolves.toEqual({
      status: "unavailable",
    });
  });
});
