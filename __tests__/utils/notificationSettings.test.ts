import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  NOTIFICATIONS_ENABLED_KEY,
  NOTIFICATION_SETTINGS_KEY,
  formatNotificationSummary,
  isValidReminderTime,
  loadNotificationSettings,
  saveNotificationSettings,
} from "../../utils/notificationSettings";

describe("notification settings", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("validates 24-hour reminder times", () => {
    expect(isValidReminderTime("00:00")).toBe(true);
    expect(isValidReminderTime("09:30")).toBe(true);
    expect(isValidReminderTime("23:59")).toBe(true);
    expect(isValidReminderTime("24:00")).toBe(false);
    expect(isValidReminderTime("12:60")).toBe(false);
    expect(isValidReminderTime("9:30")).toBe(false);
  });

  it("uses defaults when storage is empty", async () => {
    await expect(loadNotificationSettings()).resolves.toEqual(
      DEFAULT_NOTIFICATION_SETTINGS,
    );
  });

  it("honors legacy enabled flag fallback", async () => {
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, "false");

    await expect(loadNotificationSettings()).resolves.toEqual({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      enabled: false,
    });
  });

  it("normalizes malformed persisted settings", async () => {
    await AsyncStorage.setItem(
      NOTIFICATION_SETTINGS_KEY,
      JSON.stringify({
        enabled: true,
        reminderTime: "99:99",
        frequency: "wrong",
        customDays: [6, 2, 2, 8, -1],
      }),
    );

    await expect(loadNotificationSettings()).resolves.toMatchObject({
      enabled: true,
      reminderTime: DEFAULT_NOTIFICATION_SETTINGS.reminderTime,
      frequency: "daily",
      customDays: [2, 6],
    });

    await AsyncStorage.setItem(
      NOTIFICATION_SETTINGS_KEY,
      JSON.stringify({
        reminderTime: "08:00",
        frequency: "custom",
        customDays: [],
      }),
    );
    await expect(loadNotificationSettings()).resolves.toMatchObject({
      enabled: true,
      reminderTime: "08:00",
      frequency: "custom",
      customDays: DEFAULT_NOTIFICATION_SETTINGS.customDays,
    });

    await AsyncStorage.setItem(
      NOTIFICATION_SETTINGS_KEY,
      JSON.stringify({
        enabled: "false",
        studyReminderEnabled: "yes",
        communityReminderEnabled: 1,
        customDays: "bad",
      }),
    );
    await expect(loadNotificationSettings()).resolves.toMatchObject({
      enabled: true,
      studyReminderEnabled: DEFAULT_NOTIFICATION_SETTINGS.studyReminderEnabled,
      communityReminderEnabled: DEFAULT_NOTIFICATION_SETTINGS.communityReminderEnabled,
      customDays: DEFAULT_NOTIFICATION_SETTINGS.customDays,
    });
  });

  it("falls back to defaults for unreadable persisted settings", async () => {
    await AsyncStorage.multiSet([
      [NOTIFICATIONS_ENABLED_KEY, "false"],
      [NOTIFICATION_SETTINGS_KEY, "{bad json"],
    ]);

    await expect(loadNotificationSettings()).resolves.toEqual({
      ...DEFAULT_NOTIFICATION_SETTINGS,
      enabled: false,
    });
  });

  it("saves both enabled flag and full settings", async () => {
    const settings = {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      enabled: false,
      reminderTime: "07:15",
      frequency: "weekdays" as const,
    };

    await saveNotificationSettings(settings);

    await expect(AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY)).resolves.toBe(
      "false",
    );
    await expect(loadNotificationSettings()).resolves.toEqual(settings);
  });

  it("formats concise user summaries", () => {
    expect(
      formatNotificationSummary({
        ...DEFAULT_NOTIFICATION_SETTINGS,
        enabled: false,
      }),
    ).toMatch(/\S+/);

    expect(
      formatNotificationSummary({
        ...DEFAULT_NOTIFICATION_SETTINGS,
        frequency: "daily",
        reminderTime: "20:00",
      }),
    ).toContain("20:00");

    expect(
      formatNotificationSummary({
        ...DEFAULT_NOTIFICATION_SETTINGS,
        studyReminderEnabled: false,
        communityReminderEnabled: false,
      }),
    ).toMatch(/\S+/);

    expect(
      formatNotificationSummary({
        ...DEFAULT_NOTIFICATION_SETTINGS,
        frequency: "weekdays",
      }),
    ).toContain(DEFAULT_NOTIFICATION_SETTINGS.reminderTime);

    expect(
      formatNotificationSummary({
        ...DEFAULT_NOTIFICATION_SETTINGS,
        frequency: "custom",
      }),
    ).toContain(DEFAULT_NOTIFICATION_SETTINGS.reminderTime);
  });
});
