import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useContext, useEffect, useMemo, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";

import { useMonoTheme } from "../../../constants/mono";
import { SessionContext } from "../HomeSessionContext";
import { createHomeTheme } from "../homeTheme";
import { createBannerStyles } from "../homeStyles";
import { formatClock } from "../homeUtils";

export function ActiveSessionBanner({ bottomOffset }: { bottomOffset: number }) {
  const router = useRouter();
  const { theme } = useMonoTheme();
  const C = useMemo(() => createHomeTheme(theme), [theme]);
  const styles = useMemo(() => createBannerStyles(C), [C]);
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
  const paused = session.running === false;

  return (
    <Animated.View
      style={[styles.banner, { bottom: bottomOffset, transform: [{ translateY: slideAnim }] }]}
    >
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${percent}%` }]} />
      </View>
      <View style={styles.inner}>
        <View style={styles.left}>
          <View style={[styles.liveDot, paused && styles.pausedDot]} />
          <View>
            <Text style={styles.subject}>{session.subject}</Text>
            <Text style={styles.time}>
              {paused ? "일시정지 · " : ""}
              {formatClock(elapsed)}
            </Text>
          </View>
        </View>
        <View style={styles.right}>
          <Text style={styles.percent}>{percent}%</Text>
          <TouchableOpacity
            style={styles.resumeBtn}
            activeOpacity={0.82}
            onPress={() =>
              router.push({
                pathname: "/study",
                params: { subject: session.subject },
              })
            }
          >
            <Ionicons
              name={paused ? "pause" : "play"}
              size={11}
              color={C.primary}
              style={{ marginRight: 4 }}
            />
            <Text style={styles.resumeText}>돌아가기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}
