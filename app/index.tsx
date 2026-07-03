import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { auth } from "../utils/firebaseConfig";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      router.replace(user ? "/main" : "/login");
    });

    return unsubscribe;
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#111111" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F7F4EF",
  },
});
