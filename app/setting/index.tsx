import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { deleteUser, signOut } from "firebase/auth";
import { ref, remove } from "firebase/database";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BottomNav, { getBottomNavSpace } from "../../components/BottomNav";
import { useMonoTheme, type MonoTheme } from "../../constants/mono";
import { PRIMARY_DDAY_KEY } from "../../utils/dday";
import { auth, db } from "../../utils/firebaseConfig";

type UserProfile = {
  name?: string;
  email?: string;
  image?: string | null;
  userType?: string;
};

const NOTIFICATIONS_KEY = "settings_notifications_enabled";
const STUDY_STATUS_PUBLIC_KEY = "settings_study_status_public";
const COMMUNITY_ACTIVITY_PUBLIC_KEY = "settings_community_activity_public";
const APP_VERSION = "1.0.0";

export default function SettingsScreen() {
  const router = useRouter();
  const { theme: C, isDark, toggleMode } = useMonoTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(C), [C]);
  const bottomSpace = getBottomNavSpace(insets.bottom);

  const [notifications, setNotifications] = useState(true);
  const [studyStatusPublic, setStudyStatusPublic] = useState(true);
  const [communityActivityPublic, setCommunityActivityPublic] = useState(false);
  const [name, setName] = useState("Study User");
  const [email, setEmail] = useState("user@example.com");
  const [image, setImage] = useState<string | null>(null);
  const [userType, setUserType] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const loadProfile = async () => {
        try {
          const [saved, notificationsRaw, studyStatusRaw, communityActivityRaw] =
            await AsyncStorage.multiGet([
              "userProfile",
              NOTIFICATIONS_KEY,
              STUDY_STATUS_PUBLIC_KEY,
              COMMUNITY_ACTIVITY_PUBLIC_KEY,
            ]);
          const profileRaw = saved[1];
          const parsed: UserProfile | null = profileRaw ? JSON.parse(profileRaw) : null;

          setName(parsed?.name || "Study User");
          setEmail(parsed?.email || "user@example.com");
          setImage(parsed?.image || null);
          setUserType(parsed?.userType || "");
          setNotifications(notificationsRaw[1] !== "false");
          setStudyStatusPublic(studyStatusRaw[1] !== "false");
          setCommunityActivityPublic(communityActivityRaw[1] === "true");
        } catch {
          setName("Study User");
          setEmail("user@example.com");
          setImage(null);
          setUserType("");
        }
      };

      loadProfile();
    }, []),
  );

  const resetStudyData = () => {
    Alert.alert("학습 데이터 초기화", "저장된 공부 기록을 모두 지울까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "초기화",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.multiRemove(["study_sessions", "active_session"]);
        },
      },
    ]);
  };

  const clearLocalAccountData = async () => {
    await AsyncStorage.multiRemove([
      "userProfile",
      "study_sessions",
      "active_session",
      "group_member_profile",
      PRIMARY_DDAY_KEY,
    ]);
  };

  const handleLogout = () => {
    Alert.alert("로그아웃", "현재 계정에서 로그아웃할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "로그아웃",
        onPress: async () => {
          try {
            setAccountBusy(true);
            await signOut(auth);
            await AsyncStorage.multiRemove(["userProfile", "active_session"]);
            router.replace("/login");
          } finally {
            setAccountBusy(false);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "회원 탈퇴",
      "계정과 저장된 사용자 정보를 삭제할까요? 이 작업은 되돌릴 수 없어요.",
      [
        { text: "취소", style: "cancel" },
        {
          text: "탈퇴하기",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;

            if (!user) {
              await clearLocalAccountData();
              router.replace("/login");
              return;
            }

            try {
              setAccountBusy(true);
              const uid = user.uid;
              await deleteUser(user);
              await remove(ref(db, `users/${uid}`));
              await clearLocalAccountData();
              router.replace("/login");
            } catch (error: any) {
              if (error?.code === "auth/requires-recent-login") {
                Alert.alert("다시 로그인 필요", "보안을 위해 다시 로그인한 뒤 회원 탈퇴를 시도해주세요.");
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
  };

  const updateNotificationSetting = async (value: boolean) => {
    setNotifications(value);
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, String(value));
  };

  const updateStudyStatusPublic = async (value: boolean) => {
    setStudyStatusPublic(value);
    await AsyncStorage.setItem(STUDY_STATUS_PUBLIC_KEY, String(value));
  };

  const updateCommunityActivityPublic = async (value: boolean) => {
    setCommunityActivityPublic(value);
    await AsyncStorage.setItem(COMMUNITY_ACTIVITY_PUBLIC_KEY, String(value));
  };

  const showStorageStatus = () => {
    Alert.alert(
      "저장 상태",
      "계정 정보는 Firebase와 동기화되고, 학습 기록과 커뮤니티 임시 글은 현재 기기에 저장돼요.",
    );
  };

  const showComingSoon = (title: string) => {
    Alert.alert(title, "이 기능은 다음 단계에서 연결할 예정이에요.");
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>설정</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomSpace + 24 }]}>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {image ? (
              <Image source={{ uri: image }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {name ? name.charAt(0).toUpperCase() : "S"}
              </Text>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{name}</Text>

            {userType ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{userType}</Text>
              </View>
            ) : null}

            <Text style={styles.profileEmail}>{email}</Text>
          </View>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push("/setting/profile")}
          >
            <Text style={styles.editText}>수정</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>계정</Text>
        <SettingRow
          label="프로필 관리"
          onPress={() => router.push("/setting/profile")}
          styles={styles}
          theme={C}
        />
        <SettingRow
          label="공개 프로필"
          onPress={() => router.push("/setting/public-profile")}
          styles={styles}
          theme={C}
        />
        <SettingRow
          label="비밀번호 변경"
          onPress={() => router.push("/setting/password")}
          styles={styles}
          theme={C}
        />
        <SettingRow
          label="로그인 및 보안"
          onPress={() => showComingSoon("로그인 및 보안")}
          styles={styles}
          theme={C}
        />

        <Text style={styles.sectionTitle}>학습 설정</Text>
        <SettingRow
          label="학습 목표 설정"
          onPress={() => router.push("/setting/goals")}
          styles={styles}
          theme={C}
        />
        <SettingRow
          label="저장 상태"
          onPress={showStorageStatus}
          styles={styles}
          theme={C}
        />

        <Text style={styles.sectionTitle}>알림</Text>
        <SwitchRow
          label="전체 알림"
          value={notifications}
          onChange={updateNotificationSetting}
          styles={styles}
          theme={C}
        />
        <SettingRow
          label="알림 세부 설정"
          onPress={() => showComingSoon("알림 세부 설정")}
          styles={styles}
          theme={C}
        />

        <Text style={styles.sectionTitle}>개인정보</Text>
        <SwitchRow
          label="공부 상태 공개"
          value={studyStatusPublic}
          onChange={updateStudyStatusPublic}
          styles={styles}
          theme={C}
        />
        <SwitchRow
          label="커뮤니티 활동 공개"
          value={communityActivityPublic}
          onChange={updateCommunityActivityPublic}
          styles={styles}
          theme={C}
        />

        <Text style={styles.sectionTitle}>화면</Text>
        <SwitchRow
          label="다크 모드"
          value={isDark}
          onChange={toggleMode}
          styles={styles}
          theme={C}
        />

        <Text style={styles.sectionTitle}>지원</Text>
        <SettingRow
          label="문의하기"
          onPress={() => showComingSoon("문의하기")}
          styles={styles}
          theme={C}
        />
        <SettingRow
          label="개인정보 처리방침"
          onPress={() => showComingSoon("개인정보 처리방침")}
          styles={styles}
          theme={C}
        />
        <SettingRow
          label="오픈소스 라이선스"
          onPress={() => showComingSoon("오픈소스 라이선스")}
          styles={styles}
          theme={C}
        />

        <Text style={styles.sectionTitle}>앱 정보</Text>
        <InfoRow label="버전" value={APP_VERSION} styles={styles} />
        <InfoRow label="앱 이름" value="StudyNet" styles={styles} />

        <Text style={styles.sectionTitle}>데이터</Text>
        <SettingRow
          label="학습 데이터 초기화"
          onPress={resetStudyData}
          styles={styles}
          theme={C}
        />

        <TouchableOpacity
          style={[styles.logoutBtn, accountBusy && styles.accountBtnDisabled]}
          onPress={handleLogout}
          disabled={accountBusy}
        >
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.deleteAccountBtn, accountBusy && styles.accountBtnDisabled]}
          onPress={handleDeleteAccount}
          disabled={accountBusy}
        >
          <Text style={styles.deleteAccountText}>회원 탈퇴</Text>
        </TouchableOpacity>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

function SettingRow({
  label,
  onPress,
  styles,
  theme,
}: {
  label: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  theme: MonoTheme;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Text style={styles.rowText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={theme.text} />
    </TouchableOpacity>
  );
}

function InfoRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowText}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function SwitchRow({
  label,
  value,
  onChange,
  styles,
  theme,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  styles: ReturnType<typeof createStyles>;
  theme: MonoTheme;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowText}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.surface, true: theme.text }}
        thumbColor={theme.inverse}
        ios_backgroundColor={theme.surface}
      />
    </View>
  );
}

const createStyles = (C: MonoTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
      paddingTop: 60,
      paddingHorizontal: 18,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 22,
    },
    headerSpacer: {
      width: 32,
      height: 32,
    },
    backBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
      backgroundColor: C.surface,
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.16,
      shadowRadius: 2,
      elevation: 2,
    },
    headerTitle: {
      color: C.text,
      fontSize: 18,
      fontWeight: "800",
    },
    scrollContent: {
      paddingBottom: 40,
    },
    profileCard: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
      borderRadius: 18,
      padding: 18,
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 26,
    },
    profileInfo: {
      flex: 1,
      marginLeft: 14,
    },
    avatar: {
      width: 54,
      height: 54,
      borderRadius: 27,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
      backgroundColor: C.surface,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarText: {
      color: C.text,
      fontWeight: "800",
      fontSize: 20,
    },
    profileName: {
      color: C.text,
      fontWeight: "700",
      fontSize: 15,
    },
    badge: {
      backgroundColor: C.surface,
      alignSelf: "flex-start",
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      marginTop: 6,
    },
    badgeText: {
      color: C.text,
      fontSize: 11,
      fontWeight: "700",
    },
    profileEmail: {
      color: C.text,
      fontSize: 12,
      marginTop: 6,
    },
    editBtn: {
      minWidth: 52,
      height: 34,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: C.surface,
      marginLeft: 10,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.14,
      shadowRadius: 2,
      elevation: 2,
    },
    editText: {
      color: C.text,
      fontSize: 12,
      fontWeight: "600",
    },
    sectionTitle: {
      color: C.text,
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 8,
      marginTop: 14,
      marginLeft: 4,
    },
    row: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      borderRadius: 14,
      minHeight: 56,
      paddingHorizontal: 16,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.14,
      shadowRadius: 2,
      elevation: 2,
    },
    rowText: {
      color: C.text,
      fontSize: 14,
      fontWeight: "600",
    },
    infoValue: {
      color: C.text,
      fontSize: 13,
      fontWeight: "800",
    },
    logoutBtn: {
      marginTop: 28,
      backgroundColor: C.surface,
      minHeight: 56,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.14,
      shadowRadius: 2,
      elevation: 2,
    },
    logoutText: {
      color: C.text,
      fontWeight: "700",
    },
    deleteAccountBtn: {
      marginTop: 10,
      backgroundColor: C.surface,
      minHeight: 56,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.14,
      shadowRadius: 2,
      elevation: 2,
    },
    deleteAccountText: {
      color: C.text,
      fontWeight: "800",
    },
    accountBtnDisabled: {
      opacity: 0.45,
    },
  });
