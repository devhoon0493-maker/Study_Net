import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { deleteUser, signOut } from "firebase/auth";
import { ref, remove } from "firebase/database";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BottomNav, { getBottomNavSpace } from "../../components/BottomNav";
import { getScreenTopPadding } from "../../constants/layout";
import { useMonoTheme, type MonoTheme } from "../../constants/mono";
import { PRIMARY_DDAY_KEY } from "../../utils/dday";
import { auth, db } from "../../utils/firebaseConfig";

type UserProfile = {
  name?: string;
  email?: string;
  image?: string | null;
  userType?: string;
};

type SettingIcon = keyof typeof Ionicons.glyphMap;

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
  const topPadding = getScreenTopPadding(insets.top);

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
          const [profileEntry, notificationsEntry, studyStatusEntry, communityActivityEntry] =
            await AsyncStorage.multiGet([
              "userProfile",
              NOTIFICATIONS_KEY,
              STUDY_STATUS_PUBLIC_KEY,
              COMMUNITY_ACTIVITY_PUBLIC_KEY,
            ]);
          const parsed: UserProfile | null = profileEntry[1] ? JSON.parse(profileEntry[1]) : null;

          setName(parsed?.name || "Study User");
          setEmail(parsed?.email || "user@example.com");
          setImage(parsed?.image || null);
          setUserType(parsed?.userType || "");
          setNotifications(notificationsEntry[1] !== "false");
          setStudyStatusPublic(studyStatusEntry[1] !== "false");
          setCommunityActivityPublic(communityActivityEntry[1] === "true");
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

  const clearLocalAccountData = async () => {
    await AsyncStorage.multiRemove([
      "userProfile",
      "study_sessions",
      "active_session",
      "group_member_profile",
      PRIMARY_DDAY_KEY,
    ]);
  };

  const resetStudyData = () => {
    Alert.alert("학습 데이터 초기화", "저장된 공부 기록을 모두 삭제할까요?", [
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
      "계정 정보는 Firebase와 동기화되고, 공부 기록과 임시 커뮤니티 글은 현재 기기에 저장됩니다.",
    );
  };

  const showComingSoon = (title: string) => {
    Alert.alert(title, "이 기능은 다음 단계에서 연결할 예정입니다.");
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.78}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>설정</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomSpace + 24 }]}
      >
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
            <Text style={styles.profileName} numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {email}
            </Text>
            {userType ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{userType}</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push("/setting/profile")}
            activeOpacity={0.78}
          >
            <Ionicons name="create-outline" size={16} color={C.primary} />
          </TouchableOpacity>
        </View>

        <SettingGroup title="계정" icon="person-circle-outline" styles={styles} C={C}>
          <SettingRow
            icon="person-outline"
            label="프로필 관리"
            description="이름, 이메일, 사용자 유형"
            onPress={() => router.push("/setting/profile")}
            styles={styles}
            theme={C}
          />
          <SettingRow
            icon="id-card-outline"
            label="공개 프로필"
            description="다른 사용자에게 보이는 정보"
            onPress={() => router.push("/setting/public-profile")}
            styles={styles}
            theme={C}
          />
          <SettingRow
            icon="lock-closed-outline"
            label="비밀번호 변경"
            description="로그인 보안 설정"
            onPress={() => router.push("/setting/password")}
            styles={styles}
            theme={C}
            isLast
          />
        </SettingGroup>

        <SettingGroup title="학습" icon="book-outline" styles={styles} C={C}>
          <SettingRow
            icon="flag-outline"
            label="학습 목표"
            description="일간 목표, 주간 목표, D-Day"
            onPress={() => router.push("/setting/goals")}
            styles={styles}
            theme={C}
          />
          <SettingRow
            icon="cloud-done-outline"
            label="저장 상태"
            description="기록 저장 방식 확인"
            onPress={showStorageStatus}
            styles={styles}
            theme={C}
            isLast
          />
        </SettingGroup>

        <SettingGroup title="앱 설정" icon="options-outline" styles={styles} C={C}>
          <SwitchRow
            icon="notifications-outline"
            label="알림"
            description="공부와 커뮤니티 알림"
            value={notifications}
            onChange={updateNotificationSetting}
            styles={styles}
            theme={C}
          />
          <SettingRow
            icon="time-outline"
            label="알림 시간"
            description="준비 중"
            onPress={() => showComingSoon("알림 시간 설정")}
            styles={styles}
            theme={C}
          />
          <SwitchRow
            icon="moon-outline"
            label="다크 모드"
            description="화면 테마 변경"
            value={isDark}
            onChange={toggleMode}
            styles={styles}
            theme={C}
            isLast
          />
        </SettingGroup>

        <SettingGroup title="개인정보" icon="shield-checkmark-outline" styles={styles} C={C}>
          <SwitchRow
            icon="radio-outline"
            label="공부 상태 공개"
            description="그룹과 커뮤니티에 학습 상태 표시"
            value={studyStatusPublic}
            onChange={updateStudyStatusPublic}
            styles={styles}
            theme={C}
          />
          <SwitchRow
            icon="chatbubble-ellipses-outline"
            label="커뮤니티 활동 공개"
            description="작성 활동을 공개 프로필에 표시"
            value={communityActivityPublic}
            onChange={updateCommunityActivityPublic}
            styles={styles}
            theme={C}
            isLast
          />
        </SettingGroup>

        <SettingGroup title="지원 및 정보" icon="help-circle-outline" styles={styles} C={C}>
          <SettingRow
            icon="mail-outline"
            label="문의하기"
            description="준비 중"
            onPress={() => showComingSoon("문의하기")}
            styles={styles}
            theme={C}
          />
          <SettingRow
            icon="document-text-outline"
            label="개인정보 처리방침"
            description="준비 중"
            onPress={() => showComingSoon("개인정보 처리방침")}
            styles={styles}
            theme={C}
          />
          <InfoRow
            icon="information-circle-outline"
            label="앱 버전"
            value={APP_VERSION}
            styles={styles}
            theme={C}
            isLast
          />
        </SettingGroup>

        <View style={styles.dangerGroup}>
          <Text style={styles.dangerTitle}>데이터 및 계정</Text>
          <SettingRow
            icon="trash-outline"
            label="학습 데이터 초기화"
            description="공부 기록과 진행 중 세션 삭제"
            onPress={resetStudyData}
            styles={styles}
            theme={C}
          />
          <TouchableOpacity
            style={[styles.accountButton, accountBusy && styles.accountBtnDisabled]}
            onPress={handleLogout}
            disabled={accountBusy}
            activeOpacity={0.78}
          >
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.accountButton, styles.deleteAccountBtn, accountBusy && styles.accountBtnDisabled]}
            onPress={handleDeleteAccount}
            disabled={accountBusy}
            activeOpacity={0.78}
          >
            <Text style={styles.deleteAccountText}>회원 탈퇴</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

function SettingGroup({
  title,
  icon,
  children,
  styles,
  C,
}: {
  title: string;
  icon: SettingIcon;
  children: React.ReactNode;
  styles: ReturnType<typeof createStyles>;
  C: MonoTheme;
}) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <View style={styles.groupIcon}>
          <Ionicons name={icon} size={16} color={C.primary} />
        </View>
        <Text style={styles.groupTitle}>{title}</Text>
      </View>
      <View style={styles.groupBody}>{children}</View>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  description,
  onPress,
  styles,
  theme,
  isLast,
}: {
  icon: SettingIcon;
  label: string;
  description?: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  theme: MonoTheme;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, isLast && styles.rowLast]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={theme.text} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowText}>{label}</Text>
        {description ? <Text style={styles.rowDesc}>{description}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.subtle} />
    </TouchableOpacity>
  );
}

function InfoRow({
  icon,
  label,
  value,
  styles,
  theme,
  isLast,
}: {
  icon: SettingIcon;
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  theme: MonoTheme;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={theme.text} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowText}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function SwitchRow({
  icon,
  label,
  description,
  value,
  onChange,
  styles,
  theme,
  isLast,
}: {
  icon: SettingIcon;
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  styles: ReturnType<typeof createStyles>;
  theme: MonoTheme;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={theme.text} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowText}>{label}</Text>
        {description ? <Text style={styles.rowDesc}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.surfaceAlt, true: theme.primarySoft }}
        thumbColor={value ? theme.primary : theme.subtle}
        ios_backgroundColor={theme.surfaceAlt}
      />
    </View>
  );
}

const createStyles = (C: MonoTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
      paddingHorizontal: 18,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    headerSpacer: {
      width: 40,
      height: 40,
    },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 13,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
      backgroundColor: C.surface,
      justifyContent: "center",
      alignItems: "center",
    },
    headerTitle: {
      color: C.text,
      fontSize: 24,
      fontWeight: "900",
    },
    scrollContent: {
      gap: 14,
    },
    profileCard: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.borderSoft,
      borderRadius: 22,
      padding: 16,
      flexDirection: "row",
      alignItems: "center",
      shadowColor: C.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    profileInfo: {
      flex: 1,
      marginLeft: 13,
      minWidth: 0,
    },
    avatar: {
      width: 58,
      height: 58,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.primarySoft,
      justifyContent: "center",
      alignItems: "center",
      overflow: "hidden",
    },
    avatarImage: {
      width: "100%",
      height: "100%",
    },
    avatarText: {
      color: C.primary,
      fontWeight: "900",
      fontSize: 22,
    },
    profileName: {
      color: C.text,
      fontWeight: "900",
      fontSize: 17,
    },
    profileEmail: {
      color: C.muted,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 3,
    },
    badge: {
      alignSelf: "flex-start",
      backgroundColor: C.surfaceAlt,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 999,
      marginTop: 8,
    },
    badgeText: {
      color: C.text,
      fontSize: 11,
      fontWeight: "800",
    },
    editBtn: {
      width: 38,
      height: 38,
      borderRadius: 13,
      backgroundColor: C.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginLeft: 10,
    },
    group: {
      backgroundColor: C.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: C.borderSoft,
      overflow: "hidden",
    },
    groupHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 15,
      paddingTop: 15,
      paddingBottom: 8,
    },
    groupIcon: {
      width: 28,
      height: 28,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.primarySoft,
    },
    groupTitle: {
      color: C.text,
      fontSize: 15,
      fontWeight: "900",
    },
    groupBody: {
      paddingHorizontal: 15,
      paddingBottom: 8,
    },
    row: {
      minHeight: 62,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      borderBottomWidth: 1,
      borderBottomColor: C.borderSoft,
      gap: 11,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    rowIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: C.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    rowBody: {
      flex: 1,
      minWidth: 0,
    },
    rowText: {
      color: C.text,
      fontSize: 14,
      fontWeight: "900",
    },
    rowDesc: {
      color: C.muted,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 3,
    },
    infoValue: {
      color: C.muted,
      fontSize: 13,
      fontWeight: "900",
    },
    dangerGroup: {
      backgroundColor: C.surface,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: C.borderSoft,
      padding: 15,
      gap: 10,
    },
    dangerTitle: {
      color: C.text,
      fontSize: 15,
      fontWeight: "900",
    },
    accountButton: {
      minHeight: 50,
      borderRadius: 15,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surfaceAlt,
    },
    logoutText: {
      color: C.text,
      fontWeight: "900",
    },
    deleteAccountBtn: {
      backgroundColor: C.dangerSoft,
    },
    deleteAccountText: {
      color: C.danger,
      fontWeight: "900",
    },
    accountBtnDisabled: {
      opacity: 0.45,
    },
  });
