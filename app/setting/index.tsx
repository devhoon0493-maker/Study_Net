import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BottomNav, { getBottomNavSpace } from "../../components/BottomNav";
import { getScreenTopPadding } from "../../constants/layout";
import { useMonoTheme } from "../../constants/mono";
import {
  InfoRow,
  SettingGroup,
  SettingRow,
  SwitchRow,
} from "../../features/settings/SettingsRows";
import {
  RESET_STUDY_LINK,
  SETTINGS_LINK_GROUPS,
} from "../../features/settings/settingsMenu";
import { createSettingsStyles } from "../../features/settings/settingsStyles";
import { useSettingsAccountActions } from "../../features/settings/useSettingsAccountActions";
import { useSettingsOverview } from "../../features/settings/useSettingsOverview";

const APP_VERSION = "1.0.0";

export default function SettingsScreen() {
  const router = useRouter();
  const { theme: C, isDark, toggleMode } = useMonoTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createSettingsStyles(C), [C]);
  const bottomSpace = getBottomNavSpace(insets.bottom);
  const topPadding = getScreenTopPadding(insets.top);

  const {
    profile,
    notifications,
    notificationSummary,
    studyStatusPublic,
    communityActivityPublic,
    loadOverview,
    updateNotificationSetting,
    updateStudyStatusPublic,
    updateCommunityActivityPublic,
  } = useSettingsOverview();
  const { accountBusy, handleLogout, handleDeleteAccount } =
    useSettingsAccountActions({
      onExitToLogin: () => router.replace("/login"),
    });

  useFocusEffect(
    useCallback(() => {
      loadOverview();
    }, [loadOverview]),
  );

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
      <View style={styles.headerRow}>
        <TouchableOpacity
          testID="settings-back-button"
          onPress={() => router.back()}
          style={styles.backBtn}
          activeOpacity={0.78}
        >
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
            {profile.image ? (
              <Image source={{ uri: profile.image }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {profile.name ? profile.name.charAt(0).toUpperCase() : "S"}
              </Text>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {profile.name}
            </Text>
            <Text style={styles.profileEmail} numberOfLines={1}>
              {profile.email}
            </Text>
            {profile.userType ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{profile.userType}</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            testID="settings-profile-edit-button"
            style={styles.editBtn}
            onPress={() => router.push("/setting/profile")}
            activeOpacity={0.78}
          >
            <Ionicons name="create-outline" size={16} color={C.primary} />
          </TouchableOpacity>
        </View>

        {SETTINGS_LINK_GROUPS.slice(0, 3).map((group) => (
          <SettingGroup
            key={group.title}
            title={group.title}
            icon={group.icon}
            styles={styles}
            C={C}
          >
            {group.items.map((item, index) => (
              <SettingRow
                key={item.route.toString()}
                icon={item.icon}
                label={item.label}
                description={item.description}
                onPress={() => router.push(item.route)}
                styles={styles}
                theme={C}
                isLast={index === group.items.length - 1}
              />
            ))}
          </SettingGroup>
        ))}

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
            description={notificationSummary}
            onPress={() => router.push("/setting/notifications")}
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

        <SettingGroup
          title={SETTINGS_LINK_GROUPS[3].title}
          icon={SETTINGS_LINK_GROUPS[3].icon}
          styles={styles}
          C={C}
        >
          {SETTINGS_LINK_GROUPS[3].items.map((item) => (
            <SettingRow
              key={item.route.toString()}
              icon={item.icon}
              label={item.label}
              description={item.description}
              onPress={() => router.push(item.route)}
              styles={styles}
              theme={C}
            />
          ))}
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
            icon={RESET_STUDY_LINK.icon}
            label={RESET_STUDY_LINK.label}
            description={RESET_STUDY_LINK.description}
            onPress={() => router.push(RESET_STUDY_LINK.route)}
            styles={styles}
            theme={C}
          />
          <TouchableOpacity
            testID="settings-logout-button"
            style={[styles.accountButton, accountBusy && styles.accountBtnDisabled]}
            onPress={handleLogout}
            disabled={accountBusy}
            activeOpacity={0.78}
          >
            <Text style={styles.logoutText}>로그아웃</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="settings-delete-account-button"
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
