import { onAuthStateChanged } from "firebase/auth";
import { useRouter, type Href } from "expo-router";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useMonoTheme, type MonoTheme } from "../constants/mono";
import { requiresEmailVerification } from "../utils/emailVerification";
import { auth } from "../utils/firebaseConfig";

export default function Index() {
  const router = useRouter();
  const { theme: C } = useMonoTheme();
  const styles = useMemo(() => createStyles(C), [C]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      router.replace(
        (requiresEmailVerification(user) ? "/verify-email" : "/main") as Href,
      );
    });

    return unsubscribe;
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={C.primary} />
    </View>
  );
}

const createStyles = (C: MonoTheme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.bg,
    },
  });
