import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BottomNav, { getBottomNavSpace } from "../components/BottomNav";
import { useMonoTheme, type MonoTheme } from "../constants/mono";
import {
  formatStudyDuration,
  loadStudySessions,
  toDateKey,
  type StudySession,
} from "../utils/studySessions";

type CalendarDay = {
  key: string;
  date: Date;
  inMonth: boolean;
};

const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

const monthTitle = (date: Date) =>
  date.toLocaleDateString("ko-KR", { year: "numeric", month: "long" });

const compactDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return "";
};

export default function CalendarScreen() {
  const router = useRouter();
  const { theme: C } = useMonoTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createStyles(C), [C]);
  const bottomSpace = getBottomNavSpace(insets.bottom);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState(() => toDateKey(new Date()));

  useEffect(() => {
    loadStudySessions().then(setSessions);
  }, []);

  const byDate = useMemo(() => {
    const map: Record<string, StudySession[]> = {};

    for (const item of sessions) {
      const key = toDateKey(new Date(item.date));
      map[key] = [...(map[key] ?? []), item];
    }

    return map;
  }, [sessions]);

  const selectedSessions = byDate[selectedKey] ?? [];
  const selectedTotal = selectedSessions.reduce(
    (sum, item) => sum + item.seconds,
    0,
  );

  const days = useMemo<CalendarDay[]>(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    const calendarStart = new Date(year, month, 1 - first.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(
        calendarStart.getFullYear(),
        calendarStart.getMonth(),
        calendarStart.getDate() + index,
      );

      return {
        key: toDateKey(date),
        date,
        inMonth: date.getMonth() === month,
      };
    });
  }, [cursor]);

  const monthTotal = useMemo(() => {
    return days
      .filter((day) => day.inMonth)
      .reduce((sum, day) => {
        const total = (byDate[day.key] ?? []).reduce(
          (daySum, item) => daySum + item.seconds,
          0,
        );
        return sum + total;
      }, 0);
  }, [byDate, days]);

  const moveMonth = (amount: number) => {
    setCursor(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  };

  const goToday = () => {
    const today = new Date();
    setCursor(today);
    setSelectedKey(toDateKey(today));
  };

  const todayKey = toDateKey(new Date());

  return (
    <View style={s.container}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
      <View style={s.header}>
        <TouchableOpacity style={s.iconButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={s.title}>달력</Text>
        <TouchableOpacity style={s.todayButton} onPress={goToday}>
          <Text style={s.todayButtonText}>오늘</Text>
        </TouchableOpacity>
      </View>

      <View style={s.monthPanel}>
        <View style={s.monthRow}>
          <TouchableOpacity style={s.monthButton} onPress={() => moveMonth(-1)}>
            <Ionicons name="chevron-back" size={18} color={C.text} />
          </TouchableOpacity>
          <View style={s.monthCenter}>
            <Text style={s.monthText}>{monthTitle(cursor)}</Text>
            <Text style={s.monthMeta}>
              이번 달 {formatStudyDuration(monthTotal)}
            </Text>
          </View>
          <TouchableOpacity style={s.monthButton} onPress={() => moveMonth(1)}>
            <Ionicons name="chevron-forward" size={18} color={C.text} />
          </TouchableOpacity>
        </View>

        <View style={s.weekRow}>
          {weekDays.map((day, index) => (
            <Text
              key={day}
              style={[
                s.weekText,
                index === 0 && s.weekendText,
                index === 6 && s.weekendText,
              ]}
            >
              {day}
            </Text>
          ))}
        </View>

        <View style={s.calendarGrid}>
          {days.map((day) => {
            const total = (byDate[day.key] ?? []).reduce(
              (sum, item) => sum + item.seconds,
              0,
            );
            const active = day.key === selectedKey;
            const isToday = day.key === todayKey;

            return (
              <TouchableOpacity
                key={day.key}
                style={[s.dayCell, !day.inMonth && s.dayCellMuted]}
                onPress={() => setSelectedKey(day.key)}
                activeOpacity={0.75}
              >
                <View style={[s.dayCircle, active && s.dayCircleActive]}>
                  <Text
                    style={[
                      s.dayText,
                      !day.inMonth && s.dayTextMuted,
                      active && s.dayTextActive,
                    ]}
                  >
                    {day.date.getDate()}
                  </Text>
                </View>

                <View style={s.dayMetaSlot}>
                  {isToday && <View style={s.todayDot} />}
                  {total > 0 ? (
                    <Text style={s.studyBadgeText} numberOfLines={1}>
                      {compactDuration(total)}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={s.detail}
        contentContainerStyle={[s.detailContent, { paddingBottom: bottomSpace + 24 }]}
      >
        <View style={s.detailHeader}>
          <Text style={s.sectionTitle}>{selectedKey}</Text>
          <Text style={s.detailTotal}>{formatStudyDuration(selectedTotal)}</Text>
        </View>

        {selectedSessions.length === 0 ? (
          <Text style={s.emptyText}>이 날의 공부 기록이 없습니다.</Text>
        ) : (
          selectedSessions.map((item, index) => (
            <View key={`${item.date}-${index}`} style={s.sessionRow}>
              <View>
                <Text style={s.sessionSubject}>{item.subject}</Text>
                <Text style={s.sessionDate}>
                  {new Date(item.date).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <Text style={s.sessionTime}>{formatStudyDuration(item.seconds)}</Text>
            </View>
          ))
        )}
      </ScrollView>
      <BottomNav />
    </View>
  );
}

const createStyles = (C: MonoTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
      paddingTop: 58,
      paddingHorizontal: 18,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 18,
    },
    iconButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surfaceAlt,
    },
    title: {
      color: C.text,
      fontSize: 24,
      fontWeight: "800",
    },
    todayButton: {
      height: 38,
      minWidth: 52,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.primarySoft,
      paddingHorizontal: 12,
    },
    todayButtonText: {
      color: C.primary,
      fontSize: 13,
      fontWeight: "800",
    },
    monthPanel: {
      borderRadius: 18,
      backgroundColor: C.surface,
      padding: 10,
      shadowColor: C.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 2,
    },
    monthRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    monthButton: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surfaceAlt,
    },
    monthCenter: {
      alignItems: "center",
      gap: 3,
    },
    monthText: {
      color: C.muted,
      fontSize: 16,
      fontWeight: "900",
    },
    monthMeta: {
      color: C.subtle,
      fontSize: 10,
      fontWeight: "700",
    },
    weekRow: {
      flexDirection: "row",
      marginBottom: 4,
    },
    weekText: {
      flex: 1,
      textAlign: "center",
      color: C.text,
      fontWeight: "900",
      fontSize: 12,
      paddingVertical: 4,
    },
    weekendText: {
      fontWeight: "900",
    },
    calendarGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      rowGap: 3,
    },
    dayCell: {
      width: `${100 / 7}%`,
      minHeight: 46,
      backgroundColor: "transparent",
      alignItems: "center",
      justifyContent: "flex-start",
      paddingTop: 2,
    },
    dayCellMuted: {
      opacity: 0.42,
    },
    dayCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surface,
    },
    dayCircleActive: {
      backgroundColor: C.primary,
      borderColor: C.primary,
      borderWidth: 1,
    },
    dayText: {
      color: C.text,
      fontSize: 13,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    dayTextMuted: {
      color: C.subtle,
    },
    dayTextActive: {
      color: C.inverse,
      fontSize: 14,
      fontWeight: "900",
    },
    todayDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.success,
      marginTop: 3,
    },
    dayMetaSlot: {
      minHeight: 12,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      maxWidth: 44,
    },
    studyBadgeText: {
      color: C.success,
      fontSize: 8,
      fontWeight: "800",
      maxWidth: 44,
    },
    detail: {
      marginTop: 18,
    },
    detailContent: {},
    detailHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 10,
    },
    sectionTitle: {
      color: C.text,
      fontSize: 14,
      fontWeight: "900",
    },
    detailTotal: {
      color: C.primary,
      fontSize: 13,
      fontWeight: "800",
    },
    emptyText: {
      color: C.muted,
      borderRadius: 14,
      padding: 16,
      backgroundColor: C.surface,
    },
    sessionRow: {
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: C.surface,
      shadowColor: C.shadow,
      shadowOpacity: 0.04,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 1,
    },
    sessionSubject: {
      color: C.muted,
      fontWeight: "900",
      marginBottom: 4,
    },
    sessionDate: {
      color: C.primary,
      fontSize: 11,
      fontWeight: "600",
    },
    sessionTime: {
      color: C.text,
      fontWeight: "800",
    },
  });
