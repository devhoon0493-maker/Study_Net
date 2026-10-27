import { RADIUS } from "../constants/designTokens";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity, StyleSheet } from "react-native";

type Props = {
  name: keyof typeof Ionicons.glyphMap;
  bg: string;
  iconColor: string;
  onPress: () => void;
};

export default function SocialButton({ name, bg, iconColor, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[s.btn, { backgroundColor: bg }]}
      onPress={onPress}
    >
      <Ionicons name={name} size={22} color={iconColor} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  btn: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.card,
    alignItems: "center",
    justifyContent: "center",
  },
});