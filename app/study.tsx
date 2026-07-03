import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  AppState,
  AppStateStatus,
  Dimensions,
  Easing,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { useMonoTheme, type MonoTheme } from "../constants/mono";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const MAX_WIDTH = 520;
const SAFE_WIDTH = Math.min(SCREEN_WIDTH, MAX_WIDTH);

const RING_SIZE = SAFE_WIDTH - 64;
const CX = RING_SIZE / 2;
const CY = RING_SIZE / 2;
const R = RING_SIZE / 2 - 14;
const CIRCUMFERENCE = 2 * Math.PI * R;

const createStudyTheme = (theme: MonoTheme) => ({
  bg: theme.bg,
  surface: theme.surface,
  surfaceAlt: theme.surfaceAlt,
  border: theme.border,
  borderMid: theme.border,
  accent: theme.text,
  accentSoft: theme.surface,
  success: theme.text,
  successSoft: theme.surface,
  textPrimary: theme.text,
  textSecondary: theme.text,
  textTertiary: theme.text,
  textAccent: theme.text,
  purple: theme.text,
  purpleSoft: theme.surface,
  inverse: theme.inverse,
  statusBar: theme.statusBar,
});

type StudyTheme = ReturnType<typeof createStudyTheme>;

const withAlpha = (color: string, alpha: string) => {
  if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
    const [, r, g, b] = color;
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }

  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return `${color}${alpha}`;

  return color;
};

interface SubjectStat {
  subject: string;
  seconds: number;
  color: string;
  isCurrent: boolean;
}

// AsyncStorage 키
const KEY_ACTIVE = "active_session"; // 최소화된 세션 정보

export default function StudyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme } = useMonoTheme();
  const C = useMemo(() => createStudyTheme(theme), [theme]);
  const styles = useMemo(() => createStyles(C), [C]);
  const subjectColors = useMemo(
    () => [C.textPrimary, C.textPrimary, C.textPrimary, C.textPrimary],
    [C.textPrimary],
  );

  const subject =
    typeof params.subject === "string"
      ? params.subject
      : Array.isArray(params.subject)
      ? params.subject[0]
      : "자율 학습";

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

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const savedSecondsRef = useRef(0);
  const secondsRef = useRef(0);
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    secondsRef.current = seconds;
  }, [seconds]);

  // ── 마운트: 목표시간 + 이전에 최소화된 세션 복원 ──────────
  useEffect(() => {
    const init = async () => {
      try {
        // 목표 시간 복원
        const savedGoal = await AsyncStorage.getItem("daily_goal_seconds");
        if (savedGoal) setGoalSeconds(Number(savedGoal));

        // 최소화된 세션이 있으면 경과 시간 복원
        const raw = await AsyncStorage.getItem(KEY_ACTIVE);
        if (raw) {
          const session = JSON.parse(raw);
          // 같은 과목의 세션인지 확인
          if (session.subject === subject && session.startEpoch) {
            const elapsed = Math.floor((Date.now() - session.startEpoch) / 1000);
            savedSecondsRef.current = elapsed;
            setSeconds(elapsed);
            startTimeRef.current = session.startEpoch;
          }
        }
      } catch (e) {
        console.error("초기화 실패", e);
      }
    };
    init();
  }, [subject]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (running) {
      if (!startTimeRef.current) startTimeRef.current = Date.now() - savedSecondsRef.current * 1000;
      timerRef.current = setInterval(() => {
        if (startTimeRef.current) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setSeconds(elapsed);
        }
      }, 1000);
    } else {
      savedSecondsRef.current = secondsRef.current;
      startTimeRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [running]);

  useEffect(() => {
    if (!running) return;

    const persistActiveSession = async () => {
      const startEpoch = startTimeRef.current ?? (Date.now() - seconds * 1000);
      await AsyncStorage.setItem(KEY_ACTIVE, JSON.stringify({
        subject,
        startEpoch,
        goalSeconds,
      }));
    };

    persistActiveSession().catch((error) => console.error("세션 저장 실패", error));
  }, [goalSeconds, running, seconds, subject]);

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === "active" && running && startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setSeconds(elapsed);
      }
    };
    const sub = AppState.addEventListener("change", handleAppState);
    return () => sub.remove();
  }, [running]);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const format = (total: number) => {
    const h = Math.floor(total / 3600);
    const min = Math.floor((total % 3600) / 60);
    const sec = total % 60;
    return { h: pad(h), m: pad(min), s: pad(sec) };
  };

  const percent = Math.min(seconds / goalSeconds, 1);
  const remain = Math.max(goalSeconds - seconds, 0);
  const { h, m, s } = format(seconds);
  const remainFmt = format(remain);
  const goalFmt = format(goalSeconds);
  const goalDone = seconds >= goalSeconds;
  const accentColor = goalDone ? C.success : C.accent;
  const strokeDashoffset = CIRCUMFERENCE * (1 - percent);

  const frontRotateY = flipAnim.interpolate({ inputRange: [0,1], outputRange: ["0deg","-180deg"] });
  const backRotateY  = flipAnim.interpolate({ inputRange: [0,1], outputRange: ["180deg","0deg"] });
  const frontOpacity = flipAnim.interpolate({ inputRange: [0,0.49,0.5,1], outputRange: [1,1,0,0] });
  const backOpacity  = flipAnim.interpolate({ inputRange: [0,0.49,0.5,1], outputRange: [0,0,1,1] });

  const loadSubjectStats = async () => {
    try {
      const raw = await AsyncStorage.getItem("study_sessions");
      const list: any[] = raw ? JSON.parse(raw) : [];
      const today = new Date().toDateString();
      const map: Record<string, number> = {};
      for (const item of list.filter((i) => new Date(i.date).toDateString() === today)) {
        map[item.subject] = (map[item.subject] ?? 0) + item.seconds;
      }
      map[subject] = (map[subject] ?? 0) + seconds;
      const total = Object.values(map).reduce((a, b) => a + b, 0);
      setTodayTotal(total);
      const names = Object.keys(map).sort();
      const colorMap: Record<string, string> = {};
      names.forEach((n, i) => { colorMap[n] = subjectColors[i % subjectColors.length]; });
      setSubjectStats(
        Object.entries(map).map(([name, secs]) => ({
          subject: name, seconds: secs,
          color: colorMap[name], isCurrent: name === subject,
        })).sort((a, b) => b.seconds - a.seconds)
      );
    } catch {
      setSubjectStats([{ subject, seconds, color: subjectColors[0], isCurrent: true }]);
      setTodayTotal(seconds);
    }
  };

  const handleRingPress = async () => {
    if (isAnimating) return;
    setIsAnimating(true);
    if (!isFlipped) await loadSubjectStats();
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 0 : 1,
      duration: 560,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setIsFlipped((f) => !f);
      setIsAnimating(false);
    });
  };

  // ── 최소화: 세션 상태 저장 후 홈으로 ────────────────────
  const minimizeStudy = async () => {
    try {
      // 현재 시작 epoch를 저장해 두면 복귀 시 정확한 경과 시간 계산 가능
      const startEpoch = startTimeRef.current ?? (Date.now() - seconds * 1000);
      await AsyncStorage.setItem(KEY_ACTIVE, JSON.stringify({
        subject,
        startEpoch,
        goalSeconds,
      }));
      // 타이머는 멈추지 않고 (백그라운드 계속 진행)
      router.replace({ pathname: "/main", params: { added: Date.now() } });
    } catch (e) {
      console.error("최소화 실패", e);
    }
  };

  // ── 세션 종료 ─────────────────────────────────────────
  const finishStudy = () => {
    Alert.alert("세션 종료", "현재 학습을 종료할까요?", [
      { text: "계속", style: "cancel" },
      {
        text: "종료", style: "destructive",
        onPress: async () => {
          if (timerRef.current) clearInterval(timerRef.current);
          // active_session도 삭제
          await AsyncStorage.removeItem(KEY_ACTIVE);
          const raw = await AsyncStorage.getItem("study_sessions");
          const list = raw ? JSON.parse(raw) : [];
          list.push({ seconds, subject, date: new Date().toISOString() });
          await AsyncStorage.setItem("study_sessions", JSON.stringify(list));
          router.replace({ pathname: "/main", params: { added: Date.now() } });
        },
      },
    ]);
  };

  const saveNewGoal = async () => {
    const newSeconds = tempGoalH * 3600 + tempGoalM * 60;
    if (newSeconds === 0) { Alert.alert("알림", "목표 시간은 최소 1분 이상이어야 합니다."); return; }
    setGoalSeconds(newSeconds);
    await AsyncStorage.setItem("daily_goal_seconds", newSeconds.toString());
    setGoalModalVisible(false);
  };

  const goalPercent = Math.min(Math.round((todayTotal / goalSeconds) * 100), 100);
  const todayFmt = format(todayTotal);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />

      {/* HEADER */}
      <View style={styles.header}>
        {/* ✅ 왼쪽: 최소화 버튼 */}
        <TouchableOpacity style={styles.backBtn} onPress={minimizeStudy} activeOpacity={0.7}>
          <Ionicons name="chevron-down" size={18} color={C.textSecondary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>{isFlipped ? "TODAY  STATS" : "FOCUS  SESSION"}</Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: running ? "#fff" : C.surfaceAlt }]}>
          <View style={[styles.statusDot, { backgroundColor: running ? C.success : C.textTertiary }]} />
          <Text style={[styles.statusText, { color: running ? C.success : C.textTertiary }]}>
            {running ? "진행중" : "일시정지"}
          </Text>
        </View>
      </View>

      {/* SUBJECT TAG */}
      <View style={styles.subjectRow}>
        <View style={styles.subjectTag}>
          <Text style={styles.subjectTagLabel}>과목</Text>
          <View style={styles.subjectTagDivider} />
          <Text style={styles.subjectTagValue}>{subject}</Text>
        </View>
      </View>

      {/* FLIP RING */}
      <View style={styles.ringWrap}>
        {/* FRONT */}
        <Animated.View
          style={[styles.ringFace, { opacity: frontOpacity, transform: [{ perspective: 1400 }, { rotateY: frontRotateY }] }]}
          pointerEvents={isFlipped ? "none" : "auto"}
        >
          <TouchableOpacity style={styles.faceTouchable} onPress={handleRingPress} activeOpacity={1}>
            <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="frontGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor={accentColor} stopOpacity="1" />
                  <Stop offset="100%" stopColor={goalDone ? "#000" : "#000"} stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Circle cx={CX} cy={CY} r={R} stroke="#fff" strokeWidth={3} fill="none" />
              <Circle cx={CX} cy={CY} r={R-16} stroke="#fff" strokeWidth={1} fill="none" strokeDasharray="4 8" />
              <Circle
                cx={CX} cy={CY} r={R}
                stroke="url(#frontGrad)" strokeWidth={3} fill="none"
                strokeDasharray={CIRCUMFERENCE} strokeDashoffset={strokeDashoffset}
                strokeLinecap="butt" rotation="-90" origin={`${CX}, ${CY}`}
              />
            </Svg>
            <View style={styles.ringCenter}>
              <View style={styles.timeDisplay}>
                <View style={styles.timeUnit}><Text style={styles.timeDigit}>{h}</Text><Text style={styles.timeLabel}>h</Text></View>
                <Text style={styles.timeSep}>:</Text>
                <View style={styles.timeUnit}><Text style={styles.timeDigit}>{m}</Text><Text style={styles.timeLabel}>m</Text></View>
                <Text style={styles.timeSep}>:</Text>
                <View style={styles.timeUnit}><Text style={styles.timeDigit}>{s}</Text><Text style={styles.timeLabel}>s</Text></View>
              </View>
              {goalDone ? (
                <View style={styles.goalBadge}>
                  <Ionicons name="checkmark" size={11} color={C.success} style={{ marginRight: 4 }} />
                  <Text style={styles.goalBadgeText}>목표 달성</Text>
                </View>
              ) : (
                <Text style={styles.remainText}>{remainFmt.h}:{remainFmt.m}:{remainFmt.s} 남음</Text>
              )}
              <Text style={styles.percentLabel}>{Math.round(percent * 100)}%</Text>
              <View style={styles.tapHint}>
                <Ionicons name="stats-chart" size={9} color={C.textTertiary} style={{ marginRight: 3 }} />
                <Text style={styles.tapHintText}>탭하여 통계 보기</Text>
              </View>
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* BACK */}
        <Animated.View
          style={[styles.ringFace, { opacity: backOpacity, transform: [{ perspective: 1400 }, { rotateY: backRotateY }] }]}
          pointerEvents={isFlipped ? "auto" : "none"}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleRingPress} activeOpacity={1}>
            <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="backGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor={C.purple} stopOpacity="1" />
                  <Stop offset="100%" stopColor="#000" stopOpacity="1" />
                </LinearGradient>
              </Defs>
              <Circle cx={CX} cy={CY} r={R} stroke="#fff" strokeWidth={3} fill="none" />
              <Circle
                cx={CX} cy={CY} r={R}
                stroke="url(#backGrad)" strokeWidth={3} fill="none"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={CIRCUMFERENCE * (1 - Math.min(todayTotal / goalSeconds, 1))}
                strokeLinecap="butt" rotation="-90" origin={`${CX}, ${CY}`}
              />
            </Svg>
          </TouchableOpacity>

          <View style={styles.backCenter} pointerEvents="box-none">
            <TouchableOpacity onPress={handleRingPress} activeOpacity={1}>
              <View style={styles.backTopRow}>
                <View style={styles.backTopItem}>
                  <Text style={styles.backTopLabel}>총 학습</Text>
                  <Text style={styles.backTopValue}>{todayFmt.h}<Text style={styles.backTopUnit}>h </Text>{todayFmt.m}<Text style={styles.backTopUnit}>m</Text></Text>
                </View>
                <View style={styles.backTopSep} />
                <View style={styles.backTopItem}>
                  <Text style={styles.backTopLabel}>목표</Text>
                  <Text style={[styles.backTopValue, { color: goalPercent >= 100 ? C.success : "#000" }]}>{goalPercent}<Text style={styles.backTopUnit}>%</Text></Text>
                </View>
              </View>
              <View style={[styles.backDivider, { marginTop: 10, marginBottom: 10 }]} />
            </TouchableOpacity>
            <View style={{ height: 110, width: "100%" }}>
              <ScrollView showsVerticalScrollIndicator nestedScrollEnabled>
                <View style={styles.backSubjectList}>
                  {subjectStats.map((item) => {
                    const pct = todayTotal > 0 ? Math.round((item.seconds / todayTotal) * 100) : 0;
                    const fmt = format(item.seconds);
                    return (
                      <View key={item.subject} style={styles.backSubjectRow}>
                        <View style={styles.backSubjectLeft}>
                          <View style={[styles.backDot, { backgroundColor: item.color }]} />
                          <Text style={styles.backSubjectName} numberOfLines={1}>{item.subject}</Text>
                          {item.isCurrent && <View style={styles.livePing}><View style={styles.livePingDot} /></View>}
                        </View>
                        <View style={styles.backSubjectRight}>
                          <Text style={styles.backSubjectTime}>{fmt.h}:{fmt.m}:{fmt.s}</Text>
                          <Text style={[styles.backSubjectPct, { color: item.color }]}>{pct}%</Text>
                        </View>
                        <View style={styles.backBarTrack}>
                          <View style={[styles.backBarFill, { width: `${pct}%`, backgroundColor: withAlpha(item.color, "CC") }]} />
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
            <TouchableOpacity onPress={handleRingPress} activeOpacity={1} style={{ alignItems: "center", paddingTop: 10 }}>
              <View style={styles.tapHint}>
                <Ionicons name="refresh-outline" size={9} color={C.textTertiary} style={{ marginRight: 3 }} />
                <Text style={styles.tapHintText}>탭하여 돌아가기</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* PROGRESS BAR */}
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${percent * 100}%`, backgroundColor: "#000" }]} />
        </View>
      </View>

      {/* STAT CARDS */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>경과 시간</Text>
          <Text style={styles.statCardValue}>{h}:{m}:{s}</Text>
        </View>
        <TouchableOpacity
          style={[styles.statCard, styles.statCardMiddle, { backgroundColor: C.surfaceAlt }]}
          activeOpacity={0.7}
          onPress={() => {
            const cf = format(goalSeconds);
            setTempGoalH(Number(cf.h));
            setTempGoalM(Number(cf.m));
            setGoalModalVisible(true);
          }}
        >
          <Text style={styles.statCardLabel}>오늘 목표</Text>
          <Text style={styles.statCardValue}>{goalFmt.h}:{goalFmt.m}:{goalFmt.s}</Text>
          <View style={{ position: "absolute", top: 4, right: 4 }}>
            <Ionicons name="pencil" size={10} color={C.textTertiary} />
          </View>
        </TouchableOpacity>
        <View style={styles.statCard}>
          <Text style={styles.statCardLabel}>달성률</Text>
          <Text style={[styles.statCardValue, { color: accentColor }]}>{Math.round(percent * 100)}%</Text>
        </View>
      </View>

      {/* BUTTONS */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.pauseBtn, !running && styles.pauseBtnActive]}
          onPress={() => setRunning((r) => !r)}
          activeOpacity={0.75}
        >
          <Ionicons name={running ? "pause" : "play"} size={16} color={running ? C.textSecondary : C.textAccent} />
          <Text style={[styles.pauseBtnText, !running && styles.pauseBtnTextActive]}>
            {running ? "일시정지" : "재개"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.finishBtn} onPress={finishStudy} activeOpacity={0.8}>
          <Ionicons name="stop" size={15} color="#000" style={{ marginRight: 6 }} />
          <Text style={styles.finishBtnText}>세션 종료</Text>
        </TouchableOpacity>
      </View>

      {/* 목표 설정 모달 */}
      <Modal visible={isGoalModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>목표 시간 설정</Text>
            <View style={styles.pickerContainer}>
              <View style={styles.pickerGroup}>
                <Text style={styles.pickerLabel}>시간</Text>
                <View style={styles.pickerControls}>
                  <TouchableOpacity style={styles.ctrlBtn} onPress={() => setTempGoalH(Math.max(0, tempGoalH - 1))}>
                    <Ionicons name="remove" size={20} color={C.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.ctrlVal}>{tempGoalH}</Text>
                  <TouchableOpacity style={styles.ctrlBtn} onPress={() => setTempGoalH(Math.min(24, tempGoalH + 1))}>
                    <Ionicons name="add" size={20} color={C.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={styles.pickerDivider}>:</Text>
              <View style={styles.pickerGroup}>
                <Text style={styles.pickerLabel}>분</Text>
                <View style={styles.pickerControls}>
                  <TouchableOpacity style={styles.ctrlBtn} onPress={() => setTempGoalM(Math.max(0, tempGoalM - 10))}>
                    <Ionicons name="remove" size={20} color={C.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.ctrlVal}>{pad(tempGoalM)}</Text>
                  <TouchableOpacity style={styles.ctrlBtn} onPress={() => setTempGoalM(tempGoalM + 10 > 50 ? 0 : tempGoalM + 10)}>
                    <Ionicons name="add" size={20} color={C.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={saveNewGoal}>
              <Text style={styles.saveBtnText}>저장하기</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setGoalModalVisible(false)}>
              <Text style={styles.cancelBtnText}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (C: StudyTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 36 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  backBtn: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderBottomWidth: 3,
    justifyContent: "center", alignItems: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerLabel: { color: C.textTertiary, fontSize: 10, fontWeight: "700", letterSpacing: 3 },
  statusPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: C.border, gap: 5 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusText: { fontSize: 10, fontWeight: "600", letterSpacing: 0.5 },
  subjectRow: { alignItems: "center", marginBottom: 24 },
  subjectTag: { flexDirection: "row", alignItems: "center", backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 7, gap: 10 },
  subjectTagLabel: { color: C.textTertiary, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  subjectTagDivider: { width: 1, height: 10, backgroundColor: C.border },
  subjectTagValue: { color: C.textPrimary, fontSize: 13, fontWeight: "600", letterSpacing: 0.2 },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignSelf: "center", marginBottom: 20 },
  ringFace: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", backfaceVisibility: "hidden" },
  faceTouchable: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  ringCenter: { alignItems: "center", gap: 6 },
  timeDisplay: { flexDirection: "row", alignItems: "flex-end", gap: 2, marginBottom: 4 },
  timeUnit: { alignItems: "center", minWidth: 50 },
  timeDigit: { color: C.textPrimary, fontSize: 44, fontWeight: "300", letterSpacing: -1, lineHeight: 50, fontVariant: ["tabular-nums"] },
  timeLabel: { color: C.textTertiary, fontSize: 10, letterSpacing: 0.5, marginTop: 2 },
  timeSep: { color: C.border, fontSize: 32, fontWeight: "200", marginBottom: 14 },
  remainText: { color: C.textTertiary, fontSize: 12, letterSpacing: 0.5 },
  percentLabel: { color: C.textAccent, fontSize: 11, fontWeight: "700", letterSpacing: 1, marginTop: 2 },
  goalBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderWidth: 1, borderColor: withAlpha(C.success, "44"), borderRadius: 5, paddingHorizontal: 10, paddingVertical: 4 },
  goalBadgeText: { color: C.success, fontSize: 11, fontWeight: "600", letterSpacing: 0.5 },
  tapHint: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  tapHintText: { color: C.textTertiary, fontSize: 9, letterSpacing: 0.5 },
  backCenter: { width: R * 1.35, alignItems: "stretch" },
  backTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  backTopItem: { flex: 1, alignItems: "center", gap: 2 },
  backTopSep: { width: 1, height: 32, backgroundColor: C.border },
  backTopLabel: { color: C.textTertiary, fontSize: 9, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  backTopValue: { color: C.textPrimary, fontSize: 22, fontWeight: "200", fontVariant: ["tabular-nums"] },
  backTopUnit: { fontSize: 11, color: C.textTertiary },
  backDivider: { height: 1, backgroundColor: withAlpha(C.border, "88") },
  backSubjectList: { gap: 8, paddingBottom: 10 },
  backSubjectRow: { gap: 4 },
  backSubjectLeft: { flexDirection: "row", alignItems: "center", gap: 5 },
  backDot: { width: 5, height: 5, borderRadius: 2.5 },
  backSubjectName: { color: C.textPrimary, fontSize: 10, fontWeight: "600", flex: 1 },
  livePing: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" + "22", justifyContent: "center", alignItems: "center" },
  livePingDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: "#fff" },
  backSubjectRight: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  backSubjectTime: { color: C.textSecondary, fontSize: 9, fontVariant: ["tabular-nums"] },
  backSubjectPct: { fontSize: 9, fontWeight: "700" },
  backBarTrack: { height: 2, backgroundColor: C.border, borderRadius: 1, overflow: "hidden" },
  backBarFill: { height: "100%", borderRadius: 1 },
  progressWrap: { marginBottom: 20, paddingHorizontal: 2 },
  progressTrack: { height: 2, backgroundColor: "#fff", borderRadius: 1, overflow: "hidden", borderWidth: 1, borderColor: "#000" },
  progressFill: { height: "100%", borderRadius: 1 },
  statsRow: { flexDirection: "row", marginBottom: 24, borderWidth: 1, borderColor: C.border, borderRadius: 10, overflow: "hidden", backgroundColor: C.surface },
  statCard: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, alignItems: "center", gap: 4, position: "relative" },
  statCardMiddle: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.border },
  statCardLabel: { color: C.textTertiary, fontSize: 9, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" },
  statCardValue: { color: C.textPrimary, fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"] },
  btnRow: { flexDirection: "row", gap: 10 },
  pauseBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, backgroundColor: C.surface, paddingVertical: 16, borderRadius: 10, borderWidth: 1, borderBottomWidth: 4, borderColor: C.border },
  pauseBtnActive: { borderColor: withAlpha(C.accent, "60"), backgroundColor: "#fff" },
  pauseBtnText: { color: C.textSecondary, fontWeight: "600", fontSize: 14 },
  pauseBtnTextActive: { color: C.textAccent },
  finishBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: C.surface, paddingVertical: 16, borderRadius: 10, borderWidth: 1, borderBottomWidth: 4, borderColor: C.border },
  finishBtnText: { color: "#000", fontWeight: "700", fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" },
  modalContent: { width: SCREEN_WIDTH - 64, backgroundColor: C.surface, borderRadius: 16, padding: 24, borderWidth: 1, borderColor: C.border },
  modalTitle: { color: C.textPrimary, fontSize: 16, fontWeight: "700", marginBottom: 24, textAlign: "center" },
  pickerContainer: { flexDirection: "row", justifyContent: "center", alignItems: "flex-end", marginBottom: 30, gap: 15 },
  pickerGroup: { alignItems: "center", gap: 8 },
  pickerLabel: { color: C.textSecondary, fontSize: 12, fontWeight: "600" },
  pickerControls: { flexDirection: "row", alignItems: "center", gap: 12 },
  pickerDivider: { color: C.border, fontSize: 24, fontWeight: "300", marginBottom: 4 },
  ctrlBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.surfaceAlt, justifyContent: "center", alignItems: "center", borderWidth: 1, borderBottomWidth: 3, borderColor: C.border },
  ctrlVal: { color: C.textPrimary, fontSize: 22, fontWeight: "400", fontVariant: ["tabular-nums"], width: 32, textAlign: "center" },
  saveBtn: { backgroundColor: C.surface, paddingVertical: 14, borderRadius: 10, alignItems: "center", borderWidth: 1, borderBottomWidth: 4, borderColor: C.border },
  saveBtnText: { color: "#000", fontWeight: "700", fontSize: 14 },
  cancelBtn: { marginTop: 12, alignItems: "center", paddingVertical: 10 },
  cancelBtnText: { color: C.textTertiary, fontSize: 13, fontWeight: "600" },
});
