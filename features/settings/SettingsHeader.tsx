import { RADIUS, TYPE_SIZE, TYPE_WEIGHT } from "../../constants/designTokens";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useMonoTheme } from "../../constants/mono";

type SettingsHeaderProps = {
  title: string;
  right?: ReactNode;
  compactTitle?: boolean;
};

export function SettingsHeader({
  title,
  right,
  compactTitle,
}: SettingsHeaderProps) {
  const router = useRouter();
  const { theme: C } = useMonoTheme();

  return (
    <View style={styles.header}>
      <TouchableOpacity
        testID="settings-header-back-button"
        style={[
          styles.iconButton,
          { borderColor: C.border, backgroundColor: C.surface },
        ]}
        onPress={() => router.back()}
        activeOpacity={0.78}
      >
        <Ionicons name="chevron-back" size={20} color={C.text} />
      </TouchableOpacity>
      <Text
        style={[
          styles.title,
          {
            color: C.text,
            fontSize: compactTitle ? TYPE_SIZE.titleCompact : TYPE_SIZE.heading,
          },
        ]}
        numberOfLines={1}
      >
        {title}
      </Text>
      {right ?? <View style={styles.headerSpacer} />}
    </View>
  );
}

export function SettingsHeaderIconButton({
  icon,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  const { theme: C } = useMonoTheme();

  return (
    <TouchableOpacity
      testID={`settings-header-icon-${icon}`}
      style={[
        styles.iconButton,
        { borderColor: C.border, backgroundColor: C.surface },
      ]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      <Ionicons name={icon} size={18} color={C.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
  },
  headerSpacer: {
    width: 38,
  },
  title: {
    flex: 1,
    fontWeight: TYPE_WEIGHT.heavy,
    textAlign: "center",
  },
});
