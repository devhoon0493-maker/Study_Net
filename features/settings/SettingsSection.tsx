import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useMonoTheme } from "../../constants/mono";

type SettingsSectionProps = {
  title?: string;
  children: ReactNode;
  variant?: "surface" | "primary";
};

export function SettingsSection({
  title,
  children,
  variant = "surface",
}: SettingsSectionProps) {
  const { theme: C } = useMonoTheme();

  return (
    <View
      style={[
        styles.section,
        {
          borderColor: C.borderSoft,
          backgroundColor: variant === "primary" ? C.primarySoft : C.surface,
        },
      ]}
    >
      {title ? (
        <Text style={[styles.sectionTitle, { color: C.text }]}>{title}</Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "900",
    marginBottom: 8,
  },
});
