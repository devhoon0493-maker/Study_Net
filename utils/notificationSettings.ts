import AsyncStorage from "@react-native-async-storage/async-storage";

export const NOTIFICATIONS_ENABLED_KEY = "settings_notifications_enabled";
export const NOTIFICATION_SETTINGS_KEY = "settings_notification_schedule";

export type NotificationFrequency = "daily" | "weekdays" | "custom";

export type NotificationSettings = {
  enabled: boolean;
  studyReminderEnabled: boolean;
  communityReminderEnabled: boolean;
  reminderTime: string;
  frequency: NotificationFrequency;
  customDays: number[];
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  studyReminderEnabled: true,
  communityReminderEnabled: false,
  reminderTime: "20:00",
  frequency: "daily",
  customDays: [1, 2, 3, 4, 5],
};

export const isValidReminderTime = (value: string) =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

const normalizeSettings = (
  value: Partial<NotificationSettings> | null,
  enabledFallback: boolean,
): NotificationSettings => {
  const enabled =
    typeof value?.enabled === "boolean" ? value.enabled : enabledFallback;
  const studyReminderEnabled =
    typeof value?.studyReminderEnabled === "boolean"
      ? value.studyReminderEnabled
      : DEFAULT_NOTIFICATION_SETTINGS.studyReminderEnabled;
  const communityReminderEnabled =
    typeof value?.communityReminderEnabled === "boolean"
      ? value.communityReminderEnabled
      : DEFAULT_NOTIFICATION_SETTINGS.communityReminderEnabled;
  const reminderTime =
    value?.reminderTime && isValidReminderTime(value.reminderTime)
      ? value.reminderTime
      : DEFAULT_NOTIFICATION_SETTINGS.reminderTime;
  const frequency: NotificationFrequency =
    value?.frequency === "weekdays" || value?.frequency === "custom"
      ? value.frequency
      : "daily";
  const customDays = Array.isArray(value?.customDays)
    ? value.customDays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    : DEFAULT_NOTIFICATION_SETTINGS.customDays;

  return {
    ...DEFAULT_NOTIFICATION_SETTINGS,
    enabled,
    studyReminderEnabled,
    communityReminderEnabled,
    reminderTime,
    frequency,
    customDays: customDays.length > 0 ? [...new Set(customDays)].sort() : DEFAULT_NOTIFICATION_SETTINGS.customDays,
  };
};

export const loadNotificationSettings = async () => {
  const [enabledEntry, settingsEntry] = await AsyncStorage.multiGet([
    NOTIFICATIONS_ENABLED_KEY,
    NOTIFICATION_SETTINGS_KEY,
  ]);
  const enabledFallback = enabledEntry[1] !== "false";

  if (!settingsEntry[1]) {
    return {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      enabled: enabledFallback,
    };
  }

  try {
    return normalizeSettings(JSON.parse(settingsEntry[1]), enabledFallback);
  } catch {
    return {
      ...DEFAULT_NOTIFICATION_SETTINGS,
      enabled: enabledFallback,
    };
  }
};

export const saveNotificationSettings = async (
  settings: NotificationSettings,
) => {
  await AsyncStorage.multiSet([
    [NOTIFICATIONS_ENABLED_KEY, String(settings.enabled)],
    [NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings)],
  ]);
};

export const formatNotificationSummary = (settings: NotificationSettings) => {
  if (!settings.enabled) return "꺼짐";
  if (!settings.studyReminderEnabled && !settings.communityReminderEnabled) {
    return "알림 항목 없음";
  }

  const frequencyLabel =
    settings.frequency === "daily"
      ? "매일"
      : settings.frequency === "weekdays"
        ? "평일"
        : "선택 요일";

  return `${frequencyLabel} ${settings.reminderTime}`;
};
