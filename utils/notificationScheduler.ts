import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { NotificationSettings } from "./notificationSettings";

const CHANNEL_ID = "studynet-reminders";
const SCHEDULED_IDS_KEY = "settings_notification_scheduled_ids";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type NotificationSyncResult =
  | { status: "scheduled"; count: number }
  | { status: "disabled" }
  | { status: "permission-denied" }
  | { status: "unavailable" };

type SyncOptions = {
  requestPermission?: boolean;
};

export const cancelStudyNetNotifications = async () => {
  const ids = await loadScheduledIds();
  await Promise.all(
    ids.map((id) =>
      Notifications.cancelScheduledNotificationAsync(id).catch(() => {}),
    ),
  );
  await AsyncStorage.removeItem(SCHEDULED_IDS_KEY);
};

export const syncStudyNetNotifications = async (
  settings: NotificationSettings,
  options: SyncOptions = {},
): Promise<NotificationSyncResult> => {
  await cancelStudyNetNotifications();

  if (
    !settings.enabled ||
    (!settings.studyReminderEnabled && !settings.communityReminderEnabled)
  ) {
    return { status: "disabled" };
  }

  const permissionGranted = await ensureNotificationPermission(
    options.requestPermission ?? true,
  );
  if (!permissionGranted) return { status: "permission-denied" };

  try {
    await ensureAndroidChannel();
    const [hour, minute] = settings.reminderTime.split(":").map(Number);
    const triggers = buildTriggers(settings, hour, minute);
    const content = buildNotificationContent(settings);
    const ids: string[] = [];

    for (let index = 0; index < triggers.length; index += 1) {
      const id = await Notifications.scheduleNotificationAsync({
        identifier: `studynet-reminder-${index}`,
        content,
        trigger: triggers[index],
      });
      ids.push(id);
    }

    await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(ids));
    return { status: "scheduled", count: ids.length };
  } catch {
    return { status: "unavailable" };
  }
};

export const getStudyNetNotificationStatus = async () => {
  const [ids, scheduled, permissions] = await Promise.all([
    loadScheduledIds(),
    Notifications.getAllScheduledNotificationsAsync().catch(() => []),
    Notifications.getPermissionsAsync().catch(() => null),
  ]);
  const activeScheduledCount = scheduled.filter((request) =>
    ids.includes(request.identifier),
  ).length;

  return {
    scheduledCount: ids.length,
    activeScheduledCount,
    permissionGranted: permissions?.granted === true,
  };
};

export const scheduleStudyNetTestNotification = async () => {
  const permissionGranted = await ensureNotificationPermission(true);
  if (!permissionGranted) return { status: "permission-denied" as const };

  try {
    await ensureAndroidChannel();
    await Notifications.scheduleNotificationAsync({
      identifier: "studynet-test-notification",
      content: {
        title: "StudyNet 테스트 알림",
        body: "알림 설정이 정상적으로 동작하고 있어요.",
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
      },
    });

    return { status: "scheduled" as const };
  } catch {
    return { status: "unavailable" as const };
  }
};

const ensureNotificationPermission = async (requestPermission: boolean) => {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!requestPermission) return false;

  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  return requested.granted;
};

const ensureAndroidChannel = async () => {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "StudyNet 리마인더",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
  });
};

const buildTriggers = (
  settings: NotificationSettings,
  hour: number,
  minute: number,
) => {
  if (settings.frequency === "daily") {
    return [
      {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    ];
  }

  const days =
    settings.frequency === "weekdays" ? [1, 2, 3, 4, 5] : settings.customDays;

  return days.map((day) => ({
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    weekday: day + 1,
    hour,
    minute,
    channelId: CHANNEL_ID,
  }));
};

const buildNotificationContent = (settings: NotificationSettings) => {
  if (settings.studyReminderEnabled && settings.communityReminderEnabled) {
    return {
      title: "StudyNet",
      body: "공부를 시작하고 커뮤니티도 확인할 시간이에요.",
      sound: "default",
    };
  }

  if (settings.studyReminderEnabled) {
    return {
      title: "공부할 시간이에요",
      body: "오늘 목표를 향해 짧게라도 시작해보세요.",
      sound: "default",
    };
  }

  return {
    title: "커뮤니티 확인 시간",
    body: "새로운 공부 인증과 응원을 확인해보세요.",
    sound: "default",
  };
};

const loadScheduledIds = async () => {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
};
