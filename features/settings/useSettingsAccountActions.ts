import AsyncStorage from "@react-native-async-storage/async-storage";
import { deleteUser, signOut } from "firebase/auth";
import { get, ref, update } from "firebase/database";
import { useCallback, useState } from "react";
import { Alert } from "react-native";

import { buildAccountCleanupUpdates } from "../../utils/accountCleanup";
import { PRIMARY_DDAY_KEY } from "../../utils/dday";
import { getErrorCode } from "../../utils/errorMessages";
import { auth, db } from "../../utils/firebaseConfig";
import { USER_PROFILE_KEY } from "../../utils/userProfileStorage";

type UseSettingsAccountActionsParams = {
  onExitToLogin: () => void;
};

const LOCAL_ACCOUNT_KEYS = [
  USER_PROFILE_KEY,
  "study_sessions",
  "active_session",
  "group_member_profile",
  PRIMARY_DDAY_KEY,
];

export function useSettingsAccountActions({
  onExitToLogin,
}: UseSettingsAccountActionsParams) {
  const [accountBusy, setAccountBusy] = useState(false);

  const clearLocalAccountData = useCallback(async () => {
    await AsyncStorage.multiRemove(LOCAL_ACCOUNT_KEYS);
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert("로그아웃", "현재 계정에서 로그아웃할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        onPress: async () => {
          try {
            setAccountBusy(true);
            await signOut(auth);
            await AsyncStorage.multiRemove([USER_PROFILE_KEY, "active_session"]);
            onExitToLogin();
          } finally {
            setAccountBusy(false);
          }
        },
      },
    ]);
  }, [onExitToLogin]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      "회원 탈퇴",
      "계정과 저장된 사용자 정보를 삭제할까요? 이 작업은 되돌릴 수 없습니다.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴하기",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;

            if (!user) {
              await clearLocalAccountData();
              onExitToLogin();
              return;
            }

            try {
              setAccountBusy(true);
              const uid = user.uid;
              const [
                postsSnapshot,
                cheersSnapshot,
                commentsSnapshot,
                roomsSnapshot,
              ] = await Promise.all([
                get(ref(db, "communityPosts")),
                get(ref(db, "communityPostCheers")),
                get(ref(db, "communityPostComments")),
                get(ref(db, "rooms")),
              ]);
              const cleanupUpdates = buildAccountCleanupUpdates(uid, {
                communityPosts: postsSnapshot.val() ?? {},
                communityPostCheers: cheersSnapshot.val() ?? {},
                communityPostComments: commentsSnapshot.val() ?? {},
                rooms: roomsSnapshot.val() ?? {},
              });

              await update(ref(db), cleanupUpdates);
              await deleteUser(user);
              await clearLocalAccountData();
              onExitToLogin();
            } catch (error) {
              if (getErrorCode(error) === "auth/requires-recent-login") {
                Alert.alert(
                  "다시 로그인 필요",
                  "보안을 위해 다시 로그인한 뒤 회원 탈퇴를 시도해주세요.",
                );
              } else {
                Alert.alert("회원 탈퇴 실패", "잠시 후 다시 시도해주세요.");
              }
            } finally {
              setAccountBusy(false);
            }
          },
        },
      ],
    );
  }, [clearLocalAccountData, onExitToLogin]);

  return {
    accountBusy,
    handleLogout,
    handleDeleteAccount,
  };
}
