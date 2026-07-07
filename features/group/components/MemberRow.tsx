import { Image, Text, View } from "react-native";

import type { GroupStyles } from "../groupStyles";
import type { Member } from "../groupTypes";
import { formatTimer, getInitial, isMemberStudying, withAlpha } from "../groupUtils";

export function MemberRow({
  member,
  isMe,
  now,
  s,
}: {
  member: Member;
  isMe: boolean;
  now: number;
  s: GroupStyles;
}) {
  const studying = isMemberStudying(member);

  return (
    <View
      style={[s.memberRow, !studying && s.memberRowIdle, isMe && s.memberRowMe]}
    >
      <View
        style={[
          s.memberAvatar,
          {
            backgroundColor: withAlpha(member.color, "16"),
            borderColor: withAlpha(member.color, "44"),
          },
        ]}
      >
        {member.image ? (
          <Image source={{ uri: member.image }} style={s.memberAvatarImage} />
        ) : (
          <Text style={[s.memberAvatarText, { color: member.color }]}>
            {getInitial(member.name)}
          </Text>
        )}
      </View>
      <View style={s.memberInfo}>
        <View style={s.memberNameRow}>
          <Text style={s.memberName} numberOfLines={1}>
            {member.name}
          </Text>
          {member.userType ? (
            <Text style={s.memberType} numberOfLines={1}>
              {member.userType}
            </Text>
          ) : null}
          {isMe && (
            <View style={s.meTag}>
              <Text style={s.meTagText}>나</Text>
            </View>
          )}
        </View>
        <View style={s.memberSubjectRow}>
          <View style={[s.studyDot, studying && s.studyDotActive]} />
          <Text style={s.memberSubject} numberOfLines={1}>
            {studying
              ? (member.status ?? "공부중")
              : "아직 공부를 시작하지 않았어요"}
          </Text>
        </View>
      </View>
      <View style={s.memberMeta}>
        <Text style={[s.memberStatus, studying && s.memberStatusActive]}>
          {studying ? "공부 중" : "대기"}
        </Text>
        <Text style={s.memberTime}>
          {studying
            ? formatTimer(member.studyStartEpoch ?? undefined, now)
            : "아직 시작 전"}
        </Text>
      </View>
    </View>
  );
}
