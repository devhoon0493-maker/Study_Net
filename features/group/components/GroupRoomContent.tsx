import { Ionicons } from "@expo/vector-icons";
import { Animated, ScrollView, Text, TouchableOpacity, View } from "react-native";

import type { GroupStyles } from "../groupStyles";
import type { GroupTheme } from "../groupTheme";
import type { Member, Room } from "../groupTypes";
import { formatTimer } from "../groupUtils";
import { FocusSummaryCard } from "./FocusSummaryCard";
import { InviteCodeCard } from "./InviteCodeCard";
import { MemberSection } from "./MemberSection";
import { RoomHero } from "./RoomHero";

type GroupRoomContentProps = {
  room: Room;
  currentMemberId?: string;
  myMember?: Member;
  memberCountText: string;
  livePulse: Animated.Value;
  bottomSpace: number;
  studyingMembers: Member[];
  waitingMembers: number;
  waitingMemberList: Member[];
  offlineMembers: number;
  offlineMemberList: Member[];
  now: number;
  onLeave: () => void;
  s: GroupStyles;
  C: GroupTheme;
};

export function GroupRoomContent({
  room,
  currentMemberId,
  myMember,
  memberCountText,
  livePulse,
  bottomSpace,
  studyingMembers,
  waitingMembers,
  waitingMemberList,
  offlineMembers,
  offlineMemberList,
  now,
  onLeave,
  s,
  C,
}: GroupRoomContentProps) {
  return (
    <ScrollView
      style={s.roomScroll}
      contentContainerStyle={[
        s.roomContent,
        { paddingBottom: bottomSpace + 18 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <RoomHero
        room={room}
        memberCountText={memberCountText}
        livePulse={livePulse}
        s={s}
      />
      <InviteCodeCard code={room.code} s={s} C={C} />
      <FocusSummaryCard
        studyingCount={studyingMembers.length}
        waitingCount={waitingMembers}
        offlineCount={offlineMembers}
        s={s}
      />

      <MemberSection
        title="공부 중"
        count={studyingMembers.length}
        members={studyingMembers}
        emptyIcon="book-outline"
        emptyTitle="아직 공부 중인 멤버가 없어요."
        emptyDescription="공부를 시작하면 이곳에 실시간으로 표시돼요."
        currentMemberId={currentMemberId}
        now={now}
        s={s}
        C={C}
      />

      <MemberSection
        title="접속중"
        count={waitingMembers}
        members={waitingMemberList}
        emptyIcon="checkmark-circle-outline"
        emptyTitle="모두 공부 중이에요."
        emptyDescription="현재 접속중인 멤버가 없습니다."
        currentMemberId={currentMemberId}
        now={now}
        s={s}
        C={C}
      />

      <MemberSection
        title="오프라인"
        count={offlineMembers}
        members={offlineMemberList}
        emptyIcon="moon-outline"
        emptyTitle="오프라인 멤버가 없어요."
        emptyDescription="앱을 닫은 멤버가 생기면 이곳에 표시돼요."
        currentMemberId={currentMemberId}
        now={now}
        s={s}
        C={C}
      />

      <View style={s.myStatusCard}>
        <View style={s.myStatusIcon}>
          <Ionicons
            name={myMember?.studyStartEpoch ? "book-outline" : "time-outline"}
            size={18}
            color={C.textPrimary}
          />
        </View>
        <View style={s.myStatusTextWrap}>
          <Text style={s.myStatusLabel}>내 상태</Text>
          <Text style={s.myStatusText} numberOfLines={1}>
            {myMember?.studyStartEpoch
              ? `${myMember.status ?? "공부중"} · ${formatTimer(myMember.studyStartEpoch, now)}`
              : "공부를 시작하면 그룹에 실시간으로 표시돼요."}
          </Text>
        </View>
      </View>

      <View style={s.controls}>
        <TouchableOpacity
          style={s.ctrlBtnDanger}
          onPress={onLeave}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color={C.textPrimary} />
          <Text style={s.leaveBtnText}>그룹 나가기</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
