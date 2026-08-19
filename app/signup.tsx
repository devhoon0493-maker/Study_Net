import { Ionicons } from "@expo/vector-icons";
import { useRouter, type Href } from "expo-router";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  signInWithCredential,
  updateProfile,
} from "firebase/auth";
import { ref, set } from "firebase/database";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useMonoTheme, type MonoTheme } from "../constants/mono";
import { getErrorCode } from "../utils/errorMessages";
import { auth, db } from "../utils/firebaseConfig";
import { publicProfileUpdate } from "../utils/publicProfile";
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

WebBrowser.maybeCompleteAuthSession();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const userTypes = ["초등학생", "중학생", "고등학생", "대학생", "취준생", "직장인"];

const getSignupErrorMessage = (code?: string) => {
  switch (code) {
    case "auth/email-already-in-use":
      return "이미 가입된 이메일이에요.";
    case "auth/invalid-email":
      return "이메일 형식이 올바르지 않아요.";
    case "auth/weak-password":
      return "비밀번호는 6자 이상으로 입력해주세요.";
    case "auth/network-request-failed":
      return "네트워크 연결을 확인해주세요.";
    default:
      return "회원가입에 실패했어요. 잠시 후 다시 시도해주세요.";
  }
};

export default function SignupScreen() {
  const router = useRouter();
  const { theme: C } = useMonoTheme();
  const s = useMemo(() => createStyles(C), [C]);
  const { height } = useWindowDimensions();
  const compact = height < 760;
  const veryCompact = height < 700;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userType, setUserType] = useState(userTypes[2]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [privacyAgreed, setPrivacyAgreed] = useState(false);

  const [kakaoRequest, kakaoResponse, promptKakaoAsync] =
    AuthSession.useAuthRequest(kakaoAuthRequestConfig, {
      authorizationEndpoint: "https://kauth.kakao.com/oauth/authorize",
      tokenEndpoint: "https://kauth.kakao.com/oauth/token",
    });

  const isValid = useMemo(
    () =>
      name.trim().length >= 2 &&
      emailRegex.test(email.trim()) &&
      password.length >= 6 &&
      password === confirmPassword &&
      !!userType &&
      privacyAgreed,
    [confirmPassword, email, name, password, privacyAgreed, userType],
  );

  const saveUserProfile = async (profile: {
    uid: string;
    name: string;
    email: string;
    image: string | null;
    userType: string;
    createdAt: number;
    privacyPolicyAgreedAt: number;
  }) => {
    await Promise.all([
      set(ref(db, `users/${profile.uid}`), profile),
      set(
        ref(db, `publicProfiles/${profile.uid}`),
        publicProfileUpdate(profile.uid, profile)[`publicProfiles/${profile.uid}`],
      ),
      saveStoredUserProfile(profile),
    ]);
  };

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
          const fallbackName = user.email?.split("@")[0] || "Study User";
          const agreedAt = Date.now();

          await saveUserProfile({
            uid: user.uid,
            name: user.displayName || fallbackName,
            email: user.email || "",
            image: user.photoURL || null,
            userType,
            createdAt: agreedAt,
            privacyPolicyAgreedAt: agreedAt,
          });

          router.replace("/main");
        } catch (error) {
          console.warn("Kakao signup error:", error);
          setErrorMsg(getKakaoAuthErrorMessage(error));
        } finally {
          setKakaoLoading(false);
        }
      } else if (kakaoResponse?.type === "error") {
        setErrorMsg("Kakao 회원가입이 취소되었거나 실패했어요.");
        setKakaoLoading(false);
      }
    };

    handleKakaoResponse();
  }, [kakaoRequest, kakaoResponse, router, userType]);

  const handleSignup = async () => {
    if (loading) return;

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2) {
      setErrorMsg("이름은 2자 이상 입력해주세요.");
      return;
    }
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMsg("이메일 형식이 올바르지 않아요.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("비밀번호는 6자 이상으로 입력해주세요.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("비밀번호가 서로 일치하지 않아요.");
      return;
    }
    if (!privacyAgreed) {
      setErrorMsg("개인정보 처리방침에 동의해주세요.");
      return;
    }

    try {
      setLoading(true);
      setErrorMsg("");
      const agreedAt = Date.now();

      const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      await updateProfile(credential.user, { displayName: trimmedName });

      const profile = {
        uid: credential.user.uid,
        name: trimmedName,
        email: trimmedEmail,
        image: null,
        userType,
        createdAt: agreedAt,
        privacyPolicyAgreedAt: agreedAt,
      };

      await saveUserProfile(profile);

      await sendEmailVerification(credential.user);
      router.replace({
        pathname: "/verify-email",
        params: { email: trimmedEmail },
      } as unknown as Href);
    } catch (error) {
      setErrorMsg(getSignupErrorMessage(getErrorCode(error)));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (googleLoading) return;
    if (!privacyAgreed) {
      setErrorMsg("개인정보 처리방침에 동의해주세요.");
      return;
    }
    if (!isGoogleAuthSupportedInCurrentRuntime()) {
      setErrorMsg(getGoogleRuntimeErrorMessage());
      return;
    }

    try {
      setGoogleLoading(true);
      setErrorMsg("");

      const idToken = await signInWithGoogle();
      if (!idToken) return;

      const credential = GoogleAuthProvider.credential(idToken);
      const result = await signInWithCredential(auth, credential);
      const user = result.user;
      const fallbackName = user.email?.split("@")[0] || "Study User";
      const agreedAt = Date.now();

      await saveUserProfile({
        uid: user.uid,
        name: user.displayName || fallbackName,
        email: user.email || "",
        image: user.photoURL || null,
        userType,
        createdAt: agreedAt,
        privacyPolicyAgreedAt: agreedAt,
      });

      router.replace("/main");
    } catch (error) {
      console.warn("Google signup error:", error);
      setErrorMsg(getGoogleAuthErrorMessage(error));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleKakaoSignup = async () => {
    if (kakaoLoading) return;
    if (!privacyAgreed) {
      setErrorMsg("개인정보 처리방침에 동의해주세요.");
      return;
    }
    if (!isKakaoConfigured()) {
      setErrorMsg(getKakaoConfigErrorMessage());
      return;
    }
    if (!kakaoRequest) return;

    try {
      setKakaoLoading(true);
      setErrorMsg("");
      await promptKakaoAsync();
    } catch (error) {
      console.warn("Kakao prompt error:", error);
      setErrorMsg("Kakao 회원가입을 시작하지 못했어요.");
      setKakaoLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.kav}
      >
        <View style={[s.content, compact && s.contentCompact, veryCompact && s.contentVeryCompact]}>
          <TouchableOpacity
            testID="signup-back-button"
            style={[s.backButton, compact && s.backButtonCompact]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={C.text} />
          </TouchableOpacity>

          <View style={[s.header, compact && s.headerCompact]}>
            <Text style={s.title}>StudyNet 시작하기</Text>
            {!veryCompact && (
              <Text style={s.subtitle}>계정을 만들고 오늘의 공부를 기록해보세요.</Text>
            )}
          </View>

          <View style={[s.card, compact && s.cardCompact]}>
            <View style={[s.field, compact && s.fieldCompact]}>
              <Ionicons name="person-outline" size={18} color={C.text} />
              <TextInput
                testID="signup-name-input"
                style={s.input}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setErrorMsg("");
                }}
                placeholder="이름"
                placeholderTextColor={C.subtle}
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>

            <View style={[s.field, compact && s.fieldCompact]}>
              <Ionicons name="mail-outline" size={18} color={C.text} />
              <TextInput
                testID="signup-email-input"
                style={s.input}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrorMsg("");
                }}
                placeholder="이메일 주소"
                placeholderTextColor={C.subtle}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={[s.field, compact && s.fieldCompact]}>
              <Ionicons name="lock-closed-outline" size={18} color={C.text} />
              <TextInput
                testID="signup-password-input"
                style={s.input}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrorMsg("");
                }}
                placeholder="비밀번호 6자 이상"
                placeholderTextColor={C.subtle}
                secureTextEntry={!showPassword}
                returnKeyType="next"
              />
              <TouchableOpacity
                testID="signup-password-visibility-button"
                onPress={() => setShowPassword((v) => !v)}
                style={s.eyeBtn}
              >
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={18} color={C.text} />
              </TouchableOpacity>
            </View>

            <View style={[s.field, compact && s.fieldCompact]}>
              <Ionicons name="shield-checkmark-outline" size={18} color={C.text} />
              <TextInput
                testID="signup-confirm-password-input"
                style={s.input}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setErrorMsg("");
                }}
                placeholder="비밀번호 확인"
                placeholderTextColor={C.subtle}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleSignup}
              />
            </View>

            <View style={s.typeSection}>
              <Text style={s.typeLabel}>사용자 유형</Text>
              <View style={s.typeGrid}>
                {userTypes.map((type) => {
                  const active = userType === type;

                  return (
                    <TouchableOpacity
                      testID={`signup-user-type-${type}`}
                      key={type}
                      style={[s.typeChip, active && s.typeChipActive]}
                      onPress={() => {
                        setUserType(type);
                        setErrorMsg("");
                      }}
                      activeOpacity={0.82}
                    >
                      <Text style={[s.typeChipText, active && s.typeChipTextActive]}>{type}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity
              testID="signup-privacy-agreement-button"
              style={s.agreementRow}
              onPress={() => {
                setPrivacyAgreed((value) => !value);
                setErrorMsg("");
              }}
              activeOpacity={0.82}
            >
              <View style={[s.checkBox, privacyAgreed && s.checkBoxActive]}>
                {privacyAgreed && (
                  <Ionicons name="checkmark" size={15} color={C.inverse} />
                )}
              </View>
              <Text style={s.agreementText}>
                개인정보 처리방침에 동의합니다
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="signup-privacy-link"
              style={s.policyLinkButton}
              onPress={() => router.push("/setting/privacy")}
              activeOpacity={0.75}
            >
              <Text style={s.policyLinkText}>개인정보 처리방침 보기</Text>
            </TouchableOpacity>

            {errorMsg ? (
              <View style={s.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color={C.danger} />
                <Text style={s.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              testID="signup-submit-button"
              style={[s.submitBtn, compact && s.submitBtnCompact, !isValid && s.submitBtnDisabled]}
              activeOpacity={isValid ? 0.85 : 1}
              disabled={!isValid || loading}
              onPress={handleSignup}
            >
              {loading ? (
                <ActivityIndicator color={C.inverse} />
              ) : (
                <>
                  <Text style={s.submitText}>회원가입</Text>
                  <Ionicons name="arrow-forward" size={18} color={C.inverse} />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={[s.divider, compact && s.dividerCompact]}>
            <View style={s.line} />
            <Text style={s.dividerText}>간편 가입</Text>
            <View style={s.line} />
          </View>

          <View style={s.providerRow}>
            <TouchableOpacity
              testID="signup-google-button"
              style={[s.providerBtn, compact && s.providerBtnCompact, googleLoading && s.providerBtnDisabled]}
              onPress={handleGoogleSignup}
              activeOpacity={!googleLoading ? 0.75 : 1}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color={C.text} size="small" />
              ) : (
                <Ionicons name="logo-google" size={18} color={C.text} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              testID="signup-kakao-button"
              style={[s.providerBtn, compact && s.providerBtnCompact, kakaoLoading && s.providerBtnDisabled]}
              onPress={handleKakaoSignup}
              activeOpacity={kakaoRequest && !kakaoLoading ? 0.75 : 1}
              disabled={!kakaoRequest || kakaoLoading}
            >
              {kakaoLoading ? (
                <ActivityIndicator color={C.text} size="small" />
              ) : (
                <Ionicons name="chatbubble" size={18} color={C.text} />
              )}
            </TouchableOpacity>
          </View>

          <View style={[s.loginRow, compact && s.loginRowCompact]}>
            <Text style={s.loginText}>이미 계정이 있으신가요?</Text>
            <TouchableOpacity
              testID="signup-login-link"
              onPress={() => router.replace("/login")}
            >
              <Text style={s.loginLink}> 로그인</Text>
            </TouchableOpacity>
          </View>

          {!veryCompact && (
            <Text style={s.notice}>
              동의 내용은 계정 프로필에 저장되며 설정에서 개인정보 처리방침을 다시 확인할 수 있습니다.
            </Text>
          )}
        </View>
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
  kav: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 14,
    paddingBottom: 18,
    justifyContent: "center",
  },
  contentCompact: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 10,
  },
  contentVeryCompact: {
    paddingHorizontal: 22,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },
  backButtonCompact: {
    width: 38,
    height: 38,
    borderRadius: 11,
    marginBottom: 14,
  },
  header: {
    marginBottom: 22,
  },
  headerCompact: {
    marginBottom: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: C.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: C.muted,
    lineHeight: 20,
  },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderBottomWidth: 4,
    borderColor: C.border,
    borderRadius: 18,
    padding: 18,
  },
  cardCompact: {
    borderRadius: 16,
    padding: 14,
  },
  field: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: C.surface,
  },
  fieldCompact: {
    minHeight: 46,
    marginBottom: 9,
    borderRadius: 11,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: C.text,
    fontSize: 14,
    fontWeight: "600",
  },
  eyeBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  typeSection: {
    marginBottom: 12,
  },
  typeLabel: {
    color: C.text,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 8,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  typeChip: {
    minHeight: 38,
    flexBasis: "30%",
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: C.border,
    borderRadius: 10,
    backgroundColor: C.surface,
    paddingHorizontal: 8,
  },
  typeChipActive: {
    backgroundColor: C.primary,
  },
  typeChipText: {
    color: C.text,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  typeChipTextActive: {
    color: C.inverse,
  },
  agreementRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: C.surfaceAlt,
  },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.surfaceAlt,
  },
  checkBoxActive: {
    backgroundColor: C.primary,
  },
  agreementText: {
    flex: 1,
    color: C.text,
    fontSize: 12,
    fontWeight: "800",
  },
  policyLinkButton: {
    alignSelf: "flex-start",
    minHeight: 28,
    justifyContent: "center",
    marginTop: -6,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  policyLinkText: {
    color: C.primary,
    fontSize: 12,
    fontWeight: "900",
    textDecorationLine: "underline",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    color: C.danger,
    fontSize: 12,
    lineHeight: 17,
  },
  submitBtn: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderBottomWidth: 4,
    borderColor: C.primary,
    borderRadius: 14,
    backgroundColor: C.primary,
  },
  submitBtnCompact: {
    height: 48,
    borderRadius: 12,
  },
  submitBtnDisabled: {
    opacity: 0.42,
  },
  submitText: {
    color: C.inverse,
    fontSize: 15,
    fontWeight: "900",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 24,
    marginBottom: 14,
  },
  dividerCompact: {
    marginTop: 14,
    marginBottom: 10,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    color: C.text,
    fontWeight: "800",
  },
  providerRow: {
    flexDirection: "row",
    gap: 10,
  },
  providerBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: C.border,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.surface,
  },
  providerBtnCompact: {
    height: 42,
    borderRadius: 11,
  },
  providerBtnDisabled: {
    opacity: 0.55,
  },
  loginRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },
  loginRowCompact: {
    marginTop: 14,
  },
  loginText: {
    color: C.text,
    fontSize: 13,
  },
  loginLink: {
    color: C.text,
    fontSize: 13,
    fontWeight: "900",
  },
  notice: {
    marginTop: 20,
    fontSize: 11,
    color: C.text,
    textAlign: "center",
    lineHeight: 18,
  },
});
