import { Animated, Text, View } from "react-native";

import type { GroupStyles } from "../groupStyles";
import type { Member } from "../groupTypes";
import { MemberPreview } from "./MemberPreview";

export function GroupHeroCard({
  studyingCount,
  openCount,
  publicCount,
  studyingMembers,
  livePulse,
  s,
}: {
  studyingCount: number;
  openCount: number;
  publicCount: number;
  studyingMembers: Member[];
  livePulse: Animated.Value;
  s: GroupStyles;
}) {
  return (
    <View style={s.groupHeroCard}>
      <View style={s.groupHeroTop}>
        <View style={s.heroCopy}>
          <View style={s.heroLiveBadge}>
            <Animated.View style={[s.liveDot, { opacity: livePulse }]} />
            <Text style={s.heroLiveText}>현재 {studyingCount}명 공부 중</Text>
          </View>
          <Text style={s.groupHeroTitle}>지금 같이 공부 중이에요</Text>
          <Text style={s.groupHeroDesc}>
            친구들의 공부 상태를 보고 바로 합류해보세요.
          </Text>
        </View>
        <View style={s.heroPeoplePanel}>
          <MemberPreview members={studyingMembers} s={s} />
        </View>
      </View>

      <View style={s.heroMetricRow}>
        <View style={s.heroMetricItem}>
          <Text style={s.heroMetricValue}>{openCount}</Text>
          <Text style={s.heroMetricLabel}>열린 그룹</Text>
        </View>
        <View style={s.heroMetricItem}>
          <Text style={s.heroMetricValue}>{publicCount}</Text>
          <Text style={s.heroMetricLabel}>공개 그룹</Text>
        </View>
      </View>
    </View>
  );
}
