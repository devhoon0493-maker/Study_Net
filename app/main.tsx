import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BottomNav, { getBottomNavSpace } from "../components/BottomNav";
import { useMonoTheme, type MonoTheme } from "../constants/mono";
import {
  DEFAULT_DDAY_GOAL,
  formatDdayCount,
  formatDdayDate,
  getDdayCount,
  loadPrimaryDdayGoal,
  type DdayGoal,
} from "../utils/dday";

const createHomeTheme = (theme: MonoTheme) => ({
  bg: theme.bg,
  surface: theme.surface,
  surfaceAlt: theme.surfaceAlt,
  surfaceElevated: theme.elevated,
  border: theme.border,
  borderSoft: theme.borderSoft,
  primary: theme.primary,
  primarySoft: theme.primarySoft,
  success: theme.success,
  successSoft: theme.successSoft,
  warning: theme.warning,
  warningSoft: theme.warningSoft,
  danger: theme.danger,
  dangerSoft: theme.dangerSoft,
  live: theme.live,
  liveSoft: theme.liveSoft,
  textPrimary: theme.text,
  textSecondary: theme.muted,
  textTertiary: theme.subtle,
  shadow: theme.shadow,
  inverse: theme.inverse,
});

type HomeTheme = ReturnType<typeof createHomeTheme>;

type StoredSession = {
  subject: string;
  seconds: number;
  date: string | number | Date;
};

type WeeklyDay = {
  key: string;
  label: string;
  seconds: number;
};

type SubjectShare = {
  subject: string;
  seconds: number;
  color: string;
};

const KEY_ACTIVE = "active_session";

const SUBJECT_COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#7C3AED"];

const toDateKey = (date: Date): string =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

const formatClock = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const formatCompactDuration = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  if (m > 0) return `${m}분`;
  return "0분";
};

const formatStatDuration = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}시간`;
  if (m > 0) return `${m}분`;
  return "0분";
};

const formatStudyDate = (date: string | number | Date) =>
  new Date(date).toLocaleDateString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const getWeekStart = (date: Date) => {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  return next;
};

interface ActiveSessionData {
  subject: string;
  startEpoch: number;
  goalSeconds: number;
}

interface SessionContextValue {
  session: ActiveSessionData | null;
  elapsed: number;
  hasActiveSession: boolean;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue>({
  session: null,
  elapsed: 0,
  hasActiveSession: false,
  refresh: async () => {},
});

function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<ActiveSessionData | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const sessionRef = useRef<ActiveSessionData | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCount = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY_ACTIVE);
      if (raw) {
        const data: ActiveSessionData = JSON.parse(raw);
        sessionRef.current = data;
        setSession(data);
        setElapsed(Math.floor((Date.now() - data.startEpoch) / 1000));
      } else {
        sessionRef.current = null;
        setSession(null);
        setElapsed(0);
      }
    } catch {}
  }, []);

  useEffect(() => {
    refresh();

    tickRef.current = setInterval(() => {
      if (sessionRef.current) {
        setElapsed(Math.floor((Date.now() - sessionRef.current.startEpoch) / 1000));
      }

      pollCount.current += 1;
      if (pollCount.current % 5 === 0) {
        refresh();
      }
    }, 1000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [refresh]);

  const value = useMemo(
    () => ({ session, elapsed, hasActiveSession: !!session, refresh }),
    [elapsed, refresh, session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function ActiveSessionBanner({ bottomOffset }: { bottomOffset: number }) {
  const router = useRouter();
  const { theme } = useMonoTheme();
  const C = useMemo(() => createHomeTheme(theme), [theme]);
  const bs = useMemo(() => createBannerStyles(C), [C]);
  const { session, elapsed } = useContext(SessionContext);
  const slideAnim = useRef(new Animated.Value(100)).current;
  const isActive = !!session;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isActive ? 0 : 100,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start();
  }, [isActive, slideAnim]);

  if (!session) return null;

  const percent = Math.min(Math.round((elapsed / session.goalSeconds) * 100), 100);

  return (
    <Animated.View style={[bs.banner, { bottom: bottomOffset, transform: [{ translateY: slideAnim }] }]}>
      <View style={bs.progressTrack}>
        <View style={[bs.progressFill, { width: `${percent}%` }]} />
      </View>
      <View style={bs.inner}>
        <View style={bs.left}>
          <View style={bs.liveDot} />
          <View>
            <Text style={bs.subject}>{session.subject}</Text>
            <Text style={bs.time}>{formatClock(elapsed)}</Text>
          </View>
        </View>
        <View style={bs.right}>
          <Text style={bs.percent}>{percent}%</Text>
          <TouchableOpacity
            style={bs.resumeBtn}
            activeOpacity={0.82}
            onPress={() =>
              router.push({
                pathname: "/study",
                params: { subject: session.subject },
              })
            }
          >
            <Ionicons name="play" size={11} color={C.primary} style={{ marginRight: 4 }} />
            <Text style={bs.resumeText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

function ProgressRing({
  percent,
  todaySeconds,
  dailyGoal,
  C,
}: {
  percent: number;
  todaySeconds: number;
  dailyGoal: number;
  C: HomeTheme;
}) {
  const radius = 51;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(percent, 0), 1);

  return (
    <View style={stylesStatic.ringBox}>
      <Svg width={136} height={136} viewBox="0 0 136 136">
        <Circle cx="68" cy="68" r={radius} stroke={C.borderSoft} strokeWidth={8} fill="none" />
        <Circle
          cx="68"
          cy="68"
          r={radius}
          stroke={progress >= 1 ? C.success : C.primary}
          strokeWidth={8}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          strokeLinecap="round"
          rotation="-90"
          origin="68, 68"
        />
      </Svg>
      <View style={stylesStatic.ringCenter}>
        <Text style={[stylesStatic.ringLabel, { color: C.textSecondary }]}>오늘 공부 시간</Text>
        <Text style={[stylesStatic.ringValue, { color: C.textPrimary }]}>{formatClock(todaySeconds).slice(0, 5)}</Text>
        <Text style={[stylesStatic.ringGoal, { color: C.textSecondary }]}>/ {formatCompactDuration(dailyGoal)}</Text>
      </View>
    </View>
  );
}

function SubjectDonut({
  items,
  total,
  C,
}: {
  items: SubjectShare[];
  total: number;
  C: HomeTheme;
}) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <View style={stylesStatic.donutBox}>
      <Svg width={92} height={92} viewBox="0 0 92 92">
        <Circle cx="46" cy="46" r={radius} stroke={C.surfaceAlt} strokeWidth={11} fill="none" />
        {items.length === 0 ? null : items.map((item) => {
          const share = item.seconds / Math.max(total, 1);
          const dashOffset = -offset * circumference;
          offset += share;

          return (
            <Circle
              key={item.subject}
              cx="46"
              cy="46"
              r={radius}
              stroke={item.color}
              strokeWidth={11}
              fill="none"
              strokeDasharray={`${share * circumference} ${circumference}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              rotation="-90"
              origin="46, 46"
            />
          );
        })}
      </Svg>
      <View style={stylesStatic.donutCenter}>
        <Text style={[stylesStatic.donutValue, { color: C.textPrimary }]}>{Math.round(total / 3600)}</Text>
        <Text style={[stylesStatic.donutLabel, { color: C.textSecondary }]}>시간</Text>
      </View>
    </View>
  );
}

function MainScreenInner() {
  const router = useRouter();
  const { added } = useLocalSearchParams();
  const { theme } = useMonoTheme();
  const insets = useSafeAreaInsets();
  const C = useMemo(() => createHomeTheme(theme), [theme]);
  const styles = useMemo(() => createStyles(C), [C]);
  const bottomSpace = getBottomNavSpace(insets.bottom);

  const {
    session: activeSession,
    elapsed: liveExtra,
    hasActiveSession,
    refresh: refreshSession,
  } = useContext(SessionContext);

  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [savedSeconds, setSavedSeconds] = useState(0);
  const [streak, setStreak] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(60 * 60 * 3);
  const [ddayGoal, setDdayGoal] = useState<DdayGoal>(DEFAULT_DDAY_GOAL);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setLoadError(null);

      const savedGoal = await AsyncStorage.getItem("daily_goal_seconds");
      if (savedGoal) setDailyGoal(Number(savedGoal));

      setDdayGoal(await loadPrimaryDdayGoal());

      const raw = await AsyncStorage.getItem("study_sessions");
      const list: StoredSession[] = raw ? JSON.parse(raw) : [];
      const validList = list.filter((item) => item && item.subject);
      setSessions(validList);

      const todayKey = toDateKey(new Date());
      const todaySum = validList
        .filter((item) => toDateKey(new Date(item.date)) === todayKey)
        .reduce((sum, item) => sum + item.seconds, 0);
      setSavedSeconds(todaySum);

      const uniqueDays = Array.from(new Set(validList.map((item) => toDateKey(new Date(item.date)))))
        .sort()
        .reverse();

      let count = 0;
      const cursor = new Date();
      for (const day of uniqueDays) {
        if (day === toDateKey(cursor)) {
          count++;
          cursor.setDate(cursor.getDate() - 1);
        } else {
          break;
        }
      }
      setStreak(count);
    } catch (error) {
      console.error("데이터 로드 실패", error);
      setLoadError("데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSessions();
      refreshSession();
    }, [loadSessions, refreshSession]),
  );

  useEffect(() => {
    loadSessions();
    refreshSession();
  }, [added, loadSessions, refreshSession]);

  const todaySeconds = savedSeconds + liveExtra;
  const percent = Math.min(todaySeconds / dailyGoal, 1);
  const totalSeconds = sessions.reduce((sum, item) => sum + item.seconds, 0);

  const byDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of sessions) {
      const key = toDateKey(new Date(item.date));
      map[key] = (map[key] ?? 0) + item.seconds;
    }
    return map;
  }, [sessions]);

  const goalDays = Object.values(byDate).filter((seconds) => seconds >= dailyGoal).length;

  const recentSessions = useMemo(
    () => [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3),
    [sessions],
  );

  const weeklyStats = useMemo<WeeklyDay[]>(() => {
    const labels = ["월", "화", "수", "목", "금", "토", "일"];
    const start = getWeekStart(new Date());

    return labels.map((label, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = toDateKey(date);
      return {
        key,
        label,
        seconds: byDate[key] ?? 0,
      };
    });
  }, [byDate]);

  const weeklyMax = Math.max(...weeklyStats.map((item) => item.seconds), 1);

  const subjectShares = useMemo<SubjectShare[]>(() => {
    const map: Record<string, number> = {};
    for (const item of sessions) {
      map[item.subject] = (map[item.subject] ?? 0) + item.seconds;
    }

    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([subject, seconds], index) => ({
        subject,
        seconds,
        color: SUBJECT_COLORS[index % SUBJECT_COLORS.length],
      }));
  }, [sessions]);

  const subjectTotal = subjectShares.reduce((sum, item) => sum + item.seconds, 0);

  const goalLabel = formatCompactDuration(dailyGoal);
  const ddayLeft = getDdayCount(ddayGoal.targetDate);
  const ddayText = formatDdayCount(ddayLeft);
  const ddayDate = formatDdayDate(ddayGoal.targetDate);
  const notificationCount = 3;

  const goStudy = () => {
    if (activeSession) {
      router.push({
        pathname: "/study",
        params: { subject: activeSession.subject },
      });
      return;
    }

    router.push("/subject-select");
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={C.bg} />

      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <Ionicons name="book-outline" size={34} color={C.primary} />
          </View>
          <View>
            <Text style={styles.appName}>StudyNet</Text>
            <Text style={styles.headerSub}>오늘도 성장하는 하루 되세요! 💪</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.notificationButton} onPress={() => router.push("/setting")} activeOpacity={0.82}>
          <Ionicons name="notifications-outline" size={20} color={C.textPrimary} />
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>{notificationCount}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomSpace + (hasActiveSession ? 120 : 34) },
        ]}
      >
        {loadError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={15} color={C.danger} />
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        ) : null}

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroEyebrow}>오늘의 목표</Text>

              <TouchableOpacity
                style={styles.ddayEditorial}
                onPress={() => router.push("/setting/goals")}
                activeOpacity={0.82}
              >
                <Text style={styles.ddayKicker}>{ddayGoal.title}까지</Text>
                <View style={styles.ddayLine}>
                  <Text style={styles.ddayBig}>{ddayText}</Text>
                  <View style={styles.ddayDateRow}>
                    <Text style={styles.ddayDate}>{ddayDate}</Text>
                    <Ionicons name="create-outline" size={12} color={C.textTertiary} />
                  </View>
                </View>
              </TouchableOpacity>

              <View style={styles.goalInline}>
                <Ionicons name="time-outline" size={13} color={C.primary} />
                <Text style={styles.goalInlineText}>오늘 목표 {goalLabel}</Text>
              </View>

              <View style={styles.heroProgressRow}>
                <View style={styles.heroProgressTrack}>
                  <View style={[styles.heroProgressFill, { width: `${percent * 100}%` }]} />
                </View>
                <Text style={styles.heroProgressText}>{Math.round(percent * 100)}%</Text>
              </View>

              <TouchableOpacity style={styles.heroButton} onPress={goStudy} activeOpacity={0.86}>
                <Text style={styles.heroButtonText}>공부 시작하기</Text>
                <View style={styles.heroButtonIcon}>
                  <Ionicons name="play" size={14} color={C.primary} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.heroVisual}>
              <ProgressRing percent={percent} todaySeconds={todaySeconds} dailyGoal={dailyGoal} C={C} />
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={15} color={C.live} />
                <Text style={styles.streakBadgeText}>연속 {streak}일째!</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.statGrid}>
          <StatCard icon="time-outline" label="총 공부 시간" value={formatStatDuration(totalSeconds)} hint="누적" tone="primary" styles={styles} C={C} />
          <StatCard icon="checkmark-circle-outline" label="완료한 목표" value={`${goalDays}개`} hint="목표 달성" tone="success" styles={styles} C={C} />
          <StatCard icon="trophy-outline" label="집중 세션" value={`${sessions.length}회`} hint="세션" tone="warning" styles={styles} C={C} />
          <StatCard
            icon="analytics-outline"
            label="목표 달성률"
            value={`${Math.round(percent * 100)}%`}
            hint={`목표 ${goalLabel}`}
            tone="success"
            progress={percent}
            styles={styles}
            C={C}
          />
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>최근 공부 기록</Text>
            <TouchableOpacity onPress={() => router.push("/calendar")} activeOpacity={0.78}>
              <Text style={styles.sectionLink}>전체 보기 〉</Text>
            </TouchableOpacity>
          </View>

          {recentSessions.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Ionicons name="book-outline" size={24} color={C.textTertiary} />
              <Text style={styles.emptyTitle}>아직 공부 기록이 없어요.</Text>
              <Text style={styles.emptyText}>공부를 시작하면 최근 기록이 여기에 표시돼요.</Text>
            </View>
          ) : (
            recentSessions.map((session, index) => (
              <View key={`${session.date}-${index}`} style={[styles.recentRow, index > 0 && styles.recentRowBorder]}>
                <View style={[styles.recentIcon, { backgroundColor: `${SUBJECT_COLORS[index % SUBJECT_COLORS.length]}18` }]}>
                  <Ionicons name="book-outline" size={17} color={SUBJECT_COLORS[index % SUBJECT_COLORS.length]} />
                </View>
                <View style={styles.recentBody}>
                  <Text style={styles.recentSubject} numberOfLines={1}>{session.subject}</Text>
                  <Text style={styles.recentDate}>{session.subject}</Text>
                </View>
                <View style={styles.recentRight}>
                  <Text style={styles.recentDuration}>{formatCompactDuration(session.seconds)}</Text>
                  <Text style={styles.recentTime} numberOfLines={1}>{formatStudyDate(session.date)}</Text>
                </View>
                <Ionicons name="checkmark-circle" size={21} color={C.success} style={styles.recentCheck} />
              </View>
            ))
          )}
        </View>

        <View style={styles.weeklyCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>이번 주 통계</Text>
          </View>

          <View style={styles.weeklyBody}>
            <View style={styles.weeklyPanel}>
              <Text style={styles.chartTitle}>일별 공부 시간 (시간)</Text>
              <View style={styles.barChart}>
              {weeklyStats.map((item) => {
                const ratio = item.seconds / weeklyMax;
                const isMax = item.seconds > 0 && item.seconds === weeklyMax;
                return (
                  <View key={item.key} style={styles.barItem}>
                    <Text style={styles.barValue}>{item.seconds > 0 && ratio > 0.28 ? (item.seconds / 3600).toFixed(1) : ""}</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          !isMax && styles.barFillMuted,
                          { height: `${Math.max(ratio * 100, item.seconds > 0 ? 10 : 0)}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.barLabel}>{item.label}</Text>
                  </View>
                );
              })}
              </View>
            </View>

            <View style={styles.weeklyPanel}>
              <Text style={styles.chartTitle}>과목별 비중 (시간)</Text>
              <View style={styles.subjectPanel}>
              <SubjectDonut items={subjectShares} total={subjectTotal} C={C} />
              <View style={styles.subjectLegend}>
                {subjectShares.length === 0 ? (
                  <Text style={styles.subjectEmpty}>과목 기록 없음</Text>
                ) : (
                  subjectShares.slice(0, 4).map((item) => (
                    <View key={item.subject} style={styles.legendRow}>
                      <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                      <Text style={styles.legendText} numberOfLines={1}>{item.subject}</Text>
                      <Text style={styles.legendPercent}>
                        {Math.round((item.seconds / Math.max(subjectTotal, 1)) * 100)}%
                      </Text>
                    </View>
                  ))
                )}
              </View>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <ActiveSessionBanner bottomOffset={bottomSpace + 14} />
      <BottomNav />
    </View>
  );
}

function StatCard({
  icon,
  label,
  value,
  hint,
  tone,
  progress,
  styles,
  C,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  hint: string;
  tone: "primary" | "success" | "warning" | "live";
  progress?: number;
  styles: ReturnType<typeof createStyles>;
  C: HomeTheme;
}) {
  const colorMap = {
    primary: [C.primary, C.primarySoft],
    success: [C.success, C.successSoft],
    warning: [C.warning, C.warningSoft],
    live: [C.live, C.liveSoft],
  } as const;
  const [color, bg] = colorMap[tone];

  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={[styles.statHint, { color }]}>{hint}</Text>
      {typeof progress === "number" ? (
        <View style={styles.statProgressTrack}>
          <View style={[styles.statProgressFill, { width: `${Math.min(Math.max(progress, 0), 1) * 100}%` }]} />
        </View>
      ) : null}
    </View>
  );
}

export default function MainScreen() {
  return (
    <SessionProvider>
      <MainScreenInner />
    </SessionProvider>
  );
}

const createBannerStyles = (C: HomeTheme) => StyleSheet.create({
  banner: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: C.surfaceElevated,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 10,
  },
  progressTrack: {
    height: 2,
    backgroundColor: C.border,
  },
  progressFill: {
    height: "100%",
    backgroundColor: C.primary,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: C.live,
  },
  subject: {
    color: C.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  time: {
    color: C.textTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  percent: {
    color: C.primary,
    fontWeight: "800",
  },
  resumeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  resumeText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: "800",
  },
});

const createStyles = (C: HomeTheme) => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingTop: 44,
    paddingHorizontal: 22,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  logoMark: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    color: C.primary,
    fontSize: 25,
    fontWeight: "900",
  },
  headerSub: {
    color: C.textSecondary,
    fontSize: 11,
    marginTop: 2,
    fontWeight: "700",
  },
  notificationButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: C.surface,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: C.shadow,
    shadowOpacity: 0.09,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: 1,
    minWidth: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: C.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  notificationBadgeText: {
    color: C.inverse,
    fontSize: 10,
    fontWeight: "900",
  },
  scrollContent: {
    paddingHorizontal: 18,
    gap: 11,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.dangerSoft,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  errorText: {
    color: C.danger,
    fontSize: 12,
    flex: 1,
    fontWeight: "700",
  },
  heroCard: {
    borderRadius: 28,
    paddingHorizontal: 15,
    paddingVertical: 16,
    backgroundColor: C.primarySoft,
    borderWidth: 1,
    borderColor: C.primarySoft,
    shadowColor: C.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  heroCopy: {
    flex: 1,
    minWidth: 0,
    paddingLeft: 2,
  },
  heroEyebrow: {
    color: C.primary,
    fontSize: 12,
    fontWeight: "900",
    alignSelf: "flex-start",
    backgroundColor: C.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ddayEditorial: {
    marginTop: 13,
    paddingBottom: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.borderSoft,
  },
  ddayKicker: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "700",
  },
  ddayLine: {
    marginTop: 2,
  },
  ddayBig: {
    color: C.primary,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  ddayDate: {
    color: C.textTertiary,
    fontSize: 11,
    fontWeight: "700",
  },
  ddayDateRow: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
  },
  goalInline: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.surface,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 12,
  },
  goalInlineText: {
    color: C.textPrimary,
    fontSize: 12,
    fontWeight: "700",
  },
  heroProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 13,
  },
  heroProgressTrack: {
    flex: 1,
    height: 8,
    borderRadius: 999,
    backgroundColor: C.surfaceAlt,
    overflow: "hidden",
  },
  heroProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: C.primary,
  },
  heroProgressText: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  heroButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: C.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingLeft: 15,
    paddingRight: 7,
    marginTop: 16,
    shadowColor: C.primary,
    shadowOpacity: 0.14,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  heroButtonText: {
    color: C.inverse,
    fontSize: 13,
    fontWeight: "900",
  },
  heroButtonIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.inverse,
    alignItems: "center",
    justifyContent: "center",
  },
  heroVisual: {
    width: 142,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
  },
  streakBadge: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.surface,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    shadowColor: C.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  streakBadgeText: {
    color: C.primary,
    fontSize: 11,
    fontWeight: "900",
  },
  statGrid: {
    flexDirection: "row",
    gap: 6,
  },
  statCard: {
    flex: 1,
    minHeight: 132,
    borderRadius: 17,
    backgroundColor: C.surface,
    padding: 9,
    gap: 5,
    shadowColor: C.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    color: C.textPrimary,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
  },
  statLabel: {
    color: C.textSecondary,
    fontSize: 8,
    fontWeight: "800",
  },
  statHint: {
    fontSize: 9,
    fontWeight: "900",
  },
  statProgressTrack: {
    height: 7,
    borderRadius: 999,
    backgroundColor: C.surfaceAlt,
    overflow: "hidden",
  },
  statProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: C.success,
  },
  card: {
    borderRadius: 22,
    backgroundColor: C.surface,
    padding: 15,
    shadowColor: C.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  weeklyCard: {
    borderRadius: 22,
    backgroundColor: C.surface,
    padding: 15,
    shadowColor: C.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 10,
  },
  sectionTitle: {
    color: C.textPrimary,
    fontSize: 17,
    fontWeight: "900",
  },
  sectionLink: {
    color: C.textSecondary,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  emptyBlock: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
    backgroundColor: C.surfaceAlt,
    borderRadius: 16,
  },
  emptyTitle: {
    color: C.textPrimary,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 9,
  },
  emptyText: {
    color: C.textTertiary,
    fontSize: 12,
    marginTop: 4,
  },
  recentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    gap: 10,
  },
  recentRowBorder: {
    borderTopWidth: 1,
    borderTopColor: C.borderSoft,
  },
  recentIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  recentBody: {
    flex: 1,
    minWidth: 0,
  },
  recentSubject: {
    color: C.textPrimary,
    fontSize: 14,
    fontWeight: "900",
  },
  recentDate: {
    color: C.textTertiary,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  recentDuration: {
    color: C.primary,
    fontSize: 12,
    fontWeight: "900",
  },
  recentRight: {
    alignItems: "flex-end",
    gap: 2,
    minWidth: 72,
  },
  recentTime: {
    color: C.textTertiary,
    fontSize: 10,
    fontWeight: "700",
  },
  recentCheck: {
    marginLeft: 2,
  },
  weeklyBody: {
    flexDirection: "row",
    gap: 10,
  },
  weeklyPanel: {
    flex: 1,
    backgroundColor: C.surfaceAlt,
    borderRadius: 16,
    padding: 9,
  },
  chartTitle: {
    color: C.textSecondary,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 10,
  },
  barChart: {
    minHeight: 136,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  barItem: {
    alignItems: "center",
    flex: 1,
    gap: 6,
  },
  barValue: {
    minHeight: 10,
    color: C.textSecondary,
    fontSize: 8,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  barTrack: {
    width: 13,
    height: 88,
    borderRadius: 6,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  barFill: {
    width: "100%",
    borderRadius: 999,
    backgroundColor: C.primary,
  },
  barFillMuted: {
    backgroundColor: C.primarySoft,
  },
  barLabel: {
    color: C.textTertiary,
    fontSize: 10,
    fontWeight: "900",
  },
  subjectPanel: {
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  subjectLegend: {
    flex: 1,
    gap: 4,
  },
  subjectEmpty: {
    color: C.textTertiary,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendText: {
    color: C.textSecondary,
    fontSize: 9,
    fontWeight: "800",
    flex: 1,
  },
  legendPercent: {
    color: C.textPrimary,
    fontSize: 9,
    fontWeight: "900",
  },
});

const stylesStatic = StyleSheet.create({
  ringBox: {
    width: 136,
    height: 136,
    alignItems: "center",
    justifyContent: "center",
  },
  ringCenter: {
    position: "absolute",
    alignItems: "center",
  },
  ringValue: {
    fontSize: 27,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  ringLabel: {
    fontSize: 8,
    fontWeight: "800",
    marginBottom: 3,
  },
  ringGoal: {
    fontSize: 10,
    fontWeight: "800",
    marginTop: 2,
  },
  donutBox: {
    width: 82,
    height: 82,
    alignItems: "center",
    justifyContent: "center",
  },
  donutCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  donutValue: {
    fontSize: 15,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  donutLabel: {
    fontSize: 9,
    fontWeight: "800",
  },
});
