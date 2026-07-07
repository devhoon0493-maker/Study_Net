import { Ionicons } from "@expo/vector-icons";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

import type { MonoTheme } from "../../../constants/mono";
import type { CommunityStyles } from "../communityStyles";
import type { LiveStudyRoom } from "../communityTypes";

export function LiveStudyPanel({
  liveRooms,
  s,
  C,
  onOpenGroup,
}: {
  liveRooms: LiveStudyRoom[];
  s: CommunityStyles;
  C: MonoTheme;
  onOpenGroup: () => void;
}) {
  const studyingCount = liveRooms.reduce((sum, room) => sum + room.memberCount, 0);

  return (
    <View style={s.livePanel}>
      <View style={s.livePanelHeader}>
        <View>
          <Text style={s.liveEyebrow}>실시간 스터디</Text>
          <Text style={s.liveTitle}>
            {liveRooms.length > 0 ? `지금 ${studyingCount}명이 공부 중` : "실시간 스터디"}
          </Text>
        </View>

        <TouchableOpacity style={s.liveHeaderButton} onPress={onOpenGroup} activeOpacity={0.8}>
          <Text style={s.liveHeaderButtonText}>그룹</Text>
          <Ionicons name="chevron-forward" size={14} color={C.text} />
        </TouchableOpacity>
      </View>

      {liveRooms.length === 0 ? (
        <View style={s.liveEmptyBox}>
          <Ionicons name="people-outline" size={18} color={C.text} />
          <Text style={s.liveEmptyTitle}>아직 표시할 라이브 스터디가 없어요.</Text>
          <Text style={s.liveEmptyText}>그룹 방이 열리면 현재 공부중인 방이 여기에 표시됩니다.</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.liveRoomRow}>
          {liveRooms.map((room) => (
            <TouchableOpacity key={room.id} style={s.liveRoomCard} onPress={onOpenGroup} activeOpacity={0.82}>
              <View style={s.liveRoomTop}>
                <View style={s.liveDot} />
                <Text style={s.liveRoomSubject}>{room.subjects}</Text>
              </View>
              <Text style={s.liveRoomName} numberOfLines={1}>{room.name}</Text>
              <View style={s.liveRoomMeta}>
                <Text style={s.liveRoomMetaText}>{room.memberCount}명 공부 중</Text>
                <Text style={s.liveRoomCode}>{room.code}</Text>
              </View>
              <View style={s.joinRoomButton}>
                <Ionicons name="enter-outline" size={13} color={C.text} />
                <Text style={s.joinRoomButtonText}>그룹으로 이동</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
