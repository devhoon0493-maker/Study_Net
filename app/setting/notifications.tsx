import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
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
import { SettingsHeader } from "../../features/settings/SettingsHeader";
import { SettingsSection } from "../../features/settings/SettingsSection";
import { useNotificationSettingsForm } from "../../features/settings/useNotificationSettingsForm";
import {
  type NotificationFrequency,
} from "../../utils/notificationSettings";

const frequencyOptions: {
  label: string;
  desc: string;
  value: NotificationFrequency;
}[] = [
  { label: "매일", desc: "주말 포함 매일 같은 시간", value: "daily" },
  { label: "평일", desc: "월요일부터 금요일까지", value: "weekdays" },
  { label: "선택", desc: "필요한 요일만 직접 선택", value: "custom" },
];

const weekDays = [
  { label: "일", value: 0 },
  { label: "월", value: 1 },
  { label: "화", value: 2 },
  { label: "수", value: 3 },
  { label: "목", value: 4 },
  { label: "금", value: 5 },
  { label: "토", value: 6 },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: C } = useMonoTheme();
  const s = useMemo(() => createStyles(C), [C]);
  const topPadding = getScreenTopPadding(insets.top);
  const bottomPadding = getScreenBottomPadding(insets.bottom, 40);
  const {
    settings,
    saving,
    testing,
    updateSetting,
    toggleCustomDay,
    handleSave,
    sendTestNotification,
  } = useNotificationSettingsForm({
    onSaved: () => router.back(),
  });

  return (
    <View style={[s.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
      <SettingsHeader title="알림 시간" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: bottomPadding }]}
      >
        <SettingsSection>
          <SwitchLine
            icon="notifications-outline"
            label="알림 사용"
            desc="공부 리마인더와 커뮤니티 알림을 켭니다."
            value={settings.enabled}
            onChange={(value) => updateSetting("enabled", value)}
            styles={s}
            C={C}
          />
        </SettingsSection>

        <SettingsSection title="알림 항목">
          <SwitchLine
            icon="book-outline"
            label="공부 리마인더"
            desc="정해둔 시간에 공부 시작을 알려줍니다."
            value={settings.studyReminderEnabled}
            onChange={(value) => updateSetting("studyReminderEnabled", value)}
            styles={s}
            C={C}
          />
          <SwitchLine
            icon="chatbubble-ellipses-outline"
            label="커뮤니티 알림"
            desc="커뮤니티 확인 시간을 함께 저장합니다."
            value={settings.communityReminderEnabled}
            onChange={(value) =>
              updateSetting("communityReminderEnabled", value)
            }
            styles={s}
            C={C}
            isLast
          />
        </SettingsSection>

        <SettingsSection title="시간">
          <Text style={s.sectionDesc}>24시간 기준으로 입력합니다.</Text>
          <View style={s.timeInputRow}>
            <Ionicons name="time-outline" size={18} color={C.text} />
            <TextInput
              value={settings.reminderTime}
              onChangeText={(value) =>
                updateSetting("reminderTime", value.slice(0, 5))
              }
              placeholder="20:00"
              placeholderTextColor={C.subtle}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
              style={s.timeInput}
            />
          </View>
        </SettingsSection>

        <SettingsSection title="반복">
          <View style={s.frequencyList}>
            {frequencyOptions.map((option) => {
              const active = settings.frequency === option.value;

              return (
                <TouchableOpacity
                  key={option.value}
                  style={[s.frequencyButton, active && s.frequencyButtonActive]}
                  onPress={() => updateSetting("frequency", option.value)}
                  activeOpacity={0.82}
                >
                  <View style={s.frequencyTextWrap}>
                    <Text style={s.frequencyLabel}>{option.label}</Text>
                    <Text style={s.frequencyDesc}>{option.desc}</Text>
                  </View>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={20} color={C.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>

          {settings.frequency === "custom" ? (
            <View style={s.dayRow}>
              {weekDays.map((day) => {
                const active = settings.customDays.includes(day.value);
                return (
                  <TouchableOpacity
                    key={day.value}
                    style={[s.dayButton, active && s.dayButtonActive]}
                    onPress={() => toggleCustomDay(day.value)}
                    activeOpacity={0.82}
                  >
                    <Text style={[s.dayText, active && s.dayTextActive]}>
                      {day.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}
        </SettingsSection>

        <SettingsSection title="테스트">
          <Text style={s.sectionDesc}>
            실제 기기나 개발 빌드에서 알림 동작을 바로 확인할 수 있습니다.
          </Text>
          <TouchableOpacity
            style={[s.testButton, testing && s.testButtonDisabled]}
            onPress={sendTestNotification}
            disabled={testing}
            activeOpacity={0.84}
          >
            <Ionicons name="notifications-outline" size={17} color={C.text} />
            <Text style={s.testButtonText}>
              {testing ? "예약 중..." : "테스트 알림 보내기"}
            </Text>
          </TouchableOpacity>
        </SettingsSection>

        <TouchableOpacity
          style={[s.saveButton, saving && s.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.84}
        >
          <Text style={s.saveButtonText}>
            {saving ? "저장 중..." : "저장하기"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function SwitchLine({
  icon,
  label,
  desc,
  value,
  onChange,
  styles,
  C,
  isLast,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  desc: string;
  value: boolean;
  onChange: (value: boolean) => void;
  styles: ReturnType<typeof createStyles>;
  C: MonoTheme;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.switchLine, isLast && styles.switchLineLast]}>
      <View style={styles.switchIcon}>
        <Ionicons name={icon} size={18} color={C.text} />
      </View>
      <View style={styles.switchTextWrap}>
        <Text style={styles.switchLabel}>{label}</Text>
        <Text style={styles.switchDesc}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: C.surfaceAlt, true: C.primarySoft }}
        thumbColor={value ? C.primary : C.subtle}
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
    sectionDesc: {
      color: C.muted,
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 10,
    },
    switchLine: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      gap: 11,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: C.borderSoft,
    },
    switchLineLast: {
      borderBottomWidth: 0,
    },
    switchIcon: {
      width: 34,
      height: 34,
      borderRadius: 12,
      backgroundColor: C.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    switchTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    switchLabel: {
      color: C.text,
      fontSize: 14,
      fontWeight: "900",
    },
    switchDesc: {
      color: C.muted,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 3,
    },
    timeInputRow: {
      minHeight: 54,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 14,
      backgroundColor: C.surfaceAlt,
      paddingHorizontal: 13,
    },
    timeInput: {
      flex: 1,
      color: C.text,
      fontSize: 18,
      fontWeight: "900",
    },
    frequencyList: {
      gap: 9,
    },
    frequencyButton: {
      minHeight: 58,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 14,
      paddingHorizontal: 13,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: C.surfaceAlt,
    },
    frequencyButtonActive: {
      borderColor: C.primary,
      backgroundColor: C.primarySoft,
    },
    frequencyTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    frequencyLabel: {
      color: C.text,
      fontSize: 14,
      fontWeight: "900",
    },
    frequencyDesc: {
      color: C.muted,
      fontSize: 11,
      fontWeight: "700",
      marginTop: 3,
    },
    dayRow: {
      flexDirection: "row",
      gap: 7,
      marginTop: 13,
    },
    dayButton: {
      flex: 1,
      minHeight: 40,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      backgroundColor: C.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    dayButtonActive: {
      borderColor: C.primary,
      backgroundColor: C.primary,
    },
    dayText: {
      color: C.text,
      fontSize: 12,
      fontWeight: "900",
    },
    dayTextActive: {
      color: C.inverse,
    },
    saveButton: {
      minHeight: 54,
      borderRadius: 15,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    testButton: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 14,
      backgroundColor: C.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    testButtonDisabled: {
      opacity: 0.5,
    },
    testButtonText: {
      color: C.text,
      fontSize: 14,
      fontWeight: "900",
    },
    saveButtonDisabled: {
      opacity: 0.5,
    },
    saveButtonText: {
      color: C.inverse,
      fontSize: 15,
      fontWeight: "900",
    },
  });
