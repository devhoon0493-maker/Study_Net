import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { Switch, Text, TouchableOpacity, View } from "react-native";

import type { MonoTheme } from "../../constants/mono";
import type { SettingIcon } from "./settingsMenu";
import type { SettingsStyles } from "./settingsStyles";

export function SettingGroup({
  title,
  icon,
  children,
  styles,
  C,
}: {
  title: string;
  icon: SettingIcon;
  children: ReactNode;
  styles: SettingsStyles;
  C: MonoTheme;
}) {
  return (
    <View style={styles.group}>
      <View style={styles.groupHeader}>
        <View style={styles.groupIcon}>
          <Ionicons name={icon} size={16} color={C.primary} />
        </View>
        <Text style={styles.groupTitle}>{title}</Text>
      </View>
      <View style={styles.groupBody}>{children}</View>
    </View>
  );
}

export function SettingRow({
  icon,
  label,
  description,
  onPress,
  styles,
  theme,
  isLast,
}: {
  icon: SettingIcon;
  label: string;
  description?: string;
  onPress: () => void;
  styles: SettingsStyles;
  theme: MonoTheme;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, isLast && styles.rowLast]}
      onPress={onPress}
      activeOpacity={0.78}
    >
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={theme.text} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowText}>{label}</Text>
        {description ? <Text style={styles.rowDesc}>{description}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.subtle} />
    </TouchableOpacity>
  );
}

export function InfoRow({
  icon,
  label,
  value,
  styles,
  theme,
  isLast,
}: {
  icon: SettingIcon;
  label: string;
  value: string;
  styles: SettingsStyles;
  theme: MonoTheme;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={theme.text} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowText}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function SwitchRow({
  icon,
  label,
  description,
  value,
  onChange,
  styles,
  theme,
  isLast,
}: {
  icon: SettingIcon;
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  styles: SettingsStyles;
  theme: MonoTheme;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={theme.text} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowText}>{label}</Text>
        {description ? <Text style={styles.rowDesc}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: theme.surfaceAlt, true: theme.primarySoft }}
        thumbColor={value ? theme.primary : theme.subtle}
        ios_backgroundColor={theme.surfaceAlt}
      />
    </View>
  );
}
