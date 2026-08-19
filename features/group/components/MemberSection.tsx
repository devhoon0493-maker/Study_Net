import type React from "react";
import { Text, View } from "react-native";

import type { GroupStyles } from "../groupStyles";
import type { GroupTheme } from "../groupTheme";
import type { Member } from "../groupTypes";
import { EmptyState } from "./EmptyState";
import { MemberRow } from "./MemberRow";

type MemberSectionProps = {
  title: string;
  count: number;
  members: Member[];
  emptyIcon: React.ComponentProps<typeof EmptyState>["icon"];
  emptyTitle: string;
  emptyDescription: string;
  currentMemberId?: string;
  now: number;
  s: GroupStyles;
  C: GroupTheme;
};

export function MemberSection({
  title,
  count,
  members,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  currentMemberId,
  now,
  s,
  C,
}: MemberSectionProps) {
  return (
    <View style={s.memberSection}>
      <View style={s.memberSectionHeader}>
        <Text style={s.memberSectionTitle}>{title}</Text>
        <Text style={s.memberSectionCount}>{count}</Text>
      </View>
      {members.length === 0 ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle}
          description={emptyDescription}
          s={s}
          C={C}
        />
      ) : (
        <View style={s.memberList}>
          {members.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              isMe={member.id === currentMemberId}
              now={now}
              s={s}
            />
          ))}
        </View>
      )}
    </View>
  );
}
