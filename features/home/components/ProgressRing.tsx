import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import type { HomeTheme } from "../homeTheme";
import { stylesStatic } from "../homeStyles";
import { formatClock, formatCompactDuration } from "../homeUtils";

export function ProgressRing({
  percent,
  todaySeconds,
  dailyGoal,
  C,
}: {
  percent: number;
  todaySeconds: number;
  dailyGoal: number;
  C: HomeTheme;
}) {
  const radius = 51;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(percent, 0), 1);

  return (
    <View style={stylesStatic.ringBox}>
      <Svg width={136} height={136} viewBox="0 0 136 136">
        <Circle cx="68" cy="68" r={radius} stroke={C.borderSoft} strokeWidth={8} fill="none" />
        <Circle
          cx="68"
          cy="68"
          r={radius}
          stroke={progress >= 1 ? C.success : C.primary}
          strokeWidth={8}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          rotation="-90"
          origin="68, 68"
        />
      </Svg>
      <View style={stylesStatic.ringCenter}>
        <Text style={[stylesStatic.ringLabel, { color: C.textSecondary }]}>오늘 공부 시간</Text>
        <Text style={[stylesStatic.ringValue, { color: C.textPrimary }]}>
          {formatClock(todaySeconds).slice(0, 5)}
        </Text>
        <Text style={[stylesStatic.ringGoal, { color: C.textSecondary }]}>
          / {formatCompactDuration(dailyGoal)}
        </Text>
      </View>
    </View>
  );
}
