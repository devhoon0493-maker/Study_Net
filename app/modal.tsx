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
      padding: 24,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.bg,
    },
    panel: {
      width: "100%",
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      borderRadius: 18,
      padding: 22,
      alignItems: "center",
      backgroundColor: C.surface,
    },
    iconBox: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.primarySoft,
      marginBottom: 14,
    },
    title: {
      color: C.text,
      fontSize: 20,
      fontWeight: "900",
      marginBottom: 8,
    },
    body: {
      color: C.muted,
      fontSize: 13,
      fontWeight: "700",
      textAlign: "center",
      lineHeight: 20,
      marginBottom: 18,
    },
    button: {
      minHeight: 48,
      alignSelf: "stretch",
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.primary,
    },
    buttonText: {
      color: C.inverse,
      fontSize: 14,
      fontWeight: "900",
    },
  });
