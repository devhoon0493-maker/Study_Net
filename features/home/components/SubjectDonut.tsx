import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import type { HomeTheme } from "../homeTheme";
import type { SubjectShare } from "../homeTypes";
import { stylesStatic } from "../homeStyles";

export function SubjectDonut({
  items,
  total,
  C,
}: {
  items: SubjectShare[];
  total: number;
  C: HomeTheme;
}) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <View style={stylesStatic.donutBox}>
      <Svg width={92} height={92} viewBox="0 0 92 92">
        <Circle cx="46" cy="46" r={radius} stroke={C.surfaceAlt} strokeWidth={11} fill="none" />
        {items.map((item) => {
          const share = item.seconds / Math.max(total, 1);
          const dashOffset = -offset * circumference;
          offset += share;

          return (
            <Circle
              key={item.subject}
              cx="46"
              cy="46"
              r={radius}
              stroke={item.color}
              strokeWidth={11}
              fill="none"
              strokeDasharray={`${share * circumference} ${circumference}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              rotation="-90"
              origin="46, 46"
            />
          );
        })}
      </Svg>
      <View style={stylesStatic.donutCenter}>
        <Text style={[stylesStatic.donutValue, { color: C.textPrimary }]}>
          {Math.round(total / 3600)}
        </Text>
        <Text style={[stylesStatic.donutLabel, { color: C.textSecondary }]}>시간</Text>
      </View>
    </View>
  );
}
