import { Text, View } from "react-native";

import type { GroupStyles } from "../groupStyles";

export function FocusSummaryCard({
  studyingCount,
  waitingCount,
  totalCount,
  s,
}: {
  studyingCount: number;
  waitingCount: number;
  totalCount: number;
  s: GroupStyles;
}) {
  return (
    <View style={s.focusSummaryCard}>
      <View style={s.focusSummaryItem}>
        <Text style={[s.focusSummaryValue, s.focusSummaryValueActive]}>
          {studyingCount}
        </Text>
        <Text style={s.focusSummaryLabel}>공부 중</Text>
      </View>
      <View style={s.focusSummaryDivider} />
      <View style={s.focusSummaryItem}>
        <Text style={s.focusSummaryValue}>{waitingCount}</Text>
        <Text style={s.focusSummaryLabel}>접속중</Text>
      </View>
      <View style={s.focusSummaryDivider} />
      <View style={s.focusSummaryItem}>
        <Text style={s.focusSummaryValue}>{totalCount}</Text>
        <Text style={s.focusSummaryLabel}>총 참여자</Text>
      </View>
    </View>
  );
}
