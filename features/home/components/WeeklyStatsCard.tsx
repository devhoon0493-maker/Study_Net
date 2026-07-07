import { Text, View } from "react-native";

import type { HomeStyles } from "../homeStyles";
import type { HomeTheme } from "../homeTheme";
import type { SubjectShare, WeeklyDay } from "../homeTypes";
import { SubjectDonut } from "./SubjectDonut";

export function WeeklyStatsCard({
  weeklyStats,
  weeklyMax,
  subjectShares,
  subjectTotal,
  styles,
  C,
}: {
  weeklyStats: WeeklyDay[];
  weeklyMax: number;
  subjectShares: SubjectShare[];
  subjectTotal: number;
  styles: HomeStyles;
  C: HomeTheme;
}) {
  return (
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
                  <Text style={styles.barValue}>
                    {item.seconds > 0 && ratio > 0.28
                      ? (item.seconds / 3600).toFixed(1)
                      : ""}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        !isMax && styles.barFillMuted,
                        {
                          height: `${Math.max(
                            ratio * 100,
                            item.seconds > 0 ? 10 : 0,
                          )}%`,
                        },
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
                    <Text style={styles.legendText} numberOfLines={1}>
                      {item.subject}
                    </Text>
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
  );
}
