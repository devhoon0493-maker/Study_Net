import { CONTROL, RADIUS, SPACE, TYPE_FAMILY, TYPE_SIZE, TYPE_WEIGHT } from "../../../constants/designTokens";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  AppState,
  AppStateStatus,
  Easing,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, RadialGradient, Stop } from "react-native-svg";

import {
  getScreenBottomPadding,
  getScreenTopPadding,
} from "../../../constants/layout";
import { useMonoTheme, type MonoTheme } from "../../../constants/mono";
import { syncCurrentMemberToJoinedRooms } from "../../group/groupPresence";

const MAX_WIDTH = 520;
const KEY_ACTIVE = "active_session";
const KEY_SESSIONS = "study_sessions";
const KEY_DAILY_GOAL = "daily_goal_seconds";
const SUBJECT_COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#7C3AED"];

type StoredStudySession = {
  subject: string;
  seconds: number;
  date: string | number | Date;
};

type SubjectStat = {
  subject: string;
  seconds: number;
  color: string;
  isCurrent: boolean;
};

const createStudyTheme = (theme: MonoTheme) => ({
  bg: theme.bg,
  surface: theme.surface,
  surfaceAlt: theme.surfaceAlt,
  elevated: theme.elevated,
  border: theme.border,
  borderSoft: theme.borderSoft,
  primary: theme.primary,
  primarySoft: theme.primarySoft,
  success: theme.success,
  successSoft: theme.successSoft,
  warning: theme.warning,
  warningSoft: theme.warningSoft,
  live: theme.live,
  liveSoft: theme.liveSoft,
  textPrimary: theme.text,
  textSecondary: theme.muted,
  textTertiary: theme.subtle,
  inverse: theme.inverse,
  shadow: theme.shadow,
  statusBar: theme.statusBar,
});

type StudyTheme = ReturnType<typeof createStudyTheme>;

type StudyLayout = {
  compact: boolean;
  ringSize: number;
  ringCenter: number;
  ringRadius: number;
  circumference: number;
};

const withAlpha = (color: string, alpha: string) => {
  if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
    const [, r, g, b] = color;
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }

  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return `${color}${alpha}`;

  return color;
};

const toDateKey = (date: Date) =>
  [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");

export default function StudyTimer() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { theme } = useMonoTheme();
  const C = useMemo(() => createStudyTheme(theme), [theme]);
  const layout = useMemo<StudyLayout>(() => {
    const compact = width < 370;
    const contentWidth = Math.min(Math.max(width - 40, 284), MAX_WIDTH);
    const ringSize = Math.min(Math.max(contentWidth - (compact ? 36 : 24), 236), 318);
    const ringCenter = ringSize / 2;
    const ringRadius = ringSize / 2 - (compact ? 14 : 16);

    return {
      compact,
      ringSize,
      ringCenter,
      ringRadius,
      circumference: 2 * Math.PI * ringRadius,
    };
  }, [width]);
  const styles = useMemo(() => createStyles(C, layout), [C, layout]);
  const topPadding = getScreenTopPadding(insets.top);
  const bottomPadding = getScreenBottomPadding(insets.bottom);

  const subject =
    typeof params.subject === "string"
      ? params.subject
      : Array.isArray(params.subject)
        ? params.subject[0]
        : "자유 공부";

  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const [isFlipped, setIsFlipped] = useState(false);
  const [subjectStats, setSubjectStats] = useState<SubjectStat[]>([]);
  const [todayTotal, setTodayTotal] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [goalSeconds, setGoalSeconds] = useState(60 * 60 * 3);
  const [isGoalModalVisible, setGoalModalVisible] = useState(false);
  const [tempGoalH, setTempGoalH] = useState(3);
  const [tempGoalM, setTempGoalM] = useState(0);
  const [initializedSubject, setInitializedSubject] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const savedSecondsRef = useRef(0);
  const secondsRef = useRef(0);
  const lastGroupSyncRef = useRef(0);
  const flipAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  useEffect(() => {
    setInitializedSubject(null);
    startTimeRef.current = null;
    savedSecondsRef.current = 0;
    setSeconds(0);
    setRunning(true);
    setIsFlipped(false);

    const init = async () => {
      try {
        const savedGoal = Number(await AsyncStorage.getItem(KEY_DAILY_GOAL));
        if (Number.isFinite(savedGoal) && savedGoal > 0) {
          setGoalSeconds(savedGoal);
        }

        const raw = await AsyncStorage.getItem(KEY_ACTIVE);
        if (raw) {
          const session = JSON.parse(raw);
          if (session.subject === subject) {
            const elapsed =
              session.running === false
                ? Math.max(0, Math.floor(session.savedSeconds ?? 0))
                : session.startEpoch
                  ? Math.floor((Date.now() - session.startEpoch) / 1000)
                  : Math.max(0, Math.floor(session.savedSeconds ?? 0));
            savedSecondsRef.current = elapsed;
            setSeconds(elapsed);
            setRunning(session.running !== false);
            startTimeRef.current = session.running === false ? null : session.startEpoch;
          }
        }
      } catch (error) {
        console.error("공부 세션 초기화 실패", error);
      }
    };

    init().finally(() => setInitializedSubject(subject));
  }, [subject]);

  useEffect(() => {
    if (initializedSubject !== subject) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (running) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now() - savedSecondsRef.current * 1000;
      }

      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    } else {
      savedSecondsRef.current = secondsRef.current;
      startTimeRef.current = null;
      AsyncStorage.setItem(
        KEY_ACTIVE,
        JSON.stringify({
          subject,
          savedSeconds: savedSecondsRef.current,
          goalSeconds,
          running: false,
        }),
      ).catch((error) => console.error("일시정지 세션 저장 실패", error));
      syncCurrentMemberToJoinedRooms({
        session: { status: subject, studyStartEpoch: null },
      }).catch(() => {});
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [goalSeconds, initializedSubject, running, subject]);

  useEffect(() => {
    if (initializedSubject !== subject || !running) return;

    const persistActiveSession = async () => {
      const startEpoch = startTimeRef.current ?? Date.now() - seconds * 1000;
      await AsyncStorage.setItem(
        KEY_ACTIVE,
        JSON.stringify({ subject, startEpoch, goalSeconds, running: true }),
      );

      const nowMs = Date.now();
      if (nowMs - lastGroupSyncRef.current > 10_000) {
        lastGroupSyncRef.current = nowMs;
        await syncCurrentMemberToJoinedRooms({
          session: { status: subject, studyStartEpoch: startEpoch },
        });
      }
    };

    persistActiveSession().catch((error) => console.error("세션 저장 실패", error));
  }, [goalSeconds, initializedSubject, running, seconds, subject]);

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active" && running && startTimeRef.current) {
        setSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
        syncCurrentMemberToJoinedRooms({
          online: true,
          session: { status: subject, studyStartEpoch: startTimeRef.current },
        }).catch(() => {});
        return;
      }

      if (nextState !== "active") {
        syncCurrentMemberToJoinedRooms({
          online: false,
          session: { status: subject, studyStartEpoch: startTimeRef.current },
        }).catch(() => {});
      }
    };

    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, [running, subject]);

  useEffect(() => {
    if (seconds < goalSeconds) {
      pulseAnim.setValue(1);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.06,
          duration: 720,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 720,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [goalSeconds, pulseAnim, seconds]);

  const pad = (value: number) => String(value).padStart(2, "0");
  const format = (total: number) => {
    const safe = Math.max(0, Math.floor(total));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    return { h: pad(h), m: pad(m), s: pad(s) };
  };

  const formatShort = (total: number) => {
    const safe = Math.max(0, Math.floor(total));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    if (h > 0 && m > 0) return `${h}시간 ${m}분`;
    if (h > 0) return `${h}시간`;
    if (m > 0) return `${m}분`;
    return "0분";
  };

  const percent = Math.min(seconds / Math.max(goalSeconds, 1), 1);
  const remain = Math.max(goalSeconds - seconds, 0);
  const elapsedFmt = format(seconds);
  const remainFmt = format(remain);
  const goalDone = seconds >= goalSeconds;
  const nearGoal = !goalDone && percent >= 0.85;
  const accentColor = goalDone ? C.success : nearGoal ? C.warning : C.primary;
  const strokeDashoffset = layout.circumference * (1 - percent);

  const frontRotateY = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "-180deg"],
  });
  const backRotateY = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "0deg"],
  });
  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });
  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  const loadSubjectStats = async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY_SESSIONS);
      const list: StoredStudySession[] = raw ? JSON.parse(raw) : [];
      const todayKey = toDateKey(new Date());
      const map: Record<string, number> = {};

      for (const item of list) {
        if (toDateKey(new Date(item.date)) === todayKey) {
          map[item.subject] = (map[item.subject] ?? 0) + item.seconds;
        }
      }

      map[subject] = (map[subject] ?? 0) + seconds;
      const total = Object.values(map).reduce((sum, value) => sum + value, 0);
      setTodayTotal(total);
      setSubjectStats(
        Object.entries(map)
          .sort((a, b) => b[1] - a[1])
          .map(([name, secs], index) => ({
            subject: name,
            seconds: secs,
            color: SUBJECT_COLORS[index % SUBJECT_COLORS.length],
            isCurrent: name === subject,
          })),
      );
    } catch {
      setTodayTotal(seconds);
      setSubjectStats([{ subject, seconds, color: SUBJECT_COLORS[0], isCurrent: true }]);
    }
  };

  const handleRingPress = async () => {
    if (isAnimating) return;
    setIsAnimating(true);
    if (!isFlipped) await loadSubjectStats();

    Animated.timing(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      duration: 520,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsFlipped((value) => !value);
      setIsAnimating(false);
    });
  };

  const minimizeStudy = async () => {
    try {
      const startEpoch = startTimeRef.current ?? Date.now() - seconds * 1000;
      const activeSession = running
        ? { subject, startEpoch, goalSeconds, running: true }
        : { subject, savedSeconds: seconds, goalSeconds, running: false };
      await AsyncStorage.setItem(KEY_ACTIVE, JSON.stringify(activeSession));
      router.replace({ pathname: "/main", params: { added: Date.now() } });
      syncCurrentMemberToJoinedRooms({
        session: { status: subject, studyStartEpoch: running ? startEpoch : null },
      }).catch((error) => {
        console.warn("Study presence sync failed after minimizing:", error);
      });
    } catch (error) {
      console.error("세션 최소화 실패", error);
    }
  };

  const finishStudy = () => {
    const discardSession = async () => {
      if (timerRef.current) clearInterval(timerRef.current);
      await AsyncStorage.removeItem(KEY_ACTIVE);
      await syncCurrentMemberToJoinedRooms({
        session: { status: "접속중", studyStartEpoch: null },
      });
      router.replace({ pathname: "/main", params: { added: Date.now() } });
    };

    if (seconds <= 0) {
      Alert.alert("세션 종료", "아직 기록할 공부 시간이 없어요. 기록 없이 나갈까요?", [
        { text: "계속하기", style: "cancel" },
        {
          text: "나가기",
          style: "destructive",
          onPress: discardSession,
        },
      ]);
      return;
    }

    Alert.alert("세션 종료", "현재 공부를 종료할까요?", [
      { text: "계속하기", style: "cancel" },
      {
        text: "종료",
        style: "destructive",
        onPress: async () => {
          if (timerRef.current) clearInterval(timerRef.current);
          await AsyncStorage.removeItem(KEY_ACTIVE);
          await syncCurrentMemberToJoinedRooms({
            session: { status: "접속중", studyStartEpoch: null },
          });

          const raw = await AsyncStorage.getItem(KEY_SESSIONS);
          const list: StoredStudySession[] = raw ? JSON.parse(raw) : [];
          list.push({ seconds, subject, date: new Date().toISOString() });
          await AsyncStorage.setItem(KEY_SESSIONS, JSON.stringify(list));
          router.replace({ pathname: "/main", params: { added: Date.now() } });
        },
      },
    ]);
  };

  const openGoalModal = () => {
    const current = format(goalSeconds);
    setTempGoalH(Number(current.h));
    setTempGoalM(Number(current.m));
    setGoalModalVisible(true);
  };

  const saveNewGoal = async () => {
    const nextSeconds = tempGoalH * 3600 + tempGoalM * 60;
    if (nextSeconds === 0) {
      Alert.alert("알림", "목표 시간은 최소 1분 이상이어야 합니다.");
      return;
    }

    setGoalSeconds(nextSeconds);
    await AsyncStorage.setItem(KEY_DAILY_GOAL, String(nextSeconds));
    setGoalModalVisible(false);
  };

  const todayFmt = format(todayTotal);
  const goalPercent = Math.min(Math.round((todayTotal / Math.max(goalSeconds, 1)) * 100), 100);
  const glowSize = layout.ringSize * 1.54;
  const glowOpacity = 0.2 + percent * 0.28;

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomPadding + 24 }]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            testID="study-minimize-button"
            style={styles.iconButton}
            onPress={minimizeStudy}
            activeOpacity={0.78}
          >
            <Ionicons name="chevron-down" size={19} color={C.textSecondary} />
          </TouchableOpacity>

          <Text style={styles.headerEyebrow}>
            {isFlipped ? "TODAY'S RECORD" : "FOCUS SESSION"}
          </Text>

          <View style={[styles.statusPill, running ? styles.statusLive : styles.statusPaused]}>
            <View style={[styles.statusDot, { backgroundColor: running ? C.live : C.warning }]} />
            <Text style={[styles.statusText, { color: running ? C.live : C.warning }]}>
              {running ? "공부중" : "일시정지"}
            </Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Animated.View
            style={[
              styles.ringFace,
              { opacity: frontOpacity, transform: [{ perspective: 1400 }, { rotateY: frontRotateY }] },
            ]}
            pointerEvents={isFlipped ? "none" : "auto"}
          >
            <TouchableOpacity
              testID="study-ring-button"
              style={styles.ringTouch}
              onPress={handleRingPress}
              activeOpacity={0.96}
            >
              <View style={styles.glowLayer} pointerEvents="none">
                <Svg width={glowSize} height={glowSize}>
                  <Defs>
                    <RadialGradient id="timerGlow" cx="50%" cy="50%" r="50%">
                      <Stop offset="0%" stopColor={accentColor} stopOpacity={glowOpacity} />
                      <Stop offset="62%" stopColor={accentColor} stopOpacity={glowOpacity * 0.32} />
                      <Stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                    </RadialGradient>
                  </Defs>
                  <Circle cx={glowSize / 2} cy={glowSize / 2} r={glowSize * 0.45} fill="url(#timerGlow)" />
                </Svg>
              </View>

              <Svg width={layout.ringSize} height={layout.ringSize} style={styles.ringSvg}>
                <Circle
                  cx={layout.ringCenter}
                  cy={layout.ringCenter}
                  r={layout.ringRadius}
                  stroke={C.borderSoft}
                  strokeWidth={2.5}
                  fill="none"
                />
                <Circle
                  cx={layout.ringCenter}
                  cy={layout.ringCenter}
                  r={layout.ringRadius}
                  stroke={accentColor}
                  strokeWidth={2.5}
                  fill="none"
                  strokeDasharray={layout.circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  rotation="-90"
                  origin={`${layout.ringCenter}, ${layout.ringCenter}`}
                />
              </Svg>

              <View style={styles.ringCenter}>
                <Text style={styles.subjectEyebrow} numberOfLines={1}>
                  {subject}
                </Text>
                <View style={styles.timeDisplay}>
                  <Text style={styles.timeDigit}>{elapsedFmt.h}</Text>
                  <Text style={styles.timeSep}>:</Text>
                  <Text style={styles.timeDigit}>{elapsedFmt.m}</Text>
                  <Text style={styles.timeSep}>:</Text>
                  <Text style={styles.timeDigit}>{elapsedFmt.s}</Text>
                </View>
                {goalDone ? (
                  <Animated.View style={[styles.goalBadge, { transform: [{ scale: pulseAnim }] }]}>
                    <Ionicons name="checkmark-circle" size={13} color={C.success} />
                    <Text style={styles.goalBadgeText}>오늘 목표 달성</Text>
                  </Animated.View>
                ) : (
                  <Text style={[styles.remainText, nearGoal && { color: C.warning }]}>
                    {remainFmt.h}:{remainFmt.m}:{remainFmt.s} 남음
                  </Text>
                )}
              </View>

              <View style={styles.tapHint}>
                <Ionicons name="book-outline" size={11} color={C.textTertiary} />
                <Text style={styles.tapHintText}>탭하여 오늘 기록 보기</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            style={[
              styles.ringFace,
              { opacity: backOpacity, transform: [{ perspective: 1400 }, { rotateY: backRotateY }] },
            ]}
            pointerEvents={isFlipped ? "auto" : "none"}
          >
            <TouchableOpacity style={styles.noteCard} onPress={handleRingPress} activeOpacity={0.96}>
              <View style={styles.noteTab}>
                <Text style={styles.noteTabText}>오늘 기록</Text>
              </View>

              <View style={styles.noteSummaryRow}>
                <View style={styles.noteSummaryItem}>
                  <Text style={styles.noteSummaryLabel}>총 공부 시간</Text>
                  <Text style={styles.noteSummaryValue}>
                    {todayFmt.h}h {todayFmt.m}m
                  </Text>
                </View>
                <View style={styles.noteSummaryDivider} />
                <View style={styles.noteSummaryItem}>
                  <Text style={styles.noteSummaryLabel}>목표 달성률</Text>
                  <Text style={styles.noteSummaryValue}>{goalPercent}%</Text>
                </View>
              </View>

              <View style={styles.ruledList}>
                {subjectStats.length === 0 ? (
                  <Text style={styles.subjectStatsEmpty}>아직 오늘 기록이 없어요</Text>
                ) : (
                  subjectStats.map((item, index) => {
                    const pct = todayTotal > 0 ? Math.round((item.seconds / todayTotal) * 100) : 0;
                    const itemFmt = format(item.seconds);
                    return (
                      <View
                        key={item.subject}
                        style={[styles.ruledRow, index === 0 && styles.ruledRowFirst]}
                      >
                        <View style={styles.ruledRowHeader}>
                          <View style={styles.subjectStatNameRow}>
                            <View style={[styles.subjectDot, { backgroundColor: item.color }]} />
                            <Text style={styles.subjectStatName} numberOfLines={1}>
                              {item.subject}
                            </Text>
                            {item.isCurrent ? <View style={styles.currentDot} /> : null}
                          </View>
                          <Text style={styles.subjectStatTime}>
                            {itemFmt.h}:{itemFmt.m}:{itemFmt.s} · {pct}%
                          </Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              <View style={styles.tapHint}>
                <Ionicons name="refresh-outline" size={11} color={C.textTertiary} />
                <Text style={styles.tapHintText}>탭하여 타이머로 돌아가기</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <View style={styles.statStrip}>
          <View style={styles.statStripItem}>
            <Text style={styles.statStripLabel}>경과</Text>
            <Text style={styles.statStripValue}>
              {elapsedFmt.h}:{elapsedFmt.m}:{elapsedFmt.s}
            </Text>
          </View>
          <View style={styles.statStripDivider} />
          <TouchableOpacity
            testID="study-goal-button"
            style={styles.statStripItem}
            onPress={openGoalModal}
            activeOpacity={0.78}
          >
            <View style={styles.statStripLabelRow}>
              <Text style={styles.statStripLabel}>목표</Text>
              <Ionicons name="pencil" size={10} color={C.textTertiary} />
            </View>
            <Text style={styles.statStripValue}>{formatShort(goalSeconds)}</Text>
          </TouchableOpacity>
          <View style={styles.statStripDivider} />
          <View style={styles.statStripItem}>
            <Text style={styles.statStripLabel}>달성률</Text>
            <Text style={[styles.statStripValue, goalDone && { color: C.success }]}>
              {Math.round(percent * 100)}%
            </Text>
          </View>
        </View>

        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${percent * 100}%`, backgroundColor: accentColor },
            ]}
          />
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            testID="study-pause-toggle-button"
            style={[styles.actionButton, styles.secondaryAction, !running && styles.resumeAction]}
            onPress={() => setRunning((value) => !value)}
            activeOpacity={0.82}
          >
            <Ionicons
              name={running ? "pause" : "play"}
              size={16}
              color={running ? C.primary : C.inverse}
            />
            <Text style={[styles.secondaryActionText, !running && styles.resumeActionText]}>
              {running ? "일시정지" : "다시 시작"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            testID="study-finish-button"
            style={styles.finishAction}
            onPress={finishStudy}
            activeOpacity={0.78}
          >
            <Ionicons name="stop-outline" size={15} color={C.textTertiary} />
            <Text style={styles.finishActionText}>세션 종료</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={isGoalModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>목표 시간 설정</Text>
            <View style={styles.pickerContainer}>
              <GoalStepper
                label="시간"
                display={String(tempGoalH)}
                onMinus={() => setTempGoalH(Math.max(0, tempGoalH - 1))}
                onPlus={() => setTempGoalH(Math.min(24, tempGoalH + 1))}
                styles={styles}
                C={C}
              />
              <Text style={styles.pickerDivider}>:</Text>
              <GoalStepper
                label="분"
                display={pad(tempGoalM)}
                onMinus={() => setTempGoalM(Math.max(0, tempGoalM - 10))}
                onPlus={() => setTempGoalM(tempGoalM + 10 > 50 ? 0 : tempGoalM + 10)}
                styles={styles}
                C={C}
              />
            </View>
            <TouchableOpacity
              testID="study-goal-save-button"
              style={styles.saveBtn}
              onPress={saveNewGoal}
              activeOpacity={0.82}
            >
              <Text style={styles.saveBtnText}>저장하기</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="study-goal-cancel-button"
              style={styles.cancelBtn}
              onPress={() => setGoalModalVisible(false)}
              activeOpacity={0.78}
            >
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function GoalStepper({
  label,
  display,
  onMinus,
  onPlus,
  styles,
  C,
}: {
  label: string;
  display: string;
  onMinus: () => void;
  onPlus: () => void;
  styles: ReturnType<typeof createStyles>;
  C: StudyTheme;
}) {
  return (
    <View style={styles.pickerGroup}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <View style={styles.pickerControls}>
        <TouchableOpacity style={styles.ctrlBtn} onPress={onMinus} activeOpacity={0.78}>
          <Ionicons name="remove" size={18} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.ctrlVal}>{display}</Text>
        <TouchableOpacity style={styles.ctrlBtn} onPress={onPlus} activeOpacity={0.78}>
          <Ionicons name="add" size={18} color={C.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (C: StudyTheme, L: StudyLayout) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
      paddingHorizontal: 20,
    },
    content: {
      width: "100%",
      maxWidth: MAX_WIDTH,
      alignSelf: "center",
      gap: L.compact ? 16 : 20,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: SPACE.md,
    },
    iconButton: {
      width: CONTROL.icon,
      height: CONTROL.icon,
      borderRadius: RADIUS.md,
      alignItems: "center",
      justifyContent: "center",
    },
    headerEyebrow: {
      flex: 1,
      color: C.textTertiary,
      fontSize: TYPE_SIZE.caption,
      fontWeight: TYPE_WEIGHT.strong,
      letterSpacing: 2,
      textAlign: "center",
    },
    statusPill: {
      minWidth: 78,
      height: 32,
      borderRadius: RADIUS.pill,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 6,
      paddingHorizontal: 10,
    },
    statusLive: {
      backgroundColor: C.liveSoft,
      borderColor: withAlpha(C.live, "33"),
    },
    statusPaused: {
      backgroundColor: C.warningSoft,
      borderColor: withAlpha(C.warning, "33"),
    },
    statusDot: {
      width: 6,
      height: 6,
      borderRadius: RADIUS.pill,
    },
    statusText: {
      fontSize: TYPE_SIZE.caption,
      fontWeight: TYPE_WEIGHT.heavy,
    },
    hero: {
      height: L.ringSize + (L.compact ? 30 : 40),
      alignItems: "center",
      justifyContent: "center",
    },
    ringFace: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backfaceVisibility: "hidden",
    },
    ringTouch: {
      width: L.ringSize,
      height: L.ringSize,
      alignItems: "center",
      justifyContent: "center",
    },
    glowLayer: {
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
    },
    ringSvg: {
      position: "absolute",
    },
    ringCenter: {
      alignItems: "center",
    },
    subjectEyebrow: {
      color: C.textTertiary,
      fontSize: TYPE_SIZE.label,
      fontWeight: TYPE_WEIGHT.bold,
      fontStyle: "italic",
      marginBottom: 10,
      maxWidth: L.ringSize - 60,
    },
    timeDisplay: {
      flexDirection: "row",
      alignItems: "center",
    },
    timeDigit: {
      color: C.textPrimary,
      fontSize: L.compact ? TYPE_SIZE.timerSmall : TYPE_SIZE.timer,
      lineHeight: L.compact ? 44 : 52,
      fontWeight: TYPE_WEIGHT.bold,
      fontFamily: TYPE_FAMILY.numeric,
      fontVariant: ["tabular-nums"],
    },
    timeSep: {
      color: C.textTertiary,
      fontSize: L.compact ? TYPE_SIZE.timerDigitCompact : TYPE_SIZE.timerDigit,
      lineHeight: L.compact ? 36 : 42,
      fontFamily: TYPE_FAMILY.numeric,
      marginHorizontal: 1,
    },
    remainText: {
      color: C.textSecondary,
      fontSize: TYPE_SIZE.label,
      fontWeight: TYPE_WEIGHT.bold,
      marginTop: 10,
      fontFamily: TYPE_FAMILY.numeric,
    },
    goalBadge: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: C.successSoft,
      borderRadius: RADIUS.pill,
      paddingHorizontal: 11,
      paddingVertical: 6,
    },
    goalBadgeText: {
      color: C.success,
      fontSize: TYPE_SIZE.label,
      fontWeight: TYPE_WEIGHT.heavy,
    },
    tapHint: {
      position: "absolute",
      bottom: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: SPACE.xs,
    },
    tapHintText: {
      color: C.textTertiary,
      fontSize: TYPE_SIZE.caption,
      fontWeight: TYPE_WEIGHT.bold,
    },
    noteCard: {
      width: "100%",
      height: "100%",
      borderRadius: RADIUS.xl,
      backgroundColor: C.elevated,
      borderWidth: 1,
      borderColor: C.border,
      padding: L.compact ? 18 : 22,
      justifyContent: "center",
      shadowColor: C.shadow,
      shadowOpacity: 0.16,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 6,
    },
    noteTab: {
      position: "absolute",
      top: -1,
      alignSelf: "center",
      backgroundColor: C.elevated,
      borderWidth: 1,
      borderColor: C.border,
      borderTopWidth: 0,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
      paddingHorizontal: SPACE.lg,
      paddingBottom: 7,
      paddingTop: 2,
    },
    noteTabText: {
      color: C.textSecondary,
      fontSize: TYPE_SIZE.caption,
      fontWeight: TYPE_WEIGHT.strong,
      fontStyle: "italic",
    },
    noteSummaryRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 10,
      marginBottom: 18,
    },
    noteSummaryItem: {
      flex: 1,
      alignItems: "center",
    },
    noteSummaryDivider: {
      width: 1,
      height: 40,
      backgroundColor: C.border,
    },
    noteSummaryLabel: {
      color: C.textTertiary,
      fontSize: TYPE_SIZE.caption,
      fontWeight: TYPE_WEIGHT.strong,
    },
    noteSummaryValue: {
      color: C.textPrimary,
      fontSize: TYPE_SIZE.headingSmall,
      fontWeight: TYPE_WEIGHT.bold,
      fontFamily: TYPE_FAMILY.numeric,
      marginTop: SPACE.xs,
    },
    ruledList: {
      gap: 0,
    },
    subjectStatsEmpty: {
      color: C.textTertiary,
      textAlign: "center",
      fontSize: TYPE_SIZE.label,
      fontWeight: TYPE_WEIGHT.bold,
      paddingVertical: 18,
    },
    ruledRow: {
      borderTopWidth: 1,
      borderTopColor: C.borderSoft,
      paddingVertical: 10,
    },
    ruledRowFirst: {
      borderTopWidth: 0,
    },
    ruledRowHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    subjectStatNameRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      minWidth: 0,
    },
    subjectDot: {
      width: 7,
      height: 7,
      borderRadius: RADIUS.pill,
    },
    currentDot: {
      width: 5,
      height: 5,
      borderRadius: RADIUS.pill,
      backgroundColor: C.live,
    },
    subjectStatName: {
      flex: 1,
      color: C.textPrimary,
      fontSize: TYPE_SIZE.bodySmall,
      fontWeight: TYPE_WEIGHT.bold,
    },
    subjectStatTime: {
      color: C.textSecondary,
      fontSize: TYPE_SIZE.captionLarge,
      fontWeight: TYPE_WEIGHT.bold,
      fontFamily: TYPE_FAMILY.numeric,
    },
    statStrip: {
      flexDirection: "row",
      alignItems: "center",
    },
    statStripItem: {
      flex: 1,
      alignItems: "center",
      gap: 5,
    },
    statStripLabelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACE.xs,
    },
    statStripDivider: {
      width: 1,
      height: 30,
      backgroundColor: C.borderSoft,
    },
    statStripLabel: {
      color: C.textTertiary,
      fontSize: TYPE_SIZE.caption,
      fontWeight: TYPE_WEIGHT.strong,
    },
    statStripValue: {
      color: C.textPrimary,
      fontSize: TYPE_SIZE.bodyStrong,
      fontWeight: TYPE_WEIGHT.bold,
      fontFamily: TYPE_FAMILY.numeric,
    },
    progressTrack: {
      height: 3,
      borderRadius: RADIUS.pill,
      backgroundColor: C.surfaceAlt,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: RADIUS.pill,
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    actionButton: {
      flex: 1,
      minHeight: 52,
      borderRadius: RADIUS.control,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
    },
    secondaryAction: {
      backgroundColor: C.primarySoft,
    },
    resumeAction: {
      backgroundColor: C.primary,
    },
    secondaryActionText: {
      color: C.primary,
      fontSize: TYPE_SIZE.body,
      fontWeight: TYPE_WEIGHT.strong,
    },
    resumeActionText: {
      color: C.inverse,
    },
    finishAction: {
      minHeight: 52,
      paddingHorizontal: SPACE.lg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    finishActionText: {
      color: C.textTertiary,
      fontSize: TYPE_SIZE.bodySmall,
      fontWeight: TYPE_WEIGHT.bold,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(15, 23, 42, 0.34)",
      justifyContent: "center",
      alignItems: "center",
      padding: SPACE.xl,
    },
    modalContent: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: C.surface,
      borderRadius: RADIUS.sheet,
      padding: 22,
      borderWidth: 1,
      borderColor: C.border,
    },
    modalTitle: {
      color: C.textPrimary,
      fontSize: TYPE_SIZE.title,
      fontWeight: TYPE_WEIGHT.strong,
      marginBottom: 22,
      textAlign: "center",
    },
    pickerContainer: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "flex-end",
      gap: 14,
      marginBottom: SPACE.xl,
    },
    pickerGroup: {
      alignItems: "center",
      gap: SPACE.sm,
    },
    pickerLabel: {
      color: C.textSecondary,
      fontSize: TYPE_SIZE.label,
      fontWeight: TYPE_WEIGHT.strong,
    },
    pickerControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    pickerDivider: {
      color: C.textTertiary,
      fontSize: TYPE_SIZE.heading,
      fontWeight: TYPE_WEIGHT.bold,
      fontFamily: TYPE_FAMILY.numeric,
      marginBottom: 7,
    },
    ctrlBtn: {
      width: CONTROL.icon,
      height: CONTROL.icon,
      borderRadius: RADIUS.md,
      backgroundColor: C.surfaceAlt,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
    },
    ctrlVal: {
      width: 34,
      color: C.textPrimary,
      fontSize: TYPE_SIZE.titleCompact,
      fontWeight: TYPE_WEIGHT.bold,
      fontFamily: TYPE_FAMILY.numeric,
      textAlign: "center",
    },
    saveBtn: {
      minHeight: 48,
      borderRadius: RADIUS.control,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    saveBtnText: {
      color: C.inverse,
      fontSize: TYPE_SIZE.body,
      fontWeight: TYPE_WEIGHT.strong,
    },
    cancelBtn: {
      minHeight: 42,
      alignItems: "center",
      justifyContent: "center",
      marginTop: SPACE.sm,
    },
    cancelBtnText: {
      color: C.textSecondary,
      fontSize: TYPE_SIZE.bodySmall,
      fontWeight: TYPE_WEIGHT.strong,
    },
  });
