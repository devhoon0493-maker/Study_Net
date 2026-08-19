import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import type { HomeStyles } from "../homeStyles";
import type { HomeTheme } from "../homeTheme";

export function HomeHeader({
  notificationCount,
  styles,
  C,
  topPadding,
  onOpenNotifications,
  onOpenSettings,
}: {
  notificationCount: number;
  styles: HomeStyles;
  C: HomeTheme;
  topPadding: number;
  onOpenNotifications: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <View style={[styles.header, { paddingTop: topPadding }]}>
      <View style={styles.brandRow}>
        <View style={styles.logoMark}>
          <Ionicons name="book-outline" size={34} color={C.primary} />
        </View>
        <View>
          <Text style={styles.appName}>StudyNet</Text>
          <Text style={styles.headerSub}>오늘도 성장하는 하루 보내세요.</Text>
        </View>
      </View>
      <View style={styles.headerActions}>
        <TouchableOpacity
          testID="home-notifications-button"
          accessibilityLabel="알림 열기"
          style={styles.headerIconButton}
          onPress={onOpenNotifications}
          activeOpacity={0.82}
        >
          <Ionicons name="notifications-outline" size={20} color={C.textPrimary} />
          {notificationCount > 0 ? (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {notificationCount > 99 ? "99+" : notificationCount}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          testID="home-settings-button"
          accessibilityLabel="설정 열기"
          style={styles.headerIconButton}
          onPress={onOpenSettings}
          activeOpacity={0.82}
        >
          <Ionicons name="settings-outline" size={20} color={C.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
