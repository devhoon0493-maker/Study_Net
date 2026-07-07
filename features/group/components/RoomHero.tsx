import { Animated, Text, View } from "react-native";

import type { GroupStyles } from "../groupStyles";
import type { Room } from "../groupTypes";

export function RoomHero({
  room,
  memberCountText,
  livePulse,
  s,
}: {
  room: Room;
  memberCountText: string;
  livePulse: Animated.Value;
  s: GroupStyles;
}) {
  return (
    <View style={s.roomHero}>
      <View style={s.roomHeroTop}>
        <View style={s.roomHeroBadge}>
          <Animated.View style={[s.liveDot, { opacity: livePulse }]} />
          <Text style={s.roomHeroBadgeText}>실시간</Text>
        </View>
        <Text style={s.roomHeroMeta}>{memberCountText} 참여</Text>
      </View>
      <Text style={s.roomHeroTitle}>{room.name}</Text>
      <Text style={s.roomHeroDesc} numberOfLines={2}>
        {room.subjects}
      </Text>
      <View style={s.roomHeroFooter}>
        <Text style={s.roomHeroPill}>
          {room.visibility === "public" ? "공개 그룹" : "비공개 그룹"}
        </Text>
        <Text style={s.roomHeroPill}>실시간 현황</Text>
      </View>
    </View>
  );
}
