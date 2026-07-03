import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// ✅ Google 로그인 관련 추가 import
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  type User,
} from "firebase/auth";
import { get, ref, set } from "firebase/database";
import { auth, db } from "../utils/firebaseConfig";

// ✅ 인증 세션 완료 처리 (필수, 컴포넌트 바깥에서 호출)
WebBrowser.maybeCompleteAuthSession();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const googleWebClientId = "713632998369-g276ekeqbra47uag5lttt8i5fb766mft.apps.googleusercontent.com";
const googleAndroidClientId = "713632998369-kplb0uk05k8peh43s48l6guidgn27pl5.apps.googleusercontent.com";
const googleIosClientId = googleWebClientId;

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

  await AsyncStorage.setItem("userProfile", JSON.stringify(profile));
};

/* ─────────────────────────────────────────────
   메인 컴포넌트
───────────────────────────────────────────── */
export default function LoginScreen() {
  const router = useRouter();
  const [emailFocused, setEmailFocused] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);        // ① 로딩 상태
  const [errorMsg, setErrorMsg] = useState("");         // 에러 메시지
  const [googleLoading, setGoogleLoading] = useState(false); // ✅ 구글 로그인 로딩

  // ② 키보드 다음 필드 이동용 ref
  const pwRef = useRef<TextInput>(null);

  // ③ 유효성 검사 — 이메일 형식 + 비밀번호 6자 이상
  const isValid = emailRegex.test(email.trim()) && password.length >= 6;

  // ✅ Google 로그인 요청 설정
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: googleWebClientId,
    androidClientId: googleAndroidClientId,
    iosClientId: googleIosClientId,
  });

  // ✅ Google 로그인 응답 처리
  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (response?.type === "success") {
        try {
          setGoogleLoading(true);
          setErrorMsg("");

          const { id_token } = response.params;

          if (!id_token) {
            setErrorMsg("구글 인증 정보를 가져오지 못했습니다.");
            return;
          }

          const credential = GoogleAuthProvider.credential(id_token);
          const result = await signInWithCredential(auth, credential);
          await persistUserProfile(result.user, "Google 회원");

          router.replace("/main");
        } catch (e) {
          console.warn("Google 로그인 에러:", e);
          setErrorMsg("구글 로그인에 실패했습니다. 다시 시도해주세요.");
        } finally {
          setGoogleLoading(false);
        }
      } else if (response?.type === "error") {
        setErrorMsg("구글 로그인이 취소되었거나 실패했습니다.");
        setGoogleLoading(false);
      }
    };

    handleGoogleResponse();
  }, [response, router]);

  // ✅ Google 로그인 버튼 핸들러
  const handleGoogleLogin = async () => {
    if (!request || googleLoading) return;
    setErrorMsg("");
    try {
      setGoogleLoading(true);
      await promptAsync();
    } catch (e) {
      console.warn("promptAsync 에러:", e);
      setErrorMsg("구글 로그인을 시작할 수 없습니다.");
      setGoogleLoading(false);
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
      router.replace("/main");
    } catch (error: any) {
      setErrorMsg(getLoginErrorMessage(error?.code));
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
      <StatusBar style="light" />

      {/* 배경 그라디언트 장식 */}
      <View style={s.bgCircle1} />
      <View style={s.bgCircle2} />

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
                  color={emailFocused ? "#000" : "#000"}
                />
              </View>
              <TextInput
                style={s.fieldInput}
                placeholder="이메일 주소"
                placeholderTextColor="#000"
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
                  color={pwFocused ? "#000" : "#000"}
                />
              </View>
              <TextInput
                ref={pwRef}                                   // ② ref 연결
                style={s.fieldInput}
                placeholder="비밀번호 (6자 이상)"
                placeholderTextColor="#000"
                secureTextEntry={!showPw}
                returnKeyType="done"                          // ② 키보드 done 버튼
                onSubmitEditing={handleLogin}                 // ② done 누르면 로그인
                value={password}
                onChangeText={(t) => { setPassword(t); setErrorMsg(""); }}
                onFocus={() => setPwFocused(true)}
                onBlur={() => setPwFocused(false)}
              />
              <TouchableOpacity
                style={s.eyeBtn}
                onPress={() => setShowPw(!showPw)}
              >
                <Ionicons
                  name={showPw ? "eye-outline" : "eye-off-outline"}
                  size={18}
                  color="#000"
                />
              </TouchableOpacity>
            </View>

            {/* 에러 메시지 */}
            {errorMsg ? (
              <View style={s.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color="#000" />
                <Text style={s.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            {/* 비밀번호 찾기 */}
            <TouchableOpacity
              style={s.forgotRow}
              onPress={() => router.push("/password")}
            >
              <Text style={s.forgotText}>비밀번호를 잊으셨나요?</Text>
            </TouchableOpacity>

            {/* 로그인 버튼 — isValid 따라 스타일/동작 분기 */}
            <TouchableOpacity
              activeOpacity={isValid ? 0.85 : 1}
              style={[s.loginBtn, !isValid && s.loginBtnDisabled]}  // ③ 비활성 스타일
              onPress={handleLogin}
              disabled={!isValid || loading}                         // ① 중복 클릭 방지
            >
              {loading ? (                                           // ① 로딩 스피너
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <>
                  <Text style={[s.loginBtnText, !isValid && s.loginBtnTextDisabled]}>
                    로그인
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color="#000"
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
                name="logo-google"
                bg="#fff"
                iconColor="#000"
                onPress={handleGoogleLogin}
                disabled={!request || googleLoading}
                loading={googleLoading}
              />
              <SocialIconBtn
                name="chatbubble"
                bg="#fff"
                iconColor="#000"
                onPress={() => {}}
              />
              <SocialIconBtn
                name="logo-apple"
                bg="#fff"
                iconColor="#000"
                onPress={() => {}}
              />
            </View>
          </View>

          {/* ── 회원가입 ── */}
          <View style={s.signupRow}>
            <Text style={s.signupText}>아직 계정이 없으신가요?</Text>
            <TouchableOpacity onPress={() => router.push("/signup")}>
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
  name,
  bg,
  iconColor,
  onPress,
  disabled = false,
  loading = false,
}: {
  name: keyof typeof Ionicons.glyphMap;
  bg: string;
  iconColor: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) => (
  <TouchableOpacity
    activeOpacity={0.8}
    style={[sis.btn, { backgroundColor: bg }, disabled && sis.btnDisabled]}
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

const sis = StyleSheet.create({
  btn: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#000",
  },
  btnDisabled: {
    opacity: 0.6,
  },
});

/* ─────────────────────────────────────────────
   스타일
───────────────────────────────────────────── */
const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  kav: { flex: 1 },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },

  /* 배경 장식 원 */
  bgCircle1: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "#fff",
    opacity: 0.25,
    top: -80,
    right: -100,
  },
  bgCircle2: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#fff",
    opacity: 0.3,
    bottom: 40,
    left: -60,
  },

  /* 헤더 */
  header: { marginBottom: 32 },
  badgeRow: { flexDirection: "row", marginBottom: 14 },
  badge: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#000",
  },
  badgeText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  logo: {
    fontSize: 40,
    fontWeight: "900",
    color: "#000",
    letterSpacing: -1,
  },
  sub: {
    color: "#000",
    fontSize: 14,
    marginTop: 4,
    fontWeight: "500",
  },

  /* 카드 */
  card: {
    backgroundColor: "#fff",
    borderRadius: 28,
    padding: 24,
    borderWidth: 1,
    borderColor: "#000",
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
  },

  /* 입력 필드 */
  field: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#000",
    overflow: "hidden",
  },
  fieldFocused: {
    borderColor: "#000",
    backgroundColor: "#fff",
  },
  fieldIcon: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#000",
    height: 52,
  },
  fieldIconActive: {
    borderRightColor: "#000",
    backgroundColor: "#fff",
  },
  fieldInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 14,
    color: "#000",
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
    color: "#000",
    fontSize: 12,
    fontWeight: "500",
  },

  /* 비밀번호 찾기 */
  forgotRow: { alignItems: "flex-end", marginBottom: 20, marginTop: 2 },
  forgotText: { color: "#000", fontSize: 13, fontWeight: "600" },

  /* 로그인 버튼 */
  loginBtn: {
    backgroundColor: "#fff",
    borderRadius: 16,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#000",
  },
  loginBtnDisabled: {
    backgroundColor: "#fff",
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: "#000",
  },
  loginBtnText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  loginBtnTextDisabled: {
    color: "#000",
  },

  /* 구분선 */
  divider: {
    display: "none",
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 22,
  },
  divLine: { flex: 1, height: 1, backgroundColor: "#fff" },
  divText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "600",
    marginHorizontal: 12,
    letterSpacing: 0.5,
  },

  /* 소셜 아이콘 행 */
  socialRow: {
    display: "none",
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
  signupText: { color: "#000", fontSize: 14 },
  signupLink: {
    color: "#000",
    fontSize: 14,
    fontWeight: "700",
  },
});
