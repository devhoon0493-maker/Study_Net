import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
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
import { getScreenTopPadding } from "../constants/layout";
import { useMonoTheme, type MonoTheme } from "../constants/mono";
import {
  formatStudyDuration,
  loadStudySessions,
  toDateKey,
  type StudySession,
} from "../utils/studySessions";

export default function StatisticsScreen() {
  const router = useRouter();
  const { theme: C } = useMonoTheme();
  const insets = useSafeAreaInsets();
  const s = useMemo(() => createStyles(C), [C]);
  const bottomSpace = getBottomNavSpace(insets.bottom);
  const topPadding = getScreenTopPadding(insets.top);
  const [sessions, setSessions] = useState<StudySession[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadStudySessions().then(setSessions);
    }, []),
  );

  const stats = useMemo(() => {
    const todayKey = toDateKey(new Date());
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const todaySeconds = sessions
      .filter((item) => toDateKey(new Date(item.date)) === todayKey)
      .reduce((sum, item) => sum + item.seconds, 0);
    const weekSeconds = sessions
      .filter((item) => new Date(item.date) >= weekStart)
      .reduce((sum, item) => sum + item.seconds, 0);
    const totalSeconds = sessions.reduce((sum, item) => sum + item.seconds, 0);
    const subjectMap: Record<string, number> = {};

    for (const item of sessions) {
      subjectMap[item.subject] = (subjectMap[item.subject] ?? 0) + item.seconds;
    }

    const subjects = Object.entries(subjectMap)
      .map(([subject, seconds]) => ({ subject, seconds }))
      .sort((a, b) => b.seconds - a.seconds);

    return { todaySeconds, weekSeconds, totalSeconds, subjects };
  }, [sessions]);

  const maxSubjectSeconds = Math.max(
    ...stats.subjects.map((item) => item.seconds),
    1,
  );

  return (
    <View style={[s.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
      <View style={s.header}>
        <TouchableOpacity
          testID="statistics-back-button"
          style={s.iconButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={20} color={C.text} />
        </TouchableOpacity>
        <Text style={s.title}>통계</Text>
        <View style={s.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={[s.content, { paddingBottom: bottomSpace + 24 }]}>
        <View style={s.grid}>
          <StatCard label="오늘" value={formatStudyDuration(stats.todaySeconds)} styles={s} />
          <StatCard label="최근 7일" value={formatStudyDuration(stats.weekSeconds)} styles={s} />
          <StatCard label="전체" value={formatStudyDuration(stats.totalSeconds)} styles={s} />
          <StatCard label="세션" value={`${sessions.length}개`} styles={s} />
        </View>

        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>과목별 누적 시간</Text>
          <Text style={s.sectionMeta}>{stats.subjects.length}개 과목</Text>
        </View>
        {stats.subjects.length === 0 ? (
          <View style={s.emptyCard}>
            <Ionicons name="bar-chart-outline" size={26} color={C.muted} />
            <Text style={s.emptyTitle}>아직 통계를 만들 기록이 없어요.</Text>
            <Text style={s.emptyText}>공부를 한 번 완료하면 과목별 누적 시간이 표시됩니다.</Text>
            <TouchableOpacity
              testID="statistics-start-study-button"
              style={s.emptyButton}
              onPress={() => router.push("/subject-select")}
              activeOpacity={0.84}
            >
              <Ionicons name="play" size={14} color={C.inverse} />
              <Text style={s.emptyButtonText}>공부 시작하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          stats.subjects.map((item) => (
            <View
              key={item.subject}
              testID={`statistics-subject-row-${item.subject}`}
              style={s.subjectRow}
            >
              <View style={s.subjectHeader}>
                <Text style={s.subjectName}>{item.subject}</Text>
                <Text style={s.subjectTime}>{formatStudyDuration(item.seconds)}</Text>
              </View>
              <View style={s.barTrack}>
                <View
                  style={[
                    s.barFill,
                    { width: `${Math.max(6, (item.seconds / maxSubjectSeconds) * 100)}%` },
                  ]}
                />
              </View>
            </View>
          ))
        )}
      </ScrollView>
      <BottomNav />
    </View>
  );
}

function StatCard({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

const createStyles = (C: MonoTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 20 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 22 },
    iconButton: { width: 38, height: 38, borderWidth: 1, borderBottomWidth: 3, borderColor: C.border, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: C.surface },
    headerSpacer: { width: 38 },
    title: { color: C.text, fontSize: 24, fontWeight: "900" },
    content: { gap: 2 },
    grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: 18 },
    statCard: { width: "48%", minHeight: 94, borderWidth: 1, borderBottomWidth: 4, borderColor: C.border, borderRadius: 16, padding: 16, marginBottom: 12, backgroundColor: C.surface, justifyContent: "center" },
    statLabel: { color: C.text, fontSize: 12, fontWeight: "700", marginBottom: 8 },
    statValue: { color: C.text, fontSize: 18, fontWeight: "900" },
    sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
    sectionTitle: { color: C.text, fontSize: 15, fontWeight: "900" },
    sectionMeta: { color: C.muted, fontSize: 12, fontWeight: "800" },
    emptyCard: { alignItems: "center", borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 28, backgroundColor: C.surface },
    emptyTitle: { color: C.text, fontSize: 15, fontWeight: "900", marginTop: 10 },
    emptyText: { color: C.muted, fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 5 },
    emptyButton: { minHeight: 40, borderRadius: 12, backgroundColor: C.primary, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingHorizontal: 14, marginTop: 16 },
    emptyButtonText: { color: C.inverse, fontSize: 13, fontWeight: "900" },
    subjectRow: { borderWidth: 1, borderBottomWidth: 3, borderColor: C.border, borderRadius: 14, padding: 14, marginBottom: 12, backgroundColor: C.surface },
    subjectHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
    subjectName: { color: C.text, fontWeight: "800" },
    subjectTime: { color: C.text, fontWeight: "700" },
    barTrack: { height: 8, borderWidth: 1, borderColor: C.border, borderRadius: 999, overflow: "hidden", backgroundColor: C.surface },
    barFill: { height: "100%", backgroundColor: C.text },
  });
