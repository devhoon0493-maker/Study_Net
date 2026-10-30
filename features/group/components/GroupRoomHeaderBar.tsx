import { Ionicons } from "@expo/vector-icons";
import { Animated, Text, TouchableOpacity, View } from "react-native";

import type { GroupStyles } from "../groupStyles";
import type { GroupTheme } from "../groupTheme";

type GroupRoomHeaderBarProps = {
  roomName: string;
  roomCode: string;
  memberCountText: string;
  livePulse: Animated.Value;
  onBack: () => void;
  s: GroupStyles;
  C: GroupTheme;
};

export function GroupRoomHeaderBar({
  roomName,
  roomCode,
  memberCountText,
  livePulse,
  onBack,
  s,
  C,
}: GroupRoomHeaderBarProps) {
  return (
    <View style={s.header}>
      <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="그룹 나가기 옵션">
        <Ionicons name="chevron-down" size={18} color={C.textSecondary} />
      </TouchableOpacity>
      <View style={s.headerCenter}>
        <Text style={s.headerTitle}>{roomName}</Text>
        <Text style={s.headerSub}>
          참여 {memberCountText} · 코드 {roomCode}
        </Text>
      </View>
      <View style={s.headerRight}>
        <View style={s.liveBadge}>
          <Animated.View style={[s.liveDot, { opacity: livePulse }]} />
          <Text style={s.liveText}>실시간</Text>
        </View>
        <View style={s.roomCountBadge}>
          <Text style={s.roomCountText}>{memberCountText}</Text>
        </View>
      </View>
    </View>
  );
}
