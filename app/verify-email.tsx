import { RADIUS, SPACE, TYPE_SIZE, TYPE_WEIGHT } from "../constants/designTokens";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { reload, sendEmailVerification, signOut } from "firebase/auth";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useMonoTheme, type MonoTheme } from "../constants/mono";
import { auth } from "../utils/firebaseConfig";

export default function VerifyEmailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { theme: C } = useMonoTheme();
  const styles = useMemo(() => createStyles(C), [C]);
  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const email = params.email || auth.currentUser?.email || "가입한 이메일";

  const handleCheckVerification = async () => {
    const user = auth.currentUser;
    if (!user || checking) {
      router.replace("/login");
      return;
    }

    try {
      setChecking(true);
      setMessage("");
      await reload(user);

      if (auth.currentUser?.emailVerified) {
        router.replace("/main");
        return;
      }

      setMessage("아직 이메일 인증이 완료되지 않았어요. 메일의 인증 링크를 누른 뒤 다시 확인해주세요.");
    } catch {
      setMessage("인증 상태를 확인하지 못했어요. 네트워크 연결 후 다시 시도해주세요.");
    } finally {
      setChecking(false);
    }
  };

  const handleResendEmail = async () => {
    const user = auth.currentUser;
    if (!user || sending) {
      router.replace("/login");
      return;
    }

    try {
      setSending(true);
      setMessage("");
      await sendEmailVerification(user);
      setMessage("인증 메일을 다시 보냈어요. 메일함과 스팸함을 확인해주세요.");
    } catch {
      setMessage("인증 메일을 다시 보내지 못했어요. 잠시 후 다시 시도해주세요.");
    } finally {
      setSending(false);
    }
  };

  const handleUseAnotherAccount = async () => {
    await signOut(auth).catch(() => {});
    router.replace("/login");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
      <View style={styles.content}>
        <View style={styles.iconBox}>
          <Ionicons name="mail-unread-outline" size={28} color={C.primary} />
        </View>

        <Text style={styles.title}>이메일 인증이 필요해요</Text>
        <Text style={styles.description}>
          {email} 주소로 인증 메일을 보냈어요. 메일 안의 인증 링크를 누른 뒤 아래 버튼으로 완료 여부를 확인해주세요.
        </Text>

        {message ? (
          <View style={styles.messageBox}>
            <Ionicons name="information-circle-outline" size={16} color={C.primary} />
            <Text style={styles.messageText}>{message}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          testID="verify-check-button"
          style={styles.primaryButton}
          onPress={handleCheckVerification}
          disabled={checking}
          activeOpacity={0.84}
        >
          {checking ? (
            <ActivityIndicator color={C.inverse} size="small" />
          ) : (
            <>
              <Text style={styles.primaryButtonText}>인증 완료 확인</Text>
              <Ionicons name="checkmark-circle-outline" size={18} color={C.inverse} />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          testID="verify-resend-button"
          style={styles.secondaryButton}
          onPress={handleResendEmail}
          disabled={sending}
          activeOpacity={0.84}
        >
          {sending ? (
            <ActivityIndicator color={C.text} size="small" />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={17} color={C.text} />
              <Text style={styles.secondaryButtonText}>인증 메일 다시 보내기</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          testID="verify-other-account-button"
          style={styles.textButton}
          onPress={handleUseAnotherAccount}
          activeOpacity={0.75}
        >
          <Text style={styles.textButtonText}>다른 계정으로 로그인</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (C: MonoTheme) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: C.bg,
    },
    content: {
      flex: 1,
      paddingHorizontal: 26,
      justifyContent: "center",
    },
    iconBox: {
      width: 64,
      height: 64,
      borderRadius: RADIUS.card,
      borderWidth: 1,
      borderBottomWidth: 4,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.primarySoft,
      marginBottom: 22,
    },
    title: {
      color: C.text,
      fontSize: TYPE_SIZE.displaySmall,
      fontWeight: TYPE_WEIGHT.heavy,
      marginBottom: SPACE.md,
    },
    description: {
      color: C.muted,
      fontSize: TYPE_SIZE.body,
      fontWeight: TYPE_WEIGHT.bold,
      lineHeight: 22,
      marginBottom: 22,
    },
    messageBox: {
      minHeight: 48,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: SPACE.sm,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
      borderRadius: RADIUS.chip,
      backgroundColor: C.surface,
      paddingHorizontal: SPACE.md,
      paddingVertical: 11,
      marginBottom: 14,
    },
    messageText: {
      flex: 1,
      color: C.text,
      fontSize: TYPE_SIZE.label,
      fontWeight: TYPE_WEIGHT.bold,
      lineHeight: 18,
    },
    primaryButton: {
      minHeight: 54,
      borderRadius: RADIUS.control,
      backgroundColor: C.primary,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: SPACE.sm,
      marginBottom: 10,
    },
    primaryButtonText: {
      color: C.inverse,
      fontSize: TYPE_SIZE.bodyStrong,
      fontWeight: TYPE_WEIGHT.heavy,
    },
    secondaryButton: {
      minHeight: 50,
      borderRadius: RADIUS.control,
      borderWidth: 1,
      borderBottomWidth: 3,
      borderColor: C.border,
      backgroundColor: C.surface,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: SPACE.sm,
      marginBottom: 18,
    },
    secondaryButtonText: {
      color: C.text,
      fontSize: TYPE_SIZE.body,
      fontWeight: TYPE_WEIGHT.heavy,
    },
    textButton: {
      minHeight: 38,
      alignItems: "center",
      justifyContent: "center",
    },
    textButtonText: {
      color: C.primary,
      fontSize: TYPE_SIZE.bodySmall,
      fontWeight: TYPE_WEIGHT.heavy,
    },
  });
