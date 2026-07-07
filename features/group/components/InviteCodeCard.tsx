import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Alert, Text, TouchableOpacity, View } from "react-native";

import type { GroupStyles } from "../groupStyles";
import type { GroupTheme } from "../groupTheme";

export function InviteCodeCard({
  code,
  s,
  C,
}: {
  code: string;
  s: GroupStyles;
  C: GroupTheme;
}) {
  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    Alert.alert("복사 완료", "초대 코드가 클립보드에 복사됐어요.");
  };

  return (
    <View style={s.inviteCodeCard}>
      <View>
        <Text style={s.inviteCodeLabel}>초대 코드</Text>
        <Text style={s.inviteCodeValue}>{code}</Text>
      </View>
      <TouchableOpacity
        style={s.copyCodeButton}
        onPress={copyCode}
        activeOpacity={0.82}
      >
        <Ionicons name="copy-outline" size={16} color={C.textPrimary} />
        <Text style={s.copyCodeText}>복사</Text>
      </TouchableOpacity>
    </View>
  );
}
