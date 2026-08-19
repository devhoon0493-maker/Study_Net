import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StatusBar,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import BottomNav, { getBottomNavSpace } from "../components/BottomNav";
import { getScreenTopPadding } from "../constants/layout";
import { useMonoTheme } from "../constants/mono";
import {
  ActiveSessionBanner,
  HomeHeader,
  HomeHeroCard,
  HomeStatGrid,
  RecentStudyCard,
  WeeklyStatsCard,
} from "../features/home/components";
import { SessionContext, SessionProvider } from "../features/home/HomeSessionContext";
import { createStyles } from "../features/home/homeStyles";
import { createHomeTheme } from "../features/home/homeTheme";
import type { StoredSession, SubjectShare, WeeklyDay } from "../features/home/homeTypes";
import {
  SUBJECT_COLORS,
  formatCompactDuration,
  getWeekStart,
  toDateKey,
} from "../features/home/homeUtils";
import {
  DEFAULT_DDAY_GOAL,
  formatDdayCount,
  formatDdayDate,
  getDdayCount,
  loadPrimaryDdayGoal,
  type DdayGoal,
} from "../utils/dday";
import { auth } from "../utils/firebaseConfig";
import {
  buildCommunityNotifications,
  countUnreadCommunityNotifications,
  loadCommunityNotificationsReadAt,
  type CommunityNotificationSources,
  subscribeCommunityNotificationSources,
} from "../utils/communityNotifications";

function MainScreenInner() {
  const router = useRouter();
  const { added } = useLocalSearchParams();
  const { theme } = useMonoTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const C = useMemo(() => createHomeTheme(theme), [theme]);
  const styles = useMemo(() => createStyles(C, { compact: width < 700 }), [C, width]);
  const bottomSpace = getBottomNavSpace(insets.bottom);
  const topPadding = getScreenTopPadding(insets.top);

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
  const [notificationCount, setNotificationCount] = useState(0);
  const uid = auth.currentUser?.uid;

  const loadSessions = useCallback(async () => {
    try {
      setLoadError(null);

      const savedGoal = Number(await AsyncStorage.getItem("daily_goal_seconds"));
      if (Number.isFinite(savedGoal) && savedGoal > 0) {
        setDailyGoal(savedGoal);
      }

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

      const uniqueDays = Array.from(
        new Set(validList.map((item) => toDateKey(new Date(item.date)))),
      )
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

  useFocusEffect(
    useCallback(() => {
      if (!uid) {
        setNotificationCount(0);
        return;
      }

      let readAt = 0;
      let active = true;
      let lastSources: CommunityNotificationSources = {
        posts: null,
        cheers: null,
        comments: null,
        users: null,
      };

      const sync = () => {
        if (!active) return;
        const notifications = buildCommunityNotifications({
          ...lastSources,
          uid,
        });
        setNotificationCount(countUnreadCommunityNotifications(notifications, readAt));
      };

      const unsubscribe = subscribeCommunityNotificationSources(uid, (sources) => {
        lastSources = sources;
        sync();
      });

      loadCommunityNotificationsReadAt(uid).then((value) => {
        readAt = value;
        sync();
      });

      return () => {
        active = false;
        unsubscribe();
      };
    }, [uid]),
  );

  const safeDailyGoal = Math.max(dailyGoal, 1);
  const todaySeconds = savedSeconds + liveExtra;
  const percent = Math.min(todaySeconds / safeDailyGoal, 1);
  const totalSeconds = sessions.reduce((sum, item) => sum + item.seconds, 0);

  const byDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const item of sessions) {
      const key = toDateKey(new Date(item.date));
      map[key] = (map[key] ?? 0) + item.seconds;
    }
    return map;
  }, [sessions]);

  const goalDays = Object.values(byDate).filter((seconds) => seconds >= safeDailyGoal).length;

  const recentSessions = useMemo(
    () =>
      [...sessions]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3),
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

  const goalLabel = formatCompactDuration(safeDailyGoal);
  const ddayLeft = getDdayCount(ddayGoal.targetDate);
  const ddayText = formatDdayCount(ddayLeft);
  const ddayDate = formatDdayDate(ddayGoal.targetDate);
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

      <HomeHeader
        notificationCount={notificationCount}
        styles={styles}
        C={C}
        topPadding={topPadding}
        onOpenNotifications={() => router.push("/notifications")}
        onOpenSettings={() => router.push("/setting")}
      />

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

        <HomeHeroCard
          ddayGoal={ddayGoal}
          ddayText={ddayText}
          ddayDate={ddayDate}
          goalLabel={goalLabel}
          percent={percent}
          todaySeconds={todaySeconds}
          dailyGoal={safeDailyGoal}
          streak={streak}
          isStudying={hasActiveSession}
          styles={styles}
          C={C}
          onOpenGoals={() => router.push("/setting/goals")}
          onStartStudy={goStudy}
        />

        <HomeStatGrid
          totalSeconds={totalSeconds}
          goalDays={goalDays}
          sessionCount={sessions.length}
          percent={percent}
          goalLabel={goalLabel}
          styles={styles}
          C={C}
        />

        <RecentStudyCard
          sessions={recentSessions}
          styles={styles}
          C={C}
          onOpenCalendar={() => router.push("/calendar")}
        />

        <WeeklyStatsCard
          weeklyStats={weeklyStats}
          weeklyMax={weeklyMax}
          subjectShares={subjectShares}
          subjectTotal={subjectTotal}
          styles={styles}
          C={C}
        />
      </ScrollView>

      <ActiveSessionBanner bottomOffset={bottomSpace + 14} />
      <BottomNav />
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
