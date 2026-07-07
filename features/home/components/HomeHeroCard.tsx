import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import type { DdayGoal } from "../../../utils/dday";
import type { HomeStyles } from "../homeStyles";
import type { HomeTheme } from "../homeTheme";
import { ProgressRing } from "./ProgressRing";

export function HomeHeroCard({
  ddayGoal,
  ddayText,
  ddayDate,
  goalLabel,
  percent,
  todaySeconds,
  dailyGoal,
  streak,
  styles,
  C,
  onOpenGoals,
  onStartStudy,
}: {
  ddayGoal: DdayGoal;
  ddayText: string;
  ddayDate: string;
  goalLabel: string;
  percent: number;
  todaySeconds: number;
  dailyGoal: number;
  streak: number;
  styles: HomeStyles;
  C: HomeTheme;
  onOpenGoals: () => void;
  onStartStudy: () => void;
}) {
  return (
    <View style={styles.heroCard}>
      <View style={styles.heroTop}>
        <View style={styles.heroCopy}>
          <Text style={styles.heroEyebrow}>오늘의 목표</Text>

          <TouchableOpacity
            style={styles.ddayEditorial}
            onPress={onOpenGoals}
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

          <TouchableOpacity style={styles.heroButton} onPress={onStartStudy} activeOpacity={0.86}>
            <Text style={styles.heroButtonText}>공부 시작하기</Text>
            <View style={styles.heroButtonIcon}>
              <Ionicons name="play" size={14} color={C.primary} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.heroVisual}>
          <ProgressRing
            percent={percent}
            todaySeconds={todaySeconds}
            dailyGoal={dailyGoal}
            C={C}
          />
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={15} color={C.live} />
            <Text style={styles.streakBadgeText}>연속 {streak}일째!</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
