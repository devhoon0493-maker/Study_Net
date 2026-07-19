import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import type { HomeStyles } from "../homeStyles";
import type { HomeTheme } from "../homeTheme";
import type { StoredSession } from "../homeTypes";
import {
  SUBJECT_COLORS,
  formatCompactDuration,
  formatStudyDate,
} from "../homeUtils";

export function RecentStudyCard({
  sessions,
  styles,
  C,
  onOpenCalendar,
}: {
  sessions: StoredSession[];
  styles: HomeStyles;
  C: HomeTheme;
  onOpenCalendar: () => void;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>최근 공부 기록</Text>
        <TouchableOpacity onPress={onOpenCalendar} activeOpacity={0.78}>
          <Text style={styles.sectionLink}>전체 보기 &gt;</Text>
        </TouchableOpacity>
      </View>

      {sessions.length === 0 ? (
        <View style={styles.emptyBlock}>
          <Ionicons name="book-outline" size={24} color={C.textTertiary} />
          <Text style={styles.emptyTitle}>아직 공부 기록이 없어요</Text>
          <Text style={styles.emptyText}>공부를 시작하면 최근 기록이 여기에 표시돼요.</Text>
        </View>
      ) : (
        sessions.map((session, index) => (
          <View
            key={`${session.date}-${index}`}
            style={[styles.recentRow, index > 0 && styles.recentRowBorder]}
          >
            <View
              style={[
                styles.recentIcon,
                { backgroundColor: `${SUBJECT_COLORS[index % SUBJECT_COLORS.length]}18` },
              ]}
            >
              <Ionicons
                name="book-outline"
                size={17}
                color={SUBJECT_COLORS[index % SUBJECT_COLORS.length]}
              />
            </View>
            <View style={styles.recentBody}>
              <Text style={styles.recentSubject} numberOfLines={1}>
                {session.subject}
              </Text>
              <Text style={styles.recentDate}>{formatStudyDate(session.date)}</Text>
            </View>
            <View style={styles.recentRight}>
              <Text style={styles.recentDuration}>
                {formatCompactDuration(session.seconds)}
              </Text>
              <Text style={styles.recentTime} numberOfLines={1}>
                완료
              </Text>
            </View>
            <Ionicons
              name="checkmark-circle"
              size={21}
              color={C.success}
              style={styles.recentCheck}
            />
          </View>
        ))
      )}
    </View>
  );
}
