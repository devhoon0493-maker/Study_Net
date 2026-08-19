import AsyncStorage from "@react-native-async-storage/async-storage";
import { equalTo, get, orderByChild, query, ref } from "firebase/database";
import { useCallback, useState } from "react";

import { PRIMARY_DDAY_KEY } from "../../utils/dday";
import { auth, db } from "../../utils/firebaseConfig";
import {
  NOTIFICATION_SETTINGS_KEY,
  NOTIFICATIONS_ENABLED_KEY,
} from "../../utils/notificationSettings";
import { getStudyNetNotificationStatus } from "../../utils/notificationScheduler";
import {
  COMMUNITY_ACTIVITY_PUBLIC_KEY,
  STUDY_STATUS_PUBLIC_KEY,
} from "../../utils/privacySettings";
import { getCommunityBookmarkStorageKey } from "../../utils/communityBookmarks";
import { USER_PROFILE_KEY } from "../../utils/userProfileStorage";

export type StorageItem = {
  label: string;
  value: string;
  status: "ok" | "empty";
};

const localKeys = [
  { key: USER_PROFILE_KEY, label: "프로필 캐시" },
  { key: "study_sessions", label: "공부 기록" },
  { key: "active_session", label: "진행 중 세션" },
  { key: "daily_goal_seconds", label: "일일 목표" },
  { key: "weekly_goal_seconds", label: "주간 목표" },
  { key: "streak_goal_days", label: "연속 학습 목표" },
  { key: PRIMARY_DDAY_KEY, label: "D-Day" },
  { key: NOTIFICATIONS_ENABLED_KEY, label: "알림 사용 여부" },
  { key: NOTIFICATION_SETTINGS_KEY, label: "알림 시간 설정" },
  { key: STUDY_STATUS_PUBLIC_KEY, label: "공부 상태 공개" },
  { key: COMMUNITY_ACTIVITY_PUBLIC_KEY, label: "커뮤니티 활동 공개" },
];

export function useStorageStatus() {
  const [loading, setLoading] = useState(true);
  const [localItems, setLocalItems] = useState<StorageItem[]>([]);
  const [remoteItems, setRemoteItems] = useState<StorageItem[]>([]);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      const keys = [
        ...localKeys,
        {
          key: getCommunityBookmarkStorageKey(user?.uid),
          label: "저장한 게시글",
        },
      ];
      const entries = await AsyncStorage.multiGet(keys.map((item) => item.key));
      const nextLocal = entries.map(([key, value]) => {
        const meta = keys.find((item) => item.key === key);
        return {
          label: meta?.label ?? key,
          value: describeLocalValue(key, value),
          status: value ? "ok" : "empty",
        } satisfies StorageItem;
      });

      const notificationStatus = await getStudyNetNotificationStatus();
      const nextRemote: StorageItem[] = [
        {
          label: "Firebase 로그인",
          value: user ? "연결됨" : "로그인 정보 없음",
          status: user ? "ok" : "empty",
        },
        {
          label: "알림 권한",
          value: notificationStatus.permissionGranted ? "허용됨" : "허용 안 됨",
          status: notificationStatus.permissionGranted ? "ok" : "empty",
        },
        {
          label: "예약된 알림",
          value: `${notificationStatus.activeScheduledCount}/${notificationStatus.scheduledCount}개`,
          status: notificationStatus.activeScheduledCount > 0 ? "ok" : "empty",
        },
      ];

      if (user) {
        const [profileSnapshot, postSnapshot, roomSnapshot] = await Promise.all([
          get(ref(db, `users/${user.uid}`)),
          get(query(ref(db, "communityPosts"), orderByChild("authorId"), equalTo(user.uid))),
          get(ref(db, `userRooms/${user.uid}`)),
        ]);
        const posts = postSnapshot.val() as Record<string, { authorId?: string }> | null;
        const rooms = roomSnapshot.val() as Record<string, boolean> | null;
        const myPostCount = Object.values(posts ?? {}).filter(
          (post) => post.authorId === user.uid,
        ).length;
        const joinedRoomCount = Object.keys(rooms ?? {}).length;

        nextRemote.push(
          {
            label: "원격 프로필",
            value: profileSnapshot.exists() ? "저장됨" : "없음",
            status: profileSnapshot.exists() ? "ok" : "empty",
          },
          {
            label: "작성한 게시글",
            value: `${myPostCount}개`,
            status: myPostCount > 0 ? "ok" : "empty",
          },
          {
            label: "참여 중인 그룹",
            value: `${joinedRoomCount}개`,
            status: joinedRoomCount > 0 ? "ok" : "empty",
          },
        );
      }

      setLocalItems(nextLocal);
      setRemoteItems(nextRemote);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    localItems,
    remoteItems,
    loadStatus,
  };
}

function describeLocalValue(key: string, value: string | null) {
  if (!value) return "없음";

  if (key === "study_sessions") {
    try {
      const list = JSON.parse(value);
      return Array.isArray(list) ? `${list.length}개 기록` : "저장됨";
    } catch {
      return "저장됨";
    }
  }

  if (key.startsWith("community_bookmarked_posts")) {
    try {
      const list = JSON.parse(value);
      return Array.isArray(list) ? `${list.length}개 저장` : "저장됨";
    } catch {
      return "저장됨";
    }
  }

  if (key === "active_session") return "진행 중";
  if (key.endsWith("_seconds")) {
    const seconds = Number(value);
    return Number.isFinite(seconds) && seconds > 0
      ? `${Math.round(seconds / 60)}분`
      : "저장됨";
  }
  if (key.endsWith("_public") || key === NOTIFICATIONS_ENABLED_KEY) {
    return value === "false" ? "꺼짐" : "켜짐";
  }

  return "저장됨";
}
