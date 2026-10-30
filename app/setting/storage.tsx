import { RADIUS, SPACE, TYPE_SIZE, TYPE_WEIGHT } from "../../constants/designTokens";
import { useFocusEffect } from "expo-router";
import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getScreenBottomPadding,
  getScreenTopPadding,
  RESPONSIVE_CONTENT_STYLE,
} from "../../constants/layout";
import { useMonoTheme, type MonoTheme } from "../../constants/mono";
import {
  SettingsHeader,
  SettingsHeaderIconButton,
} from "../../features/settings/SettingsHeader";
import { SettingsSection } from "../../features/settings/SettingsSection";
import {
  useStorageStatus,
  type StorageItem,
} from "../../features/settings/useStorageStatus";

export default function StorageStatusScreen() {
  const insets = useSafeAreaInsets();
  const { theme: C } = useMonoTheme();
  const s = useMemo(() => createStyles(C), [C]);
  const topPadding = getScreenTopPadding(insets.top);
  const bottomPadding = getScreenBottomPadding(insets.bottom, 40);
  const { loading, localItems, remoteItems, loadStatus } = useStorageStatus();

  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [loadStatus]),
  );

  return (
    <View style={[s.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
      <SettingsHeader
        title="저장 상태"
        right={
          <SettingsHeaderIconButton
            icon="refresh-outline"
            onPress={loadStatus}
          />
        }
      />

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator color={C.primary} />
          <Text style={s.loadingText}>저장 상태를 확인하는 중입니다.</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[s.content, { paddingBottom: bottomPadding }]}
        >
          <StatusSection title="기기 저장" items={localItems} styles={s} C={C} />
          <StatusSection title="Firebase 저장" items={remoteItems} styles={s} C={C} />
        </ScrollView>
      )}
    </View>
  );
}

function StatusSection({
  title,
  items,
  styles,
  C,
}: {
  title: string;
  items: StorageItem[];
  styles: ReturnType<typeof createStyles>;
  C: MonoTheme;
}) {
  return (
    <SettingsSection title={title}>
      {items.map((item, index) => (
        <View
          key={item.label}
          style={[styles.row, index === items.length - 1 && styles.rowLast]}
        >
          <View
            style={[
              styles.statusDot,
              item.status === "ok" ? styles.statusOk : styles.statusEmpty,
            ]}
          />
          <Text style={styles.rowLabel}>{item.label}</Text>
          <Text
            style={[
              styles.rowValue,
              { color: item.status === "ok" ? C.text : C.subtle },
            ]}
          >
            {item.value}
          </Text>
        </View>
      ))}
    </SettingsSection>
  );
}

const createStyles = (C: MonoTheme) =>
  StyleSheet.create({
    container: {
      ...RESPONSIVE_CONTENT_STYLE,
      flex: 1,
      backgroundColor: C.bg,
      paddingHorizontal: 20,
    },
    loadingBox: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: SPACE.md,
    },
    loadingText: {
      color: C.muted,
      fontSize: TYPE_SIZE.bodySmall,
      fontWeight: TYPE_WEIGHT.strong,
    },
    content: {
      gap: 14,
    },
    row: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.borderSoft,
    },
    rowLast: {
      borderBottomWidth: 0,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: RADIUS.pill,
    },
    statusOk: {
      backgroundColor: C.success,
    },
    statusEmpty: {
      backgroundColor: C.subtle,
    },
    rowLabel: {
      flex: 1,
      color: C.text,
      fontSize: TYPE_SIZE.bodySmall,
      fontWeight: TYPE_WEIGHT.strong,
    },
    rowValue: {
      fontSize: TYPE_SIZE.label,
      fontWeight: TYPE_WEIGHT.heavy,
    },
  });
