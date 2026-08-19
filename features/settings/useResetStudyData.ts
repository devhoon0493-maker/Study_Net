import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { get, ref, update } from "firebase/database";

import { MEMBER_KEY } from "../group/groupConstants";
import { PRIMARY_DDAY_KEY } from "../../utils/dday";
import { auth, db } from "../../utils/firebaseConfig";

const STUDY_RECORD_KEYS = ["study_sessions", "active_session"];
const STUDY_GOAL_KEYS = [
  "daily_goal_seconds",
  "weekly_goal_seconds",
  "streak_goal_days",
  PRIMARY_DDAY_KEY,
];

type RoomRecord = {
  members?: Record<string, unknown>;
};

type ResetStudyDataOptions = {
  resetRecords: boolean;
  resetGoals: boolean;
  resetGroupStatus: boolean;
};

type UseResetStudyDataParams = {
  onResetComplete: () => void;
};

export function useResetStudyData({
  onResetComplete,
}: UseResetStudyDataParams) {
  const [busy, setBusy] = useState(false);

  const runReset = useCallback(
    async ({
      resetRecords,
      resetGoals,
      resetGroupStatus,
    }: ResetStudyDataOptions) => {
      const selectedCount = [
        resetRecords,
        resetGoals,
        resetGroupStatus,
      ].filter(Boolean).length;

      if (busy || selectedCount === 0) return;

      Alert.alert(
        "학습 데이터 초기화",
        "선택한 데이터가 삭제됩니다. 이 작업은 되돌릴 수 없어요.",
        [
          { text: "취소", style: "cancel" },
          {
            text: "초기화",
            style: "destructive",
            onPress: async () => {
              try {
                setBusy(true);
                const keysToRemove = [
                  ...(resetRecords ? STUDY_RECORD_KEYS : []),
                  ...(resetGoals ? STUDY_GOAL_KEYS : []),
                ];

                if (keysToRemove.length > 0) {
                  await AsyncStorage.multiRemove(keysToRemove);
                }

                if (resetGroupStatus) {
                  await resetMyGroupStatus();
                }

                Alert.alert("초기화 완료", "선택한 학습 데이터가 삭제됐어요.", [
                  { text: "확인", onPress: onResetComplete },
                ]);
              } catch {
                Alert.alert("초기화 실패", "잠시 후 다시 시도해주세요.");
              } finally {
                setBusy(false);
              }
            },
          },
        ],
      );
    },
    [busy, onResetComplete],
  );

  return {
    busy,
    runReset,
  };
}

async function resetMyGroupStatus() {
  const memberId = await loadCurrentMemberId();
  if (!auth.currentUser || !memberId) return;

  const roomsSnapshot = await get(ref(db, "rooms"));
  const rooms = roomsSnapshot.val() as Record<string, RoomRecord> | null;
  if (!rooms) return;

  const now = Date.now();
  const updates: Record<string, unknown> = {};

  Object.entries(rooms).forEach(([roomId, room]) => {
    if (!room.members?.[memberId]) return;

    updates[`rooms/${roomId}/members/${memberId}/status`] = "접속중";
    updates[`rooms/${roomId}/members/${memberId}/studyStartEpoch`] = null;
    updates[`rooms/${roomId}/members/${memberId}/online`] = false;
    updates[`rooms/${roomId}/members/${memberId}/lastSeenAt`] = now;
  });

  if (Object.keys(updates).length > 0) {
    await update(ref(db), updates);
  }
}

async function loadCurrentMemberId() {
  if (auth.currentUser?.uid) return auth.currentUser.uid;

  try {
    const raw = await AsyncStorage.getItem(MEMBER_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return typeof parsed?.id === "string" ? parsed.id : null;
  } catch {
    return null;
  }
}
