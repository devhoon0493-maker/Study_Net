import { Ionicons } from "@expo/vector-icons";
import { Text, TouchableOpacity } from "react-native";

import type { GroupStyles } from "../groupStyles";
import type { GroupTheme } from "../groupTheme";

type FloatingCreateGroupButtonProps = {
  bottom: number;
  onPress: () => void;
  s: GroupStyles;
  C: GroupTheme;
};

export function FloatingCreateGroupButton({
  bottom,
  onPress,
  s,
  C,
}: FloatingCreateGroupButtonProps) {
  return (
    <TouchableOpacity
      style={[s.floatingCreateButton, { bottom }]}
      activeOpacity={0.86}
      onPress={onPress}
    >
      <Ionicons name="add" size={18} color={C.inverse} />
      <Text style={s.floatingCreateText}>새 그룹 만들기</Text>
    </TouchableOpacity>
  );
}
