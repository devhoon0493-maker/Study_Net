import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getScreenBottomPadding,
  getScreenTopPadding,
} from "../../constants/layout";
import { useMonoTheme, type MonoTheme } from "../../constants/mono";
import { SettingsHeader } from "../../features/settings/SettingsHeader";
import { SettingsSection } from "../../features/settings/SettingsSection";
import { useResetStudyData } from "../../features/settings/useResetStudyData";

type ResetOptionProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  value: boolean;
  onChange: (value: boolean) => void;
  styles: ReturnType<typeof createStyles>;
  C: MonoTheme;
};

export default function ResetStudyDataScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: C } = useMonoTheme();
  const s = useMemo(() => createStyles(C), [C]);
  const topPadding = getScreenTopPadding(insets.top);
  const bottomPadding = getScreenBottomPadding(insets.bottom, 40);
  const [resetRecords, setResetRecords] = useState(true);
  const [resetGoals, setResetGoals] = useState(false);
  const [resetGroupStatus, setResetGroupStatus] = useState(false);
  const { busy, runReset } = useResetStudyData({
    onResetComplete: () => router.back(),
  });

  const selectedCount = [resetRecords, resetGoals, resetGroupStatus].filter(Boolean).length;

  return (
    <View style={[s.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
      <SettingsHeader title="학습 데이터 초기화" compactTitle />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: bottomPadding }]}
      >
        <View style={s.notice}>
          <Ionicons name="warning-outline" size={20} color={C.danger} />
          <Text style={s.noticeText}>
            필요한 항목만 선택해서 초기화할 수 있습니다.
          </Text>
        </View>

        <SettingsSection>
          <ResetOption
            icon="bar-chart-outline"
            title="공부 기록"
            desc="저장된 공부 세션과 진행 중인 타이머를 삭제합니다."
            value={resetRecords}
            onChange={setResetRecords}
            styles={s}
            C={C}
          />
          <ResetOption
            icon="flag-outline"
            title="목표와 D-Day"
            desc="일일/주간/연속 학습 목표와 대표 D-Day를 삭제합니다."
            value={resetGoals}
            onChange={setResetGoals}
            styles={s}
            C={C}
          />
          <ResetOption
            icon="people-outline"
            title="그룹 공부 상태"
            desc="참여 중인 그룹에서 내 현재 공부 상태를 접속중으로 되돌립니다."
            value={resetGroupStatus}
            onChange={setResetGroupStatus}
            styles={s}
            C={C}
          />
        </SettingsSection>

        <TouchableOpacity
          style={[
            s.resetButton,
            (selectedCount === 0 || busy) && s.resetButtonDisabled,
          ]}
          onPress={() =>
            runReset({ resetRecords, resetGoals, resetGroupStatus })
          }
          disabled={selectedCount === 0 || busy}
          activeOpacity={0.84}
        >
          <Text style={s.resetButtonText}>
            {busy ? "초기화 중..." : `${selectedCount}개 항목 초기화`}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function ResetOption({
  icon,
  title,
  desc,
  value,
  onChange,
  styles,
  C,
}: ResetOptionProps) {
  return (
    <View style={styles.optionRow}>
      <View style={styles.optionIcon}>
        <Ionicons name={icon} size={18} color={C.text} />
      </View>
      <View style={styles.optionBody}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: C.surfaceAlt, true: C.dangerSoft }}
        thumbColor={value ? C.danger : C.subtle}
        ios_backgroundColor={C.surfaceAlt}
      />
    </View>
  );
}

const createStyles = (C: MonoTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
      paddingHorizontal: 20,
    },
    content: {
      gap: 14,
    },
    notice: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 16,
      backgroundColor: C.dangerSoft,
      padding: 14,
    },
    noticeText: {
      flex: 1,
      color: C.text,
      fontSize: 12,
      fontWeight: "800",
      lineHeight: 18,
    },
    optionRow: {
      minHeight: 74,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: C.borderSoft,
    },
    optionIcon: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: C.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    optionBody: {
      flex: 1,
      minWidth: 0,
    },
    optionTitle: {
      color: C.text,
      fontSize: 14,
      fontWeight: "900",
    },
    optionDesc: {
      color: C.muted,
      fontSize: 11,
      fontWeight: "700",
      lineHeight: 16,
      marginTop: 3,
    },
    resetButton: {
      minHeight: 54,
      borderRadius: 15,
      backgroundColor: C.danger,
      alignItems: "center",
      justifyContent: "center",
    },
    resetButtonDisabled: {
      opacity: 0.45,
    },
    resetButtonText: {
      color: C.inverse,
      fontSize: 15,
      fontWeight: "900",
    },
  });
