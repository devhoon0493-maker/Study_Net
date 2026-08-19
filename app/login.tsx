import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// ✅ Google 로그인 관련 추가 import
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  type User,
} from "firebase/auth";
import { get, ref, set } from "firebase/database";
import { useMonoTheme, type MonoTheme } from "../constants/mono";
import { requiresEmailVerification } from "../utils/emailVerification";
import { getErrorCode } from "../utils/errorMessages";
import { auth, db } from "../utils/firebaseConfig";
import {
  getGoogleAuthErrorMessage,
  getGoogleRuntimeErrorMessage,
  isGoogleAuthSupportedInCurrentRuntime,
  signInWithGoogle,
} from "../utils/googleAuth";
import {
  getKakaoAuthErrorMessage,
  getKakaoConfigErrorMessage,
  isKakaoConfigured,
  kakaoAuthRequestConfig,
  signInWithKakaoCode,
} from "../utils/kakaoAuth";
import { saveStoredUserProfile } from "../utils/userProfileStorage";

// ✅ 인증 세션 완료 처리 (필수, 컴포넌트 바깥에서 호출)
WebBrowser.maybeCompleteAuthSession();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const getLoginErrorMessage = (code?: string) => {
  switch (code) {
    case "auth/invalid-email":
      return "이메일 형식이 올바르지 않아요.";
    case "auth/user-disabled":
      return "사용이 중지된 계정이에요.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "이메일 또는 비밀번호가 올바르지 않아요.";
    case "auth/network-request-failed":
      return "네트워크 연결을 확인해주세요.";
    default:
      return "로그인에 실패했어요. 잠시 후 다시 시도해주세요.";
  }
};

const persistUserProfile = async (user: User, userType = "일반 회원") => {
  const userRef = ref(db, `users/${user.uid}`);
  const snapshot = await get(userRef);
  const fallbackProfile = {
    uid: user.uid,
    name: user.displayName || user.email?.split("@")[0] || "Study User",
    email: user.email || "",
    image: user.photoURL || null,
    userType,
    createdAt: Date.now(),
  };
  const profile = snapshot.exists() ? { ...fallbackProfile, ...snapshot.val() } : fallbackProfile;

  if (!snapshot.exists()) {
    await set(userRef, profile);
  }

  await saveStoredUserProfile(profile);
};

/* ─────────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────────── */
export default function LoginScreen() {
  const router = useRouter();
  const { theme: C } = useMonoTheme();
  const s = useMemo(() => createStyles(C), [C]);
  const socialStyles = useMemo(() => createSocialStyles(C), [C]);
  const [emailFocused, setEmailFocused] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);        // ① 로딩 상태
  const [errorMsg, setErrorMsg] = useState("");         // 에러 메시지
  const [googleLoading, setGoogleLoading] = useState(false); // ✅ 구글 로그인 로딩
  const [kakaoLoading, setKakaoLoading] = useState(false);

  // ② 키보드 다음 필드 이동용 ref
  const pwRef = useRef<TextInput>(null);

  // ③ 유효성 검사 — 이메일 형식 + 비밀번호 6자 이상
  const isValid = emailRegex.test(email.trim()) && password.length >= 6;

  const [kakaoRequest, kakaoResponse, promptKakaoAsync] =
    AuthSession.useAuthRequest(kakaoAuthRequestConfig, {
      authorizationEndpoint: "https://kauth.kakao.com/oauth/authorize",
      tokenEndpoint: "https://kauth.kakao.com/oauth/token",
    });

  useEffect(() => {
    const handleKakaoResponse = async () => {
      if (kakaoResponse?.type === "success") {
        try {
          setKakaoLoading(true);
          setErrorMsg("");

          const { code } = kakaoResponse.params;
          if (!code) {
            setErrorMsg("Kakao 인증 코드를 받지 못했어요.");
            return;
          }

          const user = await signInWithKakaoCode(
            code,
            kakaoRequest?.codeVerifier,
          );
          await persistUserProfile(user, "Kakao 회원");

          router.replace("/main");
        } catch (error) {
          console.warn("Kakao login error:", error);
          setErrorMsg(getKakaoAuthErrorMessage(error));
        } finally {
          setKakaoLoading(false);
        }
      } else if (kakaoResponse?.type === "error") {
        setErrorMsg("Kakao 로그인이 취소되었거나 실패했어요.");
        setKakaoLoading(false);
      }
    };

    handleKakaoResponse();
  }, [kakaoRequest, kakaoResponse, router]);

  // ✅ Google 로그인 버튼 핸들러
  const handleGoogleLogin = async () => {
    if (googleLoading) return;
    if (!isGoogleAuthSupportedInCurrentRuntime()) {
      setErrorMsg(getGoogleRuntimeErrorMessage());
      return;
    }
    setErrorMsg("");
    try {
      setGoogleLoading(true);
      const idToken = await signInWithGoogle();
      if (!idToken) return;

      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      await persistUserProfile(result.user, "Google 회원");

      router.replace("/main");
    } catch (error) {
      console.warn("Google login error:", error);
      setErrorMsg(getGoogleAuthErrorMessage(error));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleKakaoLogin = async () => {
    if (kakaoLoading) return;
    if (!isKakaoConfigured()) {
      setErrorMsg(getKakaoConfigErrorMessage());
      return;
    }
    if (!kakaoRequest) return;

    setErrorMsg("");
    try {
      setKakaoLoading(true);
      await promptKakaoAsync();
    } catch (error) {
      console.warn("Kakao prompt error:", error);
      setErrorMsg("Kakao 로그인을 시작하지 못했어요.");
      setKakaoLoading(false);
    }
  };

  // ④ 이메일 로그인 핸들러
  const handleLogin = async () => {
    if (!isValid || loading) return;
    setErrorMsg("");
    try {
      setLoading(true);
      const result = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      await persistUserProfile(result.user);
      if (requiresEmailVerification(result.user)) {
        router.replace({
          pathname: "/verify-email",
          params: { email: result.user.email ?? email.trim().toLowerCase() },
        } as unknown as Href);
        return;
      }
      router.replace("/main");
    } catch (error) {
      setErrorMsg(getLoginErrorMessage(getErrorCode(error)));
    } finally {
      setLoading(false);
    }
  };

  /* 입장 애니메이션 */
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style={C.mode === "dark" ? "light" : "dark"} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.kav}
      >
        <Animated.View
          style={[
            s.inner,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* ── 헤더 ── */}
          <View style={s.header}>
            <View style={s.badgeRow}>
              <View style={s.badge}>
                <Text style={s.badgeText}>STUDY PLATFORM</Text>
              </View>
            </View>
            <Text style={s.logo}>StudyNet</Text>
            <Text style={s.sub}>함께 성장하는 학습 커뮤니티</Text>
          </View>

          {/* ── 폼 카드 ── */}
          <View style={s.card}>
            {/* 이메일 */}
            <View style={[s.field, emailFocused && s.fieldFocused]}>
              <View style={[s.fieldIcon, emailFocused && s.fieldIconActive]}>
                <Ionicons
                  name="mail-outline"
                  size={17}
                  color={C.text}
                />
              </View>
              <TextInput
                testID="login-email-input"
                style={s.fieldInput}
                placeholder="이메일 주소"
                placeholderTextColor={C.subtle}
                keyboardType="email-address"
                autoCapitalize="none"
                returnKeyType="next"                          // ② 키보드 next 버튼
                onSubmitEditing={() => pwRef.current?.focus()} // ② 다음 필드로 이동
                value={email}
                onChangeText={(t) => { setEmail(t); setErrorMsg(""); }}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </View>

            {/* 비밀번호 */}
            <View style={[s.field, pwFocused && s.fieldFocused]}>
              <View style={[s.fieldIcon, pwFocused && s.fieldIconActive]}>
                <Ionicons
                  name="lock-closed-outline"
                  size={17}
                  color={C.text}
                />
              </View>
              <TextInput
                testID="login-password-input"
                ref={pwRef}                                   // ② ref 연결
                style={s.fieldInput}
                placeholder="비밀번호 (6자 이상)"
                placeholderTextColor={C.subtle}
                secureTextEntry={!showPw}
                returnKeyType="done"                          // ② 키보드 done 버튼
                onSubmitEditing={handleLogin}                 // ② done 누르면 로그인
                value={password}
                onChangeText={(t) => { setPassword(t); setErrorMsg(""); }}
                onFocus={() => setPwFocused(true)}
                onBlur={() => setPwFocused(false)}
              />
              <TouchableOpacity
                testID="login-password-visibility-button"
                style={s.eyeBtn}
                onPress={() => setShowPw(!showPw)}
              >
                <Ionicons
                  name={showPw ? "eye-outline" : "eye-off-outline"}
                  size={18}
                  color={C.text}
                />
              </TouchableOpacity>
            </View>

            {/* 에러 메시지 */}
            {errorMsg ? (
              <View style={s.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color={C.danger} />
                <Text style={s.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* 비밀번호 찾기 */}
            <TouchableOpacity
              testID="login-forgot-password-button"
              style={s.forgotRow}
              onPress={() => router.push("/password")}
            >
              <Text style={s.forgotText}>비밀번호를 잊으셨나요?</Text>
            </TouchableOpacity>

            {/* 로그인 버튼 — isValid 따라 스타일/동작 분기 */}
            <TouchableOpacity
              testID="login-submit-button"
              activeOpacity={isValid ? 0.85 : 1}
              style={[s.loginBtn, !isValid && s.loginBtnDisabled]}  // ③ 비활성 스타일
              onPress={handleLogin}
              disabled={!isValid || loading}                         // ① 중복 클릭 방지
            >
              {loading ? (                                           // ① 로딩 스피너
                <ActivityIndicator color={C.inverse} size="small" />
              ) : (
                <>
                  <Text style={[s.loginBtnText, !isValid && s.loginBtnTextDisabled]}>
                    로그인
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={C.inverse}
                  />
                </>
              )}
            </TouchableOpacity>

            {/* 구분선 */}
            <View style={s.divider}>
              <View style={s.divLine} />
              <Text style={s.divText}>간편 로그인</Text>
              <View style={s.divLine} />
            </View>

            {/* 소셜 아이콘 버튼 3개 */}
            <View style={s.socialRow}>
              <SocialIconBtn
                testID="login-google-button"
                name="logo-google"
                bg={C.surface}
                iconColor={C.text}
                onPress={handleGoogleLogin}
                disabled={googleLoading}
                loading={googleLoading}
                styles={socialStyles}
              />
              <SocialIconBtn
                testID="login-kakao-button"
                name="chatbubble"
                bg={C.surface}
                iconColor={C.text}
                onPress={handleKakaoLogin}
                disabled={!kakaoRequest || kakaoLoading}
                loading={kakaoLoading}
                styles={socialStyles}
              />
            </View>
          </View>

          {/* ── 회원가입 ── */}
          <View style={s.signupRow}>
            <Text style={s.signupText}>아직 계정이 없으신가요?</Text>
            <TouchableOpacity
              testID="login-signup-link"
              onPress={() => router.push("/signup")}
            >
              <Text style={s.signupLink}>  회원가입</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─────────────────────────────────────────────
   소셜 아이콘 버튼
───────────────────────────────────────────── */
const SocialIconBtn = ({
  testID,
  name,
  bg,
  iconColor,
  onPress,
  disabled = false,
  loading = false,
  styles,
}: {
  testID?: string;
  name: keyof typeof Ionicons.glyphMap;
  bg: string;
  iconColor: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  styles: ReturnType<typeof createSocialStyles>;
}) => (
  <TouchableOpacity
    testID={testID}
    activeOpacity={0.8}
    style={[styles.btn, { backgroundColor: bg }, disabled && styles.btnDisabled]}
    onPress={onPress}
    disabled={disabled}
  >
    {loading ? (
      <ActivityIndicator color={iconColor} size="small" />
    ) : (
      <Ionicons name={name} size={22} color={iconColor} />
    )}
  </TouchableOpacity>
);

const createSocialStyles = (C: MonoTheme) =>
  StyleSheet.create({
  btn: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  });

/* ─────────────────────────────────────────────
   스타일
───────────────────────────────────────────── */
const createStyles = (C: MonoTheme) =>
  StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  kav: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },

  /* 헤더 */
  header: { marginBottom: 32 },
  badgeRow: { flexDirection: "row", marginBottom: 14 },
  badge: {
    backgroundColor: C.surface,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  badgeText: {
    color: C.text,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  logo: {
    fontSize: 40,
    fontWeight: "900",
    color: C.text,
    letterSpacing: 0,
  },
  sub: {
    color: C.muted,
    fontSize: 14,
    marginTop: 4,
    fontWeight: "500",
  },

  /* 카드 */
  card: {
    backgroundColor: C.surface,
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.shadow,
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
  },

  /* 입력 필드 */
  field: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  fieldFocused: {
    borderColor: C.primary,
    backgroundColor: C.surface,
  },
  fieldIcon: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: C.border,
    height: 52,
  },
  fieldIconActive: {
    borderRightColor: C.primary,
    backgroundColor: C.primarySoft,
  },
  fieldInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 14,
    color: C.text,
    fontSize: 15,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },

  /* 에러 메시지 */
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 10,
    marginTop: -6,
  },
  errorText: {
    color: C.danger,
    fontSize: 12,
    fontWeight: "500",
  },

  /* 비밀번호 찾기 */
  forgotRow: { alignItems: "flex-end", marginBottom: 20, marginTop: 2 },
  forgotText: { color: C.primary, fontSize: 13, fontWeight: "600" },

  /* 로그인 버튼 */
  loginBtn: {
    backgroundColor: C.primary,
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: C.shadow,
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: C.primary,
  },
  loginBtnDisabled: {
    backgroundColor: C.surfaceAlt,
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: C.border,
  },
  loginBtnText: {
    color: C.inverse,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  loginBtnTextDisabled: {
    color: C.subtle,
  },

  /* 구분선 */
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },
  divLine: { flex: 1, height: 1, backgroundColor: C.border },
  divText: {
    color: C.subtle,
    fontSize: 12,
    fontWeight: "600",
    marginHorizontal: 12,
    letterSpacing: 0.5,
  },

  /* 소셜 아이콘 행 */
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },

  /* 회원가입 */
  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 28,
  },
  signupText: { color: C.muted, fontSize: 14 },
  signupLink: {
    color: C.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  });
