import { View } from "react-native";

import type { HomeStyles } from "../homeStyles";
import type { HomeTheme } from "../homeTheme";
import { formatStatDuration } from "../homeUtils";
import { StatCard } from "./StatCard";

export function HomeStatGrid({
  totalSeconds,
  goalDays,
  sessionCount,
  percent,
  goalLabel,
  styles,
  C,
}: {
  totalSeconds: number;
  goalDays: number;
  sessionCount: number;
  percent: number;
  goalLabel: string;
  styles: HomeStyles;
  C: HomeTheme;
}) {
  return (
    <View style={styles.statGrid}>
      <StatCard
        icon="time-outline"
        label="총 공부 시간"
        value={formatStatDuration(totalSeconds)}
        hint="누적"
        tone="primary"
        styles={styles}
        C={C}
      />
      <StatCard
        icon="checkmark-circle-outline"
        label="완료한 목표"
        value={`${goalDays}개`}
        hint="목표 달성"
        tone="success"
        styles={styles}
        C={C}
      />
      <StatCard
        icon="trophy-outline"
        label="집중 세션"
        value={`${sessionCount}회`}
        hint="세션"
        tone="warning"
        styles={styles}
        C={C}
      />
      <StatCard
        icon="analytics-outline"
        label="목표 달성률"
        value={`${Math.round(percent * 100)}%`}
        hint={`목표 ${goalLabel}`}
        tone="success"
        progress={percent}
        styles={styles}
        C={C}
      />
    </View>
  );
}
