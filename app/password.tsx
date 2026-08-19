import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { sendPasswordResetEmail } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getScreenBottomPadding,
  getScreenTopPadding,
} from "../constants/layout";
import { useMonoTheme, type MonoTheme } from "../constants/mono";
import { getErrorCode } from "../utils/errorMessages";
import { auth } from "../utils/firebaseConfig";

const RESEND_SECONDS = 60;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getResetErrorMessage = (code?: string) => {
  switch (code) {
    case "auth/invalid-email":
      return "이메일 형식이 올바르지 않아요.";
    case "auth/user-not-found":
    case "auth/invalid-credential":
      return "가입된 계정을 찾지 못했어요.";
    case "auth/too-many-requests":
      return "요청이 너무 많아요. 잠시 후 다시 시도해주세요.";
    case "auth/network-request-failed":
      return "네트워크 연결을 확인해주세요.";
    default:
      return "재설정 메일을 보내지 못했어요. 잠시 후 다시 시도해주세요.";
  }
};

export default function PasswordResetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme: C } = useMonoTheme();
  const s = useMemo(() => createStyles(C), [C]);
  const topPadding = getScreenTopPadding(insets.top);
  const bottomPadding = getScreenBottomPadding(insets.bottom, 28);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [timer, setTimer] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const isEmailValid = emailRegex.test(email.trim());

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((value) => value - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const formatTimer = (seconds: number) =>
    `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
      seconds % 60,
    ).padStart(2, "0")}`;

  const sendResetEmail = async (restartTimer: boolean) => {
    if (!isEmailValid || loading) return;

    try {
      setLoading(true);
      setErrorMsg("");
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      setSent(true);
      if (restartTimer) setTimer(RESEND_SECONDS);
    } catch (error) {
      setErrorMsg(getResetErrorMessage(getErrorCode(error)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />
      <KeyboardAvoidingView
        style={s.keyboard}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            s.content,
            { paddingTop: topPadding, paddingBottom: bottomPadding },
          ]}
        >
          <TouchableOpacity
            testID="password-back-button"
            style={s.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={22} color={C.text} />
          </TouchableOpacity>

          <View style={s.header}>
            <View style={s.iconBox}>
              <Ionicons
                name={sent ? "mail-open-outline" : "key-outline"}
                size={24}
                color={C.primary}
              />
            </View>
            <Text style={s.title}>
              {sent ? "재설정 메일을 보냈어요" : "비밀번호 재설정"}
            </Text>
            <Text style={s.subtitle}>
              {sent
                ? "메일함에서 재설정 링크를 확인해주세요. 스팸함도 함께 확인하면 좋아요."
                : "가입한 이메일 주소를 입력하면 비밀번호 재설정 링크를 보내드릴게요."}
            </Text>
          </View>

          <View style={s.card}>
            <Text style={s.label}>이메일</Text>
            <View style={s.inputRow}>
              <Ionicons name="mail-outline" size={18} color={C.muted} />
              <TextInput
                testID="password-email-input"
                style={s.input}
                placeholder="name@example.com"
                placeholderTextColor={C.subtle}
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  setErrorMsg("");
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="done"
                onSubmitEditing={() => sendResetEmail(true)}
              />
              {email.length > 0 && (
                <Ionicons
                  name={isEmailValid ? "checkmark-circle" : "alert-circle"}
                  size={18}
                  color={isEmailValid ? C.success : C.danger}
                />
              )}
            </View>

            {email.length > 0 && !isEmailValid && (
              <Text style={s.hintText}>이메일 형식을 확인해주세요.</Text>
            )}
            {errorMsg !== "" && <Text style={s.errorText}>{errorMsg}</Text>}

            <TouchableOpacity
              testID="password-submit-button"
              style={[
                s.primaryButton,
                (!isEmailValid || loading) && s.primaryButtonDisabled,
              ]}
              onPress={() => sendResetEmail(true)}
              disabled={!isEmailValid || loading}
              activeOpacity={0.84}
            >
              {loading ? (
                <ActivityIndicator color={C.inverse} size="small" />
              ) : (
                <Text style={s.primaryButtonText}>
                  {sent ? "재설정 메일 다시 보내기" : "재설정 메일 보내기"}
                </Text>
              )}
            </TouchableOpacity>

            {sent && (
              <View style={s.resendBox}>
                {timer > 0 ? (
                  <Text style={s.resendText}>
                    {formatTimer(timer)} 후 다시 보낼 수 있어요.
                  </Text>
                ) : (
                  <TouchableOpacity
                    testID="password-resend-button"
                    onPress={() => sendResetEmail(true)}
                  >
                    <Text style={s.resendLink}>메일 다시 보내기</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <TouchableOpacity
            testID="password-login-back-button"
            style={s.footerButton}
            onPress={() => router.back()}
          >
            <Text style={s.footerButtonText}>로그인으로 돌아가기</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (C: MonoTheme) =>
  StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: C.bg,
    },
    keyboard: {
      flex: 1,
    },
    content: {
      flexGrow: 1,
      paddingHorizontal: 22,
      justifyContent: "center",
    },
    backButton: {
      width: 38,
      height: 38,
      borderRadius: 12,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 24,
    },
    header: {
      marginBottom: 18,
    },
    iconBox: {
      width: 46,
      height: 46,
      borderRadius: 15,
      backgroundColor: C.primarySoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 14,
    },
    title: {
      color: C.text,
      fontSize: 28,
      fontWeight: "900",
    },
    subtitle: {
      color: C.muted,
      fontSize: 14,
      lineHeight: 20,
      marginTop: 8,
    },
    card: {
      backgroundColor: C.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: C.border,
      padding: 16,
      shadowColor: C.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
    label: {
      color: C.text,
      fontSize: 12,
      fontWeight: "800",
      marginBottom: 8,
    },
    inputRow: {
      minHeight: 52,
      flexDirection: "row",
      alignItems: "center",
      gap: 9,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 14,
      backgroundColor: C.surfaceAlt,
      paddingHorizontal: 13,
    },
    input: {
      flex: 1,
      minWidth: 0,
      color: C.text,
      fontSize: 14,
      fontWeight: "700",
    },
    hintText: {
      color: C.danger,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 9,
    },
    errorText: {
      color: C.danger,
      fontSize: 12,
      fontWeight: "700",
      marginTop: 10,
      lineHeight: 18,
    },
    primaryButton: {
      height: 52,
      borderRadius: 14,
      backgroundColor: C.primary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 16,
    },
    primaryButtonDisabled: {
      opacity: 0.5,
    },
    primaryButtonText: {
      color: C.inverse,
      fontSize: 15,
      fontWeight: "900",
    },
    resendBox: {
      alignItems: "center",
      marginTop: 14,
    },
    resendText: {
      color: C.subtle,
      fontSize: 12,
      fontWeight: "700",
    },
    resendLink: {
      color: C.primary,
      fontSize: 13,
      fontWeight: "900",
      textDecorationLine: "underline",
    },
    footerButton: {
      alignSelf: "center",
      marginTop: 22,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    footerButtonText: {
      color: C.primary,
      fontSize: 14,
      fontWeight: "800",
    },
  });
