import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import type { HomeStyles } from "../homeStyles";
import type { HomeTheme } from "../homeTheme";

export function HomeHeader({
  notificationCount,
  styles,
  C,
  onOpenSettings,
}: {
  notificationCount: number;
  styles: HomeStyles;
  C: HomeTheme;
  onOpenSettings: () => void;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <View style={styles.logoMark}>
          <Ionicons name="book-outline" size={34} color={C.primary} />
        </View>
        <View>
          <Text style={styles.appName}>StudyNet</Text>
          <Text style={styles.headerSub}>오늘도 성장하는 하루 되세요! 💪</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.notificationButton}
        onPress={onOpenSettings}
        activeOpacity={0.82}
      >
        <Ionicons name="notifications-outline" size={20} color={C.textPrimary} />
        <View style={styles.notificationBadge}>
          <Text style={styles.notificationBadgeText}>{notificationCount}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
