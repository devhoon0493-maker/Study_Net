import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { ref, update } from "firebase/database";

import { auth, db } from "../../utils/firebaseConfig";
import {
  formatNotificationSummary,
  loadNotificationSettings,
  saveNotificationSettings,
} from "../../utils/notificationSettings";
import { syncStudyNetNotifications } from "../../utils/notificationScheduler";
import {
  COMMUNITY_ACTIVITY_PUBLIC_KEY,
  STUDY_STATUS_PUBLIC_KEY,
  saveCommunityActivityPublic,
  saveStudyStatusPublic,
} from "../../utils/privacySettings";
import { loadStoredUserProfile } from "../../utils/userProfileStorage";

export type SettingsProfileSummary = {
  name: string;
  email: string;
  image: string | null;
  userType: string;
};

const fallbackProfile: SettingsProfileSummary = {
  name: "Study User",
  email: "user@example.com",
  image: null,
  userType: "",
};

export function useSettingsOverview() {
  const [notifications, setNotifications] = useState(true);
  const [notificationSummary, setNotificationSummary] = useState("매일 20:00");
  const [studyStatusPublic, setStudyStatusPublic] = useState(true);
  const [communityActivityPublic, setCommunityActivityPublic] = useState(false);
  const [profile, setProfile] = useState<SettingsProfileSummary>(fallbackProfile);

  const loadOverview = useCallback(async () => {
    try {
      const [studyStatusEntry, communityActivityEntry] =
        await AsyncStorage.multiGet([
          STUDY_STATUS_PUBLIC_KEY,
          COMMUNITY_ACTIVITY_PUBLIC_KEY,
        ]);
      const parsed = await loadStoredUserProfile();
      const notificationSettings = await loadNotificationSettings();

      setProfile({
        name: parsed?.name || fallbackProfile.name,
        email: parsed?.email || fallbackProfile.email,
        image: parsed?.image || null,
        userType: parsed?.userType || "",
      });
      setNotifications(notificationSettings.enabled);
      setNotificationSummary(formatNotificationSummary(notificationSettings));
      setStudyStatusPublic(studyStatusEntry[1] !== "false");
      setCommunityActivityPublic(communityActivityEntry[1] === "true");
    } catch {
      setProfile(fallbackProfile);
    }
  }, []);

  const updateNotificationSetting = useCallback(async (value: boolean) => {
    setNotifications(value);
    const current = await loadNotificationSettings();
    const next = { ...current, enabled: value };
    await saveNotificationSettings(next);
    const result = await syncStudyNetNotifications(next);
    if (value && result.status === "permission-denied") {
      Alert.alert("알림 권한 필요", "기기 설정에서 알림 권한을 허용해주세요.");
    } else if (value && result.status === "unavailable") {
      Alert.alert("알림 예약 실패", "현재 환경에서 알림을 예약하지 못했어요.");
    }
    setNotificationSummary(formatNotificationSummary(next));
  }, []);

  const updateStudyStatusPublic = useCallback(async (value: boolean) => {
    setStudyStatusPublic(value);
    await saveStudyStatusPublic(value);
    const uid = auth.currentUser?.uid;
    if (uid) {
      await update(ref(db, `users/${uid}`), {
        studyStatusPublic: value,
        updatedAt: Date.now(),
      });
    }
  }, []);

  const updateCommunityActivityPublic = useCallback(async (value: boolean) => {
    setCommunityActivityPublic(value);
    await saveCommunityActivityPublic(value);
    const uid = auth.currentUser?.uid;
    if (uid) {
      await update(ref(db, `users/${uid}`), {
        communityActivityPublic: value,
        updatedAt: Date.now(),
      });
    }
  }, []);

  return {
    profile,
    notifications,
    notificationSummary,
    studyStatusPublic,
    communityActivityPublic,
    loadOverview,
    updateNotificationSetting,
    updateStudyStatusPublic,
    updateCommunityActivityPublic,
  };
}
