import { RADIUS, SPACE, TYPE_SIZE, TYPE_WEIGHT } from "../constants/designTokens";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { useMonoTheme, type MonoTheme } from "../constants/mono";

export default function ModalScreen() {
  const router = useRouter();
  const { theme: C } = useMonoTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
      <View style={styles.panel}>
        <View style={styles.iconBox}>
          <Ionicons name="information-circle-outline" size={22} color={C.primary} />
        </View>
        <Text style={styles.title}>알림</Text>
        <Text style={styles.body}>요청한 화면을 여는 중 문제가 생겼어요.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/main")}
          activeOpacity={0.84}
        >
          <Text style={styles.buttonText}>메인으로 이동</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (C: MonoTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: SPACE.xl,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.bg,
    },
    panel: {
      width: "100%",
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      borderRadius: RADIUS.card,
      padding: 22,
      alignItems: "center",
      backgroundColor: C.surface,
    },
    iconBox: {
      width: 48,
      height: 48,
      borderRadius: RADIUS.control,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.primarySoft,
      marginBottom: 14,
    },
    title: {
      color: C.text,
      fontSize: TYPE_SIZE.titleLarge,
      fontWeight: TYPE_WEIGHT.heavy,
      marginBottom: SPACE.sm,
    },
    body: {
      color: C.muted,
      fontSize: TYPE_SIZE.bodySmall,
      fontWeight: TYPE_WEIGHT.bold,
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 18,
    },
    button: {
      minHeight: 48,
      alignSelf: "stretch",
      borderRadius: RADIUS.chip,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.primary,
    },
    buttonText: {
      color: C.inverse,
      fontSize: TYPE_SIZE.body,
      fontWeight: TYPE_WEIGHT.heavy,
    },
  });
