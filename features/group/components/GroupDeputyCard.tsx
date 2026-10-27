import { Ionicons } from "@expo/vector-icons";
import { ref, update } from "firebase/database";
import { Alert, Text, TouchableOpacity, View } from "react-native";

import { db } from "../../../utils/firebaseConfig";
import type { GroupStyles } from "../groupStyles";
import type { GroupTheme } from "../groupTheme";
import type { Room } from "../groupTypes";

type Props = {
  room: Room;
  currentMemberId?: string;
  s: GroupStyles;
  C: GroupTheme;
};

export function GroupDeputyCard({ room, currentMemberId, s, C }: Props) {
  const isOwner = currentMemberId === room.ownerId;
  const deputyIds = [room.deputy1Id, room.deputy2Id].filter(
    (id): id is string => Boolean(id),
  );

  const setDeputy = async (memberId: string, makeDeputy: boolean) => {
    const key = room.deputy1Id === memberId ? "deputy1Id" :
      room.deputy2Id === memberId ? "deputy2Id" :
      !room.deputy1Id ? "deputy1Id" : "deputy2Id";
    try {
      await update(ref(db), {
        [`rooms/${room.id}/${key}`]: makeDeputy ? memberId : null,
      });
    } catch {
      Alert.alert("부그룹장 변경 실패", "권한 규칙을 확인한 뒤 다시 시도해 주세요.");
    }
  };

  const confirmChange = (memberId: string, memberName: string, makeDeputy: boolean) => {
    Alert.alert(
      makeDeputy ? "부그룹장 지정" : "부그룹장 해제",
      makeDeputy
        ? `${memberName}님을 부그룹장으로 지정할까요? 공지 관리 권한이 생겨요.`
        : `${memberName}님의 부그룹장 권한을 해제할까요?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: makeDeputy ? "지정" : "해제",
          style: makeDeputy ? "default" : "destructive",
          onPress: () => void setDeputy(memberId, makeDeputy),
        },
      ],
    );
  };

  return (
    <View style={s.deputyCard}>
      <View style={s.announcementHeader}>
        <View style={s.announcementTitleRow}>
          <Ionicons name="people-outline" size={17} color={C.primary} />
          <Text style={s.announcementTitle}>부그룹장</Text>
        </View>
        <Text style={s.announcementMeta}>{deputyIds.length}/2명</Text>
      </View>
      {deputyIds.length ? (
        deputyIds.map((id) => {
          const person = room.members.find((candidate) => candidate.id === id);
          return (
            <View key={id} style={s.deputyRow}>
              <Text style={s.deputyName}>{person?.name ?? "그룹원"}</Text>
              <Text style={s.deputyRole}>부그룹장</Text>
              {isOwner ? (
                <TouchableOpacity
                  onPress={() => confirmChange(id, person?.name ?? "그룹원", false)}
                  accessibilityRole="button"
                >
                  <Text style={s.announcementAction}>해제</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          );
        })
      ) : (
        <Text style={s.announcementMeta}>아직 지정된 부그룹장이 없어요.</Text>
      )}
      {isOwner && deputyIds.length < 2 ? (
        <View style={s.deputyCandidates}>
          {room.members
            .filter((person) => person.id !== room.ownerId && !deputyIds.includes(person.id))
            .map((person) => (
              <TouchableOpacity
                key={person.id}
                style={s.deputyCandidateButton}
                onPress={() => confirmChange(person.id, person.name, true)}
                accessibilityRole="button"
              >
                <Ionicons name="person-add-outline" size={15} color={C.primary} />
                <Text style={s.deputyCandidateText}>{person.name} 지정</Text>
              </TouchableOpacity>
            ))}
        </View>
      ) : null}
      <Text style={s.deputyHint}>부그룹장은 공지를 관리할 수 있고, 그룹 해체와 그룹장 양도는 할 수 없어요.</Text>
    </View>
  );
}
