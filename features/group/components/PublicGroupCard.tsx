import { Ionicons } from "@expo/vector-icons";
import { Animated, Text, TouchableOpacity, View } from "react-native";

import type { GroupStyles } from "../groupStyles";
import type { GroupTheme } from "../groupTheme";
import type { Room } from "../groupTypes";
import { isMemberStudying, withAlpha } from "../groupUtils";
import { MemberPreview } from "./MemberPreview";

export function PublicGroupCard({
  room,
  joining,
  livePulse,
  onPress,
  s,
  C,
}: {
  room: Room;
  joining: boolean;
  livePulse: Animated.Value;
  onPress: () => void;
  s: GroupStyles;
  C: GroupTheme;
}) {
  const studyingCount = room.members.filter(isMemberStudying).length;
  const full = room.members.length >= room.max;

  return (
    <TouchableOpacity
      style={[s.publicGroupCard, full && s.publicGroupCardDisabled]}
      onPress={onPress}
      disabled={joining || full}
      activeOpacity={0.86}
    >
      <View style={s.publicCardHeader}>
        <View
          style={[
            s.publicCardIcon,
            { backgroundColor: withAlpha(room.color, "16") },
          ]}
        >
          <Text style={s.publicCardEmoji}>{room.emoji}</Text>
        </View>
        <View style={s.publicCardInfo}>
          <View style={s.publicCardTitleRow}>
            <Text style={s.publicCardName} numberOfLines={1}>
              {room.name}
            </Text>
            <View style={s.liveMiniBadge}>
              <Animated.View style={[s.liveDot, { opacity: livePulse }]} />
              <Text style={s.liveMiniText}>진행중</Text>
            </View>
          </View>
          <Text style={s.publicCardDesc} numberOfLines={1}>
            {room.subjects}
          </Text>
        </View>
      </View>

      <View style={s.publicCardMetaRow}>
        <View style={s.publicMetaChip}>
          <Ionicons name="flash-outline" size={12} color={C.success} />
          <Text style={s.publicMetaText}>{studyingCount}명 공부</Text>
        </View>
        <View style={s.publicMetaChip}>
          <Ionicons name="people-outline" size={12} color={C.primary} />
          <Text style={s.publicMetaText}>
            {room.members.length}/{room.max}
          </Text>
        </View>
      </View>

      <View style={s.publicCardFooter}>
        <MemberPreview members={room.members} s={s} />
        <View style={[s.publicJoinPill, full && s.publicJoinPillFull]}>
          <Text style={[s.publicJoinText, full && s.publicJoinTextFull]}>
            {full ? "마감" : "입장"}
          </Text>
          {!full && (
            <Ionicons name="chevron-forward" size={14} color={C.primary} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
