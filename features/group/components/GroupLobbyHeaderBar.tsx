import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import type { GroupStyles } from "../groupStyles";
import type { GroupTheme } from "../groupTheme";

type GroupLobbyHeaderBarProps = {
  roomsCount: number;
  onBack: () => void;
  s: GroupStyles;
  C: GroupTheme;
};

export function GroupLobbyHeaderBar({
  roomsCount,
  onBack,
  s,
  C,
}: GroupLobbyHeaderBarProps) {
  return (
    <View style={s.header}>
      <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="홈으로 돌아가기">
        <Ionicons name="chevron-back" size={20} color={C.textSecondary} />
      </TouchableOpacity>
      <View style={s.roomCountBadge}>
        <Text style={s.roomCountText}>{roomsCount}개 그룹</Text>
      </View>
    </View>
  );
}
