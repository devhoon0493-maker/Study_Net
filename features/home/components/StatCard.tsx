import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import type { HomeTheme } from "../homeTheme";
import type { HomeStyles } from "../homeStyles";

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
  progress,
  styles,
  C,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  hint: string;
  tone: "primary" | "success" | "warning" | "live";
  progress?: number;
  styles: HomeStyles;
  C: HomeTheme;
}) {
  const colorMap = {
    primary: [C.primary, C.primarySoft],
    success: [C.success, C.successSoft],
    warning: [C.warning, C.warningSoft],
    live: [C.live, C.liveSoft],
  } as const;
  const [color, bg] = colorMap[tone];

  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.statHint, { color }]}>{hint}</Text>
      {typeof progress === "number" ? (
        <View style={styles.statProgressTrack}>
          <View
            style={[
              styles.statProgressFill,
              { width: `${Math.min(Math.max(progress, 0), 1) * 100}%` },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}
