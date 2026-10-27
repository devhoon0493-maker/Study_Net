import { Ionicons } from "@expo/vector-icons";
import type { RefObject } from "react";
import { Animated, ScrollView, Text, TextInput, View } from "react-native";

import type { GroupStyles } from "../groupStyles";
import type { GroupTheme } from "../groupTheme";
import type { Member, Room } from "../groupTypes";
import { EmptyState } from "./EmptyState";
import { GroupHeroCard } from "./GroupHeroCard";
import { GroupLobbyHeader } from "./GroupLobbyHeader";
import { PublicGroupCard } from "./PublicGroupCard";
import { QuickJoinCard } from "./QuickJoinCard";

type GroupLobbyContentProps = {
  loadError: string;
  bottomSpace: number;
  roomsCount: number;
  publicRoomsCount: number;
  lobbyRooms: Room[];
  lobbyStudyingMembers: Member[];
  lobbyStudyingCount: number;
  codeInput: string;
  codeError: string;
  codeNotice: string;
  joining: boolean;
  codeInputRef: RefObject<TextInput | null>;
  livePulse: Animated.Value;
  onChangeCode: (value: string) => void;
  onJoinCode: () => void;
  onJoinRoom: (room: Room) => void;
  currentMemberId?: string;
  s: GroupStyles;
  C: GroupTheme;
};

export function GroupLobbyContent({
  loadError,
  bottomSpace,
  roomsCount,
  publicRoomsCount,
  lobbyRooms,
  lobbyStudyingMembers,
  lobbyStudyingCount,
  codeInput,
  codeError,
  codeNotice,
  joining,
  codeInputRef,
  livePulse,
  onChangeCode,
  onJoinCode,
  onJoinRoom,
  currentMemberId,
  s,
  C,
}: GroupLobbyContentProps) {
  return (
    <ScrollView
      contentContainerStyle={[
        s.lobbyContent,
        { paddingBottom: bottomSpace + 96 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {loadError !== "" && (
        <View style={s.errorBanner}>
          <Ionicons
            name="alert-circle-outline"
            size={14}
            color={C.danger}
            style={{ marginRight: 6 }}
          />
          <Text style={s.errorText}>{loadError}</Text>
        </View>
      )}

      <GroupLobbyHeader s={s} />
      <GroupHeroCard
        studyingCount={lobbyStudyingCount}
        openCount={roomsCount}
        publicCount={publicRoomsCount}
        studyingMembers={lobbyStudyingMembers}
        livePulse={livePulse}
        s={s}
      />
      <QuickJoinCard
        codeInput={codeInput}
        codeError={codeError}
        codeNotice={codeNotice}
        joining={joining}
        codeInputRef={codeInputRef}
        onChangeCode={onChangeCode}
        onJoin={onJoinCode}
        s={s}
        C={C}
      />

      <View style={s.groupListHeader}>
        <View>
          <Text style={s.groupListTitle}>공개 그룹</Text>
          <Text style={s.groupListSub}>누구나 바로 입장할 수 있어요.</Text>
        </View>
        <Text style={s.groupListCount}>{lobbyRooms.length}</Text>
      </View>

      {lobbyRooms.length === 0 ? (
        <EmptyState
          icon="folder-open-outline"
          title="공개 그룹이 없어요."
          description="새 그룹을 만들거나 코드로 비공개 그룹에 입장해보세요."
          s={s}
          C={C}
        />
      ) : (
        <View style={s.groupCardList}>
          {lobbyRooms.map((room) => (
            <PublicGroupCard
              key={room.id}
              room={room}
              currentMemberId={currentMemberId}
              joining={joining}
              livePulse={livePulse}
              onPress={() => onJoinRoom(room)}
              s={s}
              C={C}
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}
