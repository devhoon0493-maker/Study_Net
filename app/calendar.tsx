import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BottomNav, { getBottomNavSpace } from "../components/BottomNav";
import { getScreenTopPadding } from "../constants/layout";
import { useMonoTheme, type MonoTheme } from "../constants/mono";
import {
  loadStudySessions,
  toDateKey,
  type StudySession,
} from "../utils/studySessions";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type CalendarDay = {
  key: string;
  date: Date;
  inMonth: boolean;
};

type DaySummary = {
  sessions: StudySession[];
  total: number;
};

type SubjectStat = {
  subject: string;
  seconds: number;
  ratio: number;
};

const WEEK_DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const MONTHS_KOR = [
  "1월",
  "2월",
  "3월",
  "4월",
  "5월",
  "6월",
  "7월",
  "8월",
  "9월",
  "10월",
  "11월",
  "12월",
];
const MAX_SUBJECT_ROWS = 5;

// 헥스 컬러를 지정한 투명도의 rgba 문자열로 변환합니다.
// primary 색상 하나를 명도(투명도) 스케일로만 사용해 공부량 레벨을 표현할 때 사용합니다.
const hexToRgba = (hex: string, alpha: number) => {
  const clean = hex.replace("#", "");
  const normalized =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) return `${hours}시간 ${minutes}분`;
  if (hours > 0) return `${hours}시간`;
  if (minutes > 0) return `${minutes}분`;
  return "0분";
};

const formatCompactDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "";
};

// 전월 대비 증감을 "+3시간" / "-45분" / "동일" 형태로 표현합니다.
const formatDiff = (diffSeconds: number) => {
  if (diffSeconds === 0) return "동일";
  const sign = diffSeconds > 0 ? "+" : "-";
  return `${sign}${formatDuration(Math.abs(diffSeconds))}`;
};

const monthTitle = (date: Date) =>
  date.toLocaleDateString("ko-KR", { year: "numeric", month: "long" });

const selectedDateLabel = (key: string) =>
  new Date(`${key}T00:00:00`).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

export default function CalendarScreen() {
  const router = useRouter();
  const { theme: C } = useMonoTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createStyles(C), [C]);
  const bottomSpace = getBottomNavSpace(insets.bottom);
  const topPadding = getScreenTopPadding(insets.top);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [cursor, setCursor] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState(() => toDateKey(new Date()));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());

  useFocusEffect(
    useCallback(() => {
      loadStudySessions().then(setSessions);
    }, []),
  );

  const byDate = useMemo<Record<string, DaySummary>>(() => {
    const map: Record<string, DaySummary> = {};

    for (const item of sessions) {
      const key = toDateKey(new Date(item.date));
      const current = map[key] ?? { sessions: [], total: 0 };
      map[key] = {
        sessions: [...current.sessions, item],
        total: current.total + item.seconds,
      };
    }

    return map;
  }, [sessions]);

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

  const monthDays = useMemo(() => days.filter((day) => day.inMonth), [days]);
  const monthTotal = monthDays.reduce((sum, day) => sum + (byDate[day.key]?.total ?? 0), 0);
  const studiedDays = monthDays.filter((day) => (byDate[day.key]?.total ?? 0) > 0).length;
  const monthSessionCount = monthDays.reduce(
    (sum, day) => sum + (byDate[day.key]?.sessions.length ?? 0),
    0,
  );
  const averageSeconds = studiedDays > 0 ? Math.round(monthTotal / studiedDays) : 0;
  const bestDay = monthDays.reduce(
    (best, day) => {
      const total = byDate[day.key]?.total ?? 0;
      return total > best.total ? { key: day.key, total } : best;
    },
    { key: "", total: 0 },
  );

  const todayKey = toDateKey(new Date());

  // 오늘(또는 어제)부터 거슬러 올라가며 공부 기록이 끊기지 않은 일수를 셉니다.
  const streakDays = useMemo(() => {
    let count = 0;
    const walker = new Date(`${todayKey}T00:00:00`);

    if (!((byDate[todayKey]?.total ?? 0) > 0)) {
      walker.setDate(walker.getDate() - 1);
    }

    while (true) {
      const key = toDateKey(walker);
      const total = byDate[key]?.total ?? 0;
      if (total <= 0) break;
      count += 1;
      walker.setDate(walker.getDate() - 1);
    }

    return count;
  }, [byDate, todayKey]);

  // 지난달 총 공부시간과 비교해 증감을 계산합니다.
  const previousMonthTotal = useMemo(() => {
    const prevCursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    const prevYear = prevCursor.getFullYear();
    const prevMonth = prevCursor.getMonth();

    return sessions.reduce((sum, item) => {
      const itemDate = new Date(item.date);
      if (itemDate.getFullYear() === prevYear && itemDate.getMonth() === prevMonth) {
        return sum + item.seconds;
      }
      return sum;
    }, 0);
  }, [sessions, cursor]);

  const monthDiff = monthTotal - previousMonthTotal;

  // 이번 달 과목별 공부시간 비율 (상위 5개).
  const subjectStats = useMemo<SubjectStat[]>(() => {
    const totals: Record<string, number> = {};

    monthDays.forEach((day) => {
      const daySessions = byDate[day.key]?.sessions ?? [];
      daySessions.forEach((item) => {
        totals[item.subject] = (totals[item.subject] ?? 0) + item.seconds;
      });
    });

    const overall = Object.values(totals).reduce((sum, value) => sum + value, 0);
    if (overall === 0) return [];

    return Object.entries(totals)
      .map(([subject, seconds]) => ({ subject, seconds, ratio: seconds / overall }))
      .sort((a, b) => b.seconds - a.seconds)
      .slice(0, MAX_SUBJECT_ROWS);
  }, [monthDays, byDate]);

  const selectedSummary = byDate[selectedKey] ?? { sessions: [], total: 0 };
  const selectedSessions = [...selectedSummary.sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const moveMonth = (amount: number) => {
    setCursor((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
    setPickerOpen(false);
  };

  const goToday = () => {
    const today = new Date();
    setCursor(today);
    setSelectedKey(toDateKey(today));
    setPickerOpen(false);
  };

  const togglePicker = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPickerYear(cursor.getFullYear());
    setPickerOpen((open) => !open);
  };

  const selectMonth = (monthIndex: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCursor(new Date(pickerYear, monthIndex, 1));
    setPickerOpen(false);
  };

  const getDayLevel = (seconds: number) => {
    if (seconds >= 4 * 3600) return "high";
    if (seconds >= 2 * 3600) return "medium";
    if (seconds > 0) return "low";
    return "none";
  };

  return (
    <View style={[s.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />

      <View style={s.header}>
        <TouchableOpacity
          testID="calendar-back-button"
          style={s.iconButton}
          onPress={() => router.back()}
          activeOpacity={0.78}
        >
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={s.title}>캘린더</Text>
        <TouchableOpacity
          testID="calendar-today-button"
          style={s.todayButton}
          onPress={goToday}
          activeOpacity={0.78}
        >
          <Text style={s.todayButtonText}>오늘</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: bottomSpace + 24 }]}
      >
        <View style={s.summaryPanel}>
          <View style={s.summaryHeader}>
            <View style={s.summaryHeaderLeft}>
              <View style={s.summaryEyebrowRow}>
                <Text style={s.summaryEyebrow}>{monthTitle(cursor)}</Text>
                {previousMonthTotal > 0 ? (
                  <View
                    style={[
                      s.diffBadge,
                      monthDiff < 0 && s.diffBadgeNegative,
                    ]}
                  >
                    <Text
                      style={[
                        s.diffBadgeText,
                        monthDiff < 0 && s.diffBadgeTextNegative,
                      ]}
                    >
                      지난달 대비 {formatDiff(monthDiff)}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={s.summaryTitle}>월간 공부 요약</Text>
            </View>
            <View style={s.summaryIcon}>
              <Ionicons name="analytics-outline" size={20} color={C.primary} />
            </View>
          </View>

          <View style={s.summaryGrid}>
            <SummaryItem label="총 공부" value={formatDuration(monthTotal)} styles={s} />
            <SummaryItem label="공부한 날" value={`${studiedDays}일`} styles={s} />
            <SummaryItem label="평균" value={formatDuration(averageSeconds)} styles={s} />
            <SummaryItem
              label="연속 기록"
              value={streakDays > 0 ? `${streakDays}일` : "-"}
              icon={streakDays > 0 ? "flame" : undefined}
              iconColor={C.warning}
              styles={s}
            />
          </View>

          {studiedDays > 0 ? (
            <View style={s.bestDayBox}>
              <Ionicons name="trophy-outline" size={16} color={C.warning} />
              <Text style={s.bestDayText}>
                최고 공부일 {bestDay.key ? selectedDateLabel(bestDay.key) : "-"} ·{" "}
                {formatDuration(bestDay.total)}
              </Text>
            </View>
          ) : null}
        </View>

        {subjectStats.length > 0 ? (
          <View style={s.subjectPanel}>
            <View style={s.subjectHeader}>
              <Text style={s.subjectTitle}>과목별 공부 비율</Text>
              <Text style={s.subjectSubtitle}>{monthSessionCount}개 세션</Text>
            </View>

            <View style={s.subjectList}>
              {subjectStats.map((item) => (
                <View key={item.subject} style={s.subjectRow}>
                  <View style={s.subjectRowTop}>
                    <Text style={s.subjectName} numberOfLines={1}>
                      {item.subject}
                    </Text>
                    <Text style={s.subjectPercent}>{Math.round(item.ratio * 100)}%</Text>
                  </View>
                  <View style={s.subjectTrack}>
                    <View
                      style={[
                        s.subjectFill,
                        { width: `${Math.max(item.ratio * 100, 3)}%` },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={s.monthPanel}>
          <View style={s.monthRow}>
            <TouchableOpacity
              testID="calendar-prev-month-button"
              style={s.monthButton}
              onPress={() => moveMonth(-1)}
              activeOpacity={0.78}
            >
              <Ionicons name="chevron-back" size={18} color={C.text} />
            </TouchableOpacity>

            <TouchableOpacity
              testID="calendar-month-picker-button"
              style={s.monthCenter}
              onPress={togglePicker}
              activeOpacity={0.75}
            >
              <Text style={s.monthText}>{monthTitle(cursor)}</Text>
              <Ionicons
                name={pickerOpen ? "chevron-up" : "chevron-down"}
                size={14}
                color={C.muted}
              />
            </TouchableOpacity>

            <TouchableOpacity
              testID="calendar-next-month-button"
              style={s.monthButton}
              onPress={() => moveMonth(1)}
              activeOpacity={0.78}
            >
              <Ionicons name="chevron-forward" size={18} color={C.text} />
            </TouchableOpacity>
          </View>

          {pickerOpen ? (
            <View style={s.pickerPanel}>
              <View style={s.pickerYearRow}>
                <TouchableOpacity
                  testID="calendar-picker-prev-year-button"
                  style={s.pickerYearButton}
                  onPress={() => setPickerYear((year) => year - 1)}
                  activeOpacity={0.78}
                >
                  <Ionicons name="chevron-back" size={16} color={C.text} />
                </TouchableOpacity>
                <Text style={s.pickerYearText}>{pickerYear}년</Text>
                <TouchableOpacity
                  testID="calendar-picker-next-year-button"
                  style={s.pickerYearButton}
                  onPress={() => setPickerYear((year) => year + 1)}
                  activeOpacity={0.78}
                >
                  <Ionicons name="chevron-forward" size={16} color={C.text} />
                </TouchableOpacity>
              </View>

              <View style={s.pickerMonthGrid}>
                {MONTHS_KOR.map((label, index) => {
                  const active = cursor.getFullYear() === pickerYear && cursor.getMonth() === index;
                  return (
                    <TouchableOpacity
                      key={label}
                      testID={`calendar-picker-month-${index}`}
                      style={[s.pickerMonthCell, active && s.pickerMonthCellActive]}
                      onPress={() => selectMonth(index)}
                      activeOpacity={0.78}
                    >
                      <Text style={[s.pickerMonthText, active && s.pickerMonthTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <View style={s.legendRow}>
              <LegendDot color={hexToRgba(C.primary, 0.18)} label="1시간 미만" styles={s} />
              <LegendDot color={hexToRgba(C.primary, 0.45)} label="2시간 이상" styles={s} />
              <LegendDot color={C.primary} label="4시간 이상" styles={s} />
            </View>
          )}

          <View style={s.weekRow}>
            {WEEK_DAYS.map((day, index) => (
              <Text
                key={day}
                style={[s.weekText, index === 0 && s.sundayText, index === 6 && s.saturdayText]}
              >
                {day}
              </Text>
            ))}
          </View>

          <View style={s.calendarGrid}>
            {days.map((day) => {
              const total = byDate[day.key]?.total ?? 0;
              const level = getDayLevel(total);
              const hasRecord = total > 0;
              const active = day.key === selectedKey;
              const isToday = day.key === todayKey;

              return (
                <TouchableOpacity
                  key={day.key}
                  testID={`calendar-day-${day.key}`}
                  style={[s.dayCell, !day.inMonth && s.dayCellMuted]}
                  onPress={() => setSelectedKey(day.key)}
                  activeOpacity={0.75}
                >
                  <View
                    style={[
                      s.dayBox,
                      level === "low" && s.dayBoxLow,
                      level === "medium" && s.dayBoxMedium,
                      level === "high" && s.dayBoxHigh,
                      active && s.dayBoxActive,
                    ]}
                  >
                    <Text
                      style={[
                        s.dayText,
                        !day.inMonth && s.dayTextMuted,
                        level === "high" && s.dayTextHigh,
                        active && s.dayTextActive,
                      ]}
                    >
                      {day.date.getDate()}
                    </Text>
                    {hasRecord ? (
                      <Text
                        style={[
                          s.dayDuration,
                          level === "high" && s.dayDurationHigh,
                          active && s.dayDurationActive,
                        ]}
                        numberOfLines={1}
                      >
                        {formatCompactDuration(total)}
                      </Text>
                    ) : (
                      <View style={s.dayDurationPlaceholder} />
                    )}
                  </View>
                  {isToday ? <View style={s.todayDot} /> : <View style={s.todayDotPlaceholder} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={s.detailCard}>
          <View style={s.detailHeader}>
            <View>
              <Text style={s.sectionTitle}>{selectedDateLabel(selectedKey)}</Text>
              <Text style={s.sectionSub}>
                총 {formatDuration(selectedSummary.total)} · {selectedSessions.length}개 세션
              </Text>
            </View>
            <View style={s.selectedTotalBadge}>
              <Text style={s.selectedTotalText}>{selectedSessions.length}개 세션</Text>
            </View>
          </View>

          {selectedSessions.length === 0 ? (
            <View style={s.emptyBlock}>
              <Ionicons name="calendar-outline" size={25} color={C.subtle} />
              <Text style={s.emptyTitle}>이 날의 공부 기록이 없습니다.</Text>
              <Text style={s.emptyText}>공부를 종료하면 날짜별 기록이 자동으로 저장됩니다.</Text>
            </View>
          ) : (
            <View style={s.sessionList}>
              {selectedSessions.map((item, index) => (
                <View
                  key={`${item.date}-${index}`}
                  testID={`calendar-session-row-${index}`}
                  style={s.sessionRow}
                >
                  <View style={s.sessionTimeBox}>
                    <Text style={s.sessionTime}>
                      {new Date(item.date).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <Text style={s.sessionSubject} numberOfLines={1}>
                    {item.subject}
                  </Text>
                  <Text style={s.sessionDuration}>{formatDuration(item.seconds)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      <BottomNav />
    </View>
  );
}

function SummaryItem({
  label,
  value,
  icon,
  iconColor,
  styles,
}: {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryItemLabel}>{label}</Text>
      <View style={styles.summaryItemValueRow}>
        {icon ? (
          <Ionicons name={icon} size={13} color={iconColor} style={styles.summaryItemIcon} />
        ) : null}
        <Text style={styles.summaryItemValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function LegendDot({
  color,
  label,
  styles,
}: {
  color: string;
  label: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const createStyles = (C: MonoTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
      paddingHorizontal: 18,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surface,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
    },
    title: {
      color: C.text,
      fontSize: 24,
      fontWeight: "900",
    },
    todayButton: {
      height: 40,
      minWidth: 56,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.primarySoft,
      paddingHorizontal: 13,
    },
    todayButtonText: {
      color: C.primary,
      fontSize: 13,
      fontWeight: "900",
    },
    content: {
      gap: 14,
    },
    summaryPanel: {
      borderRadius: 22,
      backgroundColor: C.surface,
      padding: 15,
      borderWidth: 1,
      borderColor: C.borderSoft,
      shadowColor: C.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    summaryHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    summaryHeaderLeft: {
      flex: 1,
      paddingRight: 10,
    },
    summaryEyebrowRow: {
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 6,
      marginBottom: 3,
    },
    summaryEyebrow: {
      color: C.primary,
      fontSize: 12,
      fontWeight: "900",
    },
    diffBadge: {
      borderRadius: 8,
      backgroundColor: C.successSoft,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    diffBadgeNegative: {
      backgroundColor: C.surfaceAlt,
    },
    diffBadgeText: {
      color: C.success,
      fontSize: 10,
      fontWeight: "900",
    },
    diffBadgeTextNegative: {
      color: C.muted,
    },
    summaryTitle: {
      color: C.text,
      fontSize: 19,
      fontWeight: "900",
    },
    summaryIcon: {
      width: 40,
      height: 40,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.primarySoft,
    },
    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 9,
    },
    summaryItem: {
      width: "48%",
      minHeight: 64,
      borderRadius: 15,
      backgroundColor: C.surfaceAlt,
      paddingHorizontal: 12,
      paddingVertical: 11,
      justifyContent: "center",
    },
    summaryItemLabel: {
      color: C.muted,
      fontSize: 11,
      fontWeight: "800",
      marginBottom: 5,
    },
    summaryItemValueRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    summaryItemIcon: {
      marginBottom: 1,
    },
    summaryItemValue: {
      color: C.text,
      fontSize: 16,
      fontWeight: "900",
    },
    bestDayBox: {
      minHeight: 42,
      marginTop: 11,
      borderRadius: 14,
      backgroundColor: C.warningSoft,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    bestDayText: {
      flex: 1,
      color: C.text,
      fontSize: 12,
      fontWeight: "800",
    },
    subjectPanel: {
      borderRadius: 22,
      backgroundColor: C.surface,
      padding: 15,
      borderWidth: 1,
      borderColor: C.borderSoft,
      shadowColor: C.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 2,
    },
    subjectHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 13,
    },
    subjectTitle: {
      color: C.text,
      fontSize: 15,
      fontWeight: "900",
    },
    subjectSubtitle: {
      color: C.muted,
      fontSize: 11,
      fontWeight: "800",
    },
    subjectList: {
      gap: 12,
    },
    subjectRow: {
      gap: 6,
    },
    subjectRowTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    subjectName: {
      flex: 1,
      color: C.text,
      fontSize: 13,
      fontWeight: "800",
    },
    subjectPercent: {
      color: C.muted,
      fontSize: 12,
      fontWeight: "900",
    },
    subjectTrack: {
      height: 8,
      borderRadius: 4,
      backgroundColor: C.surfaceAlt,
      overflow: "hidden",
    },
    subjectFill: {
      height: 8,
      borderRadius: 4,
      backgroundColor: C.primary,
    },
    monthPanel: {
      borderRadius: 22,
      backgroundColor: C.surface,
      padding: 13,
      borderWidth: 1,
      borderColor: C.borderSoft,
      shadowColor: C.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    monthRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    monthButton: {
      width: 34,
      height: 34,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surfaceAlt,
    },
    monthCenter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      flex: 1,
      justifyContent: "center",
      paddingVertical: 6,
    },
    monthText: {
      color: C.text,
      fontSize: 17,
      fontWeight: "900",
    },
    pickerPanel: {
      marginTop: 8,
      marginBottom: 4,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: C.borderSoft,
      gap: 10,
    },
    pickerYearRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 18,
    },
    pickerYearButton: {
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surfaceAlt,
    },
    pickerYearText: {
      color: C.text,
      fontSize: 15,
      fontWeight: "900",
      minWidth: 64,
      textAlign: "center",
    },
    pickerMonthGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    pickerMonthCell: {
      width: "22%",
      paddingVertical: 10,
      borderRadius: 11,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surfaceAlt,
    },
    pickerMonthCellActive: {
      backgroundColor: C.primary,
    },
    pickerMonthText: {
      color: C.text,
      fontSize: 13,
      fontWeight: "800",
    },
    pickerMonthTextActive: {
      color: C.inverse,
    },
    legendRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 9,
      marginTop: 8,
      marginBottom: 4,
    },
    legendItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
    },
    legendDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: C.border,
    },
    legendText: {
      color: C.muted,
      fontSize: 10,
      fontWeight: "800",
    },
    weekRow: {
      flexDirection: "row",
      marginTop: 8,
      marginBottom: 7,
    },
    weekText: {
      flex: 1,
      textAlign: "center",
      color: C.muted,
      fontWeight: "900",
      fontSize: 12,
      paddingVertical: 5,
    },
    sundayText: {
      color: C.live,
    },
    saturdayText: {
      color: C.primary,
    },
    calendarGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      rowGap: 5,
    },
    dayCell: {
      width: `${100 / 7}%`,
      minHeight: 61,
      alignItems: "center",
      justifyContent: "flex-start",
    },
    dayCellMuted: {
      opacity: 0.34,
    },
    dayBox: {
      width: 42,
      height: 48,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    dayBoxLow: {
      backgroundColor: hexToRgba(C.primary, 0.18),
      borderColor: "transparent",
    },
    dayBoxMedium: {
      backgroundColor: hexToRgba(C.primary, 0.45),
      borderColor: "transparent",
    },
    dayBoxHigh: {
      backgroundColor: C.primary,
      borderColor: C.primary,
    },
    dayBoxActive: {
      borderColor: C.text,
      borderWidth: 2,
    },
    dayText: {
      color: C.text,
      fontSize: 13,
      fontWeight: "900",
      fontVariant: ["tabular-nums"],
    },
    dayTextMuted: {
      color: C.subtle,
    },
    dayTextHigh: {
      color: C.inverse,
    },
    dayTextActive: {
      color: C.text,
    },
    dayDuration: {
      color: C.text,
      fontSize: 8,
      fontWeight: "900",
      marginTop: 2,
      maxWidth: 38,
    },
    dayDurationHigh: {
      color: C.inverse,
    },
    dayDurationActive: {
      color: C.text,
    },
    dayDurationPlaceholder: {
      height: 10,
      marginTop: 2,
    },
    todayDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.danger,
      marginTop: 3,
    },
    todayDotPlaceholder: {
      width: 4,
      height: 4,
      marginTop: 3,
    },
    detailCard: {
      borderRadius: 22,
      backgroundColor: C.surface,
      padding: 15,
      borderWidth: 1,
      borderColor: C.borderSoft,
      shadowColor: C.shadow,
      shadowOpacity: 0.05,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 2,
    },
    detailHeader: {
      marginBottom: 14,
      gap: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionTitle: {
      color: C.text,
      fontSize: 17,
      fontWeight: "900",
    },
    sectionSub: {
      color: C.primary,
      fontSize: 12,
      fontWeight: "900",
      marginTop: 3,
    },
    selectedTotalBadge: {
      maxWidth: 108,
      minHeight: 38,
      borderRadius: 13,
      backgroundColor: C.primarySoft,
      paddingHorizontal: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    selectedTotalText: {
      color: C.primary,
      fontSize: 12,
      fontWeight: "900",
      textAlign: "center",
    },
    emptyBlock: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 28,
      borderRadius: 16,
      backgroundColor: C.surfaceAlt,
    },
    emptyTitle: {
      color: C.text,
      fontSize: 14,
      fontWeight: "900",
      marginTop: 9,
    },
    emptyText: {
      color: C.muted,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 4,
      textAlign: "center",
    },
    sessionList: {
      gap: 10,
    },
    sessionRow: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: C.borderSoft,
    },
    sessionTimeBox: {
      width: 54,
      minHeight: 32,
      borderRadius: 11,
      backgroundColor: C.surfaceAlt,
      alignItems: "center",
      justifyContent: "center",
    },
    sessionTime: {
      color: C.muted,
      fontSize: 11,
      fontWeight: "800",
    },
    sessionSubject: {
      flex: 1,
      color: C.text,
      fontSize: 13,
      fontWeight: "800",
    },
    sessionDuration: {
      color: C.text,
      fontSize: 12,
      fontWeight: "900",
    },
  });
