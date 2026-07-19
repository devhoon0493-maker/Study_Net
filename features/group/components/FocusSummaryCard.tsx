import { Text, View } from "react-native";

import type { GroupStyles } from "../groupStyles";

export function FocusSummaryCard({
  studyingCount,
  waitingCount,
  offlineCount,
  s,
}: {
  studyingCount: number;
  waitingCount: number;
  offlineCount: number;
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
        <Text style={s.focusSummaryValue}>{offlineCount}</Text>
        <Text style={s.focusSummaryLabel}>오프라인</Text>
      </View>
    </View>
  );
}
