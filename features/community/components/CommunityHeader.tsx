import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity, View } from "react-native";

import type { MonoTheme } from "../../../constants/mono";
import type { CommunityStyles } from "../communityStyles";

export function CommunityHeader({
  s,
  C,
  onBack,
  onCompose,
}: {
  s: CommunityStyles;
  C: MonoTheme;
  onBack: () => void;
  onCompose: () => void;
}) {
  return (
    <View style={s.header}>
      <TouchableOpacity style={s.backButton} onPress={onBack} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="뒤로 가기">
        <Ionicons name="chevron-back" size={20} color={C.text} />
      </TouchableOpacity>

      <View style={s.headerTitleWrap}>
        <Text style={s.headerTitle}>소셜</Text>
        <Text style={s.headerSub}>글도 보고 바로 같이 공부하기</Text>
      </View>

      <TouchableOpacity style={s.composeButton} onPress={onCompose} activeOpacity={0.75} accessibilityRole="button" accessibilityLabel="글쓰기">
        <Ionicons name="create-outline" size={18} color={C.inverse} />
        <Text style={s.composeButtonText}>글쓰기</Text>
      </TouchableOpacity>
    </View>
  );
}
