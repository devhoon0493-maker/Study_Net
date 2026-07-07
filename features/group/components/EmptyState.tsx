import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import type { GroupStyles } from "../groupStyles";
import type { GroupTheme } from "../groupTheme";

export function EmptyState({
  title,
  description,
  icon,
  s,
  C,
}: {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  s: GroupStyles;
  C: GroupTheme;
}) {
  return (
    <View style={s.emptyState}>
      <View style={s.emptyStateIcon}>
        <Ionicons name={icon} size={24} color={C.textPrimary} />
      </View>
      <Text style={s.emptyStateTitle}>{title}</Text>
      <Text style={s.emptyStateText}>{description}</Text>
    </View>
  );
}
