import { RADIUS, SPACE, TYPE_SIZE, TYPE_WEIGHT } from "../../constants/designTokens";
import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getScreenBottomPadding,
  getScreenTopPadding,
} from "../../constants/layout";
import { useMonoTheme, type MonoTheme } from "../../constants/mono";
import {
  SettingsHeader,
} from "../../features/settings/SettingsHeader";
import { SettingsSection } from "../../features/settings/SettingsSection";
import {
  DAILY_GOAL_OPTIONS,
  STREAK_GOAL_OPTIONS,
  WEEKLY_GOAL_OPTIONS,
  useGoalSettingsForm,
} from "../../features/settings/useGoalSettingsForm";

export default function GoalSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { theme: C } = useMonoTheme();
  const s = useMemo(() => createStyles(C), [C]);
  const topPadding = getScreenTopPadding(insets.top);
  const bottomPadding = getScreenBottomPadding(insets.bottom, 40);
  const {
    dailyGoal,
    weeklyGoal,
    streakGoal,
    ddayTitle,
    setDdayTitle,
    ddayDate,
    setDdayDate,
    saveDailyGoal,
    saveWeeklyGoal,
    saveStreakGoal,
    saveDday,
  } = useGoalSettingsForm();

  return (
    <View style={[s.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
      <SettingsHeader title="학습 목표" />

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomPadding }]}>
        <GoalSection
          title="일일 공부 목표"
          desc="메인 화면과 공부 타이머의 기준 시간이 됩니다."
          options={DAILY_GOAL_OPTIONS}
          selected={dailyGoal}
          onSelect={saveDailyGoal}
          styles={s}
          C={C}
        />
        <GoalSection
          title="주간 공부 목표"
          desc="통계 화면 확장과 주간 리포트의 기준값으로 사용할 수 있습니다."
          options={WEEKLY_GOAL_OPTIONS}
          selected={weeklyGoal}
          onSelect={saveWeeklyGoal}
          styles={s}
          C={C}
        />
        <GoalSection
          title="연속 학습 목표"
          desc="스트릭과 리마인더 기능을 붙일 때 기준이 됩니다."
          options={STREAK_GOAL_OPTIONS}
          selected={streakGoal}
          onSelect={saveStreakGoal}
          styles={s}
          C={C}
        />

        <SettingsSection title="대표 D-Day">
          <Text style={s.sectionDesc}>메인 화면 오늘의 목표 카드에 표시됩니다.</Text>

          <Text style={s.inputLabel}>목표 이름</Text>
          <TextInput
            value={ddayTitle}
            onChangeText={setDdayTitle}
            placeholder="수능"
            placeholderTextColor={C.subtle}
            style={s.input}
          />

          <Text style={s.inputLabel}>목표 날짜</Text>
          <TextInput
            value={ddayDate}
            onChangeText={setDdayDate}
            placeholder="2026-11-19"
            placeholderTextColor={C.subtle}
            keyboardType="numbers-and-punctuation"
            style={s.input}
          />

          <TouchableOpacity style={s.saveButton} onPress={saveDday} activeOpacity={0.84}>
            <Text style={s.saveButtonText}>D-Day 저장</Text>
          </TouchableOpacity>
        </SettingsSection>
      </ScrollView>
    </View>
  );
}

function GoalSection({
  title,
  desc,
  options,
  selected,
  onSelect,
  styles,
  C,
}: {
  title: string;
  desc: string;
  options: { label: string; value: number }[];
  selected: number;
  onSelect: (value: number) => void;
  styles: ReturnType<typeof createStyles>;
  C: MonoTheme;
}) {
  return (
    <SettingsSection title={title}>
      <Text style={styles.sectionDesc}>{desc}</Text>
      <View style={styles.optionGrid}>
        {options.map((option) => {
          const active = option.value === selected;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.optionButton, active && styles.optionButtonActive]}
              onPress={() => onSelect(option.value)}
            >
              <Text style={styles.optionText}>{option.label}</Text>
              {active && <Ionicons name="checkmark" size={16} color={C.text} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </SettingsSection>
  );
}

const createStyles = (C: MonoTheme) => {
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
      paddingHorizontal: 20,
    },
    content: {
      paddingBottom: 40,
      gap: 14,
    },
    sectionDesc: {
      color: C.text,
      fontSize: TYPE_SIZE.label,
      lineHeight: 18,
      marginBottom: 14,
    },
    optionGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
    },
    optionButton: {
      minWidth: "47%",
      flex: 1,
      minHeight: 48,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      borderRadius: RADIUS.md,
      backgroundColor: C.surface,
      paddingHorizontal: SPACE.md,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      shadowColor: C.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.14,
      shadowRadius: 2,
      elevation: 2,
    },
    optionButtonActive: {
      borderWidth: 2,
      borderBottomWidth: 4,
    },
    optionText: {
      color: C.text,
      fontSize: TYPE_SIZE.body,
      fontWeight: TYPE_WEIGHT.bold,
    },
    inputLabel: {
      color: C.muted,
      fontSize: TYPE_SIZE.captionLarge,
      fontWeight: TYPE_WEIGHT.bold,
      marginBottom: 7,
      marginTop: SPACE.xs,
    },
    input: {
      minHeight: 48,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surfaceAlt,
      color: C.text,
      fontSize: TYPE_SIZE.body,
      fontWeight: TYPE_WEIGHT.semibold,
      paddingHorizontal: 13,
      marginBottom: SPACE.md,
    },
    saveButton: {
      minHeight: 50,
      borderRadius: RADIUS.control,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    saveButtonText: {
      color: C.inverse,
      fontSize: TYPE_SIZE.body,
      fontWeight: TYPE_WEIGHT.strong,
    },
  });

  return styles;
};
