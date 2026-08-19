import { useEffect, useState } from "react";
import { Alert } from "react-native";

import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
  isValidReminderTime,
  loadNotificationSettings,
  saveNotificationSettings,
} from "../../utils/notificationSettings";
import {
  scheduleStudyNetTestNotification,
  syncStudyNetNotifications,
} from "../../utils/notificationScheduler";

type UseNotificationSettingsFormParams = {
  onSaved: () => void;
};

export function useNotificationSettingsForm({
  onSaved,
}: UseNotificationSettingsFormParams) {
  const [settings, setSettings] = useState<NotificationSettings>(
    DEFAULT_NOTIFICATION_SETTINGS,
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    loadNotificationSettings().then(setSettings);
  }, []);

  const updateSetting = <K extends keyof NotificationSettings>(
    key: K,
    value: NotificationSettings[K],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const toggleCustomDay = (day: number) => {
    setSettings((current) => {
      const exists = current.customDays.includes(day);
      const nextDays = exists
        ? current.customDays.filter((item) => item !== day)
        : [...current.customDays, day].sort();

      return {
        ...current,
        customDays: nextDays,
      };
    });
  };

  const handleSave = async () => {
    if (saving) return;

    if (!isValidReminderTime(settings.reminderTime)) {
      Alert.alert("시간 확인", "알림 시간은 HH:MM 형식으로 입력해주세요.");
      return;
    }

    if (settings.frequency === "custom" && settings.customDays.length === 0) {
      Alert.alert("요일 확인", "선택 요일 알림은 최소 1개 요일이 필요합니다.");
      return;
    }

    try {
      setSaving(true);
      await saveNotificationSettings(settings);
      const result = await syncStudyNetNotifications(settings);

      if (result.status === "permission-denied") {
        Alert.alert(
          "알림 권한 필요",
          "기기 설정에서 알림 권한을 허용하면 리마인더가 울립니다.",
        );
        return;
      }

      if (result.status === "unavailable") {
        Alert.alert(
          "알림 예약 실패",
          "현재 환경에서 알림을 예약하지 못했어요. 개발 빌드나 실제 기기에서 다시 확인해주세요.",
        );
        return;
      }

      Alert.alert("저장 완료", getSaveMessage(result), [
        { text: "확인", onPress: onSaved },
      ]);
    } catch {
      Alert.alert("저장 실패", "알림 설정을 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  };

  const sendTestNotification = async () => {
    if (testing) return;

    try {
      setTesting(true);
      const result = await scheduleStudyNetTestNotification();

      if (result.status === "permission-denied") {
        Alert.alert("알림 권한 필요", "기기 설정에서 알림 권한을 허용해주세요.");
        return;
      }

      if (result.status === "unavailable") {
        Alert.alert(
          "테스트 실패",
          "현재 환경에서 테스트 알림을 예약하지 못했어요.",
        );
        return;
      }

      Alert.alert("테스트 예약", "약 5초 뒤 테스트 알림이 도착합니다.");
    } finally {
      setTesting(false);
    }
  };

  return {
    settings,
    saving,
    testing,
    updateSetting,
    toggleCustomDay,
    handleSave,
    sendTestNotification,
  };
}

const getSaveMessage = (
  result: Awaited<ReturnType<typeof syncStudyNetNotifications>>,
) => {
  if (result.status === "scheduled") {
    return `${result.count}개 알림이 예약됐어요.`;
  }

  return "알림 예약을 꺼뒀어요.";
};
