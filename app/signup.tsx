import { RADIUS, SPACE, TYPE_SIZE, TYPE_WEIGHT } from "../constants/designTokens";
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
  ScrollView,
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
  getAppleAuthErrorMessage,
  getAppleRuntimeErrorMessage,
  isAppleAuthAvailable,
  signInWithApple,
} from "../utils/appleAuth";
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
  const short = height < 640;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userType, setUserType] = useState(userTypes[2]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
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
    await saveStoredUserProfile(profile).catch((error) => {
      console.warn("Local profile cache after signup failed:", error);
    });

    try {
      await Promise.all([
        set(ref(db, `users/${profile.uid}`), profile),
        set(
          ref(db, `publicProfiles/${profile.uid}`),
          publicProfileUpdate(profile.uid, profile)[`publicProfiles/${profile.uid}`],
        ),
      ]);
    } catch (error) {
      console.warn("Profile sync after signup failed:", error);
    }
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

  const handleAppleSignup = async () => {
    if (appleLoading) return;
    if (!privacyAgreed) {
      setErrorMsg("개인정보 처리방침에 동의해주세요.");
      return;
    }

    try {
      setAppleLoading(true);
      setErrorMsg("");
      const available = await isAppleAuthAvailable();
      if (!available) {
        setErrorMsg(getAppleRuntimeErrorMessage());
        return;
      }

      const result = await signInWithApple();
      const user = result.user;
      const email = user.email || result.email || "";
      const fallbackName = email.split("@")[0] || "Study User";
      const agreedAt = Date.now();

      await saveUserProfile({
        uid: user.uid,
        name: user.displayName || result.fullName || fallbackName,
        email,
        image: user.photoURL || null,
        userType,
        createdAt: agreedAt,
        privacyPolicyAgreedAt: agreedAt,
      });

      router.replace("/main");
    } catch (error) {
      console.warn("Apple signup error:", error);
      setErrorMsg(getAppleAuthErrorMessage(error));
    } finally {
      setAppleLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={C.statusBar} backgroundColor={C.bg} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.kav}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            s.content,
            compact && s.contentCompact,
            veryCompact && s.contentVeryCompact,
            short && s.contentShort,
          ]}
        >
          <View style={[s.topBar, compact && s.topBarCompact, short && s.topBarShort]}>
            <TouchableOpacity
              testID="signup-back-button"
              style={[
                s.backButton,
                compact && s.backButtonCompact,
                short && s.backButtonShort,
              ]}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={short ? 20 : 24} color={C.text} />
            </TouchableOpacity>
            <Text testID="signup-screen-title" style={[s.topTitle, short && s.topTitleShort]}>
              회원가입
            </Text>
            <View style={[s.topSpacer, compact && s.topSpacerCompact, short && s.topSpacerShort]} />
          </View>

          <View style={[s.card, compact && s.cardCompact, short && s.cardShort]}>
            <View style={[s.field, compact && s.fieldCompact, short && s.fieldShort]}>
              <Ionicons name="person-outline" size={short ? 16 : 18} color={C.text} />
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

            <View style={[s.field, compact && s.fieldCompact, short && s.fieldShort]}>
              <Ionicons name="mail-outline" size={short ? 16 : 18} color={C.text} />
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

            <View style={[s.field, compact && s.fieldCompact, short && s.fieldShort]}>
              <Ionicons name="lock-closed-outline" size={short ? 16 : 18} color={C.text} />
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
                style={[s.eyeBtn, short && s.eyeBtnShort]}
              >
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={short ? 16 : 18} color={C.text} />
              </TouchableOpacity>
            </View>

            <View style={[s.field, compact && s.fieldCompact, short && s.fieldShort]}>
              <Ionicons name="shield-checkmark-outline" size={short ? 16 : 18} color={C.text} />
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

            <View style={[s.typeSection, short && s.typeSectionShort]}>
              <Text style={[s.typeLabel, short && s.typeLabelShort]}>사용자 유형</Text>
              <View style={[s.typeGrid, short && s.typeGridShort]}>
                {userTypes.map((type) => {
                  const active = userType === type;

                  return (
                    <TouchableOpacity
                      testID={`signup-user-type-${type}`}
                      key={type}
                      style={[
                        s.typeChip,
                        short && s.typeChipShort,
                        active && s.typeChipActive,
                      ]}
                      onPress={() => {
                        setUserType(type);
                        setErrorMsg("");
                      }}
                      activeOpacity={0.82}
                    >
                      <Text
                        style={[
                          s.typeChipText,
                          short && s.typeChipTextShort,
                          active && s.typeChipTextActive,
                        ]}
                      >
                        {type}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <TouchableOpacity
              testID="signup-privacy-agreement-button"
              style={[s.agreementRow, short && s.agreementRowShort]}
              onPress={() => {
                setPrivacyAgreed((value) => !value);
                setErrorMsg("");
              }}
              activeOpacity={0.82}
            >
              <View style={[s.checkBox, short && s.checkBoxShort, privacyAgreed && s.checkBoxActive]}>
                {privacyAgreed && (
                  <Ionicons name="checkmark" size={short ? 13 : 15} color={C.inverse} />
                )}
              </View>
              <Text style={s.agreementText}>
                개인정보 처리방침에 동의합니다
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="signup-privacy-link"
              style={[s.policyLinkButton, short && s.policyLinkButtonShort]}
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
              style={[
                s.submitBtn,
                compact && s.submitBtnCompact,
                short && s.submitBtnShort,
                !isValid && s.submitBtnDisabled,
              ]}
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

          <View style={[s.divider, compact && s.dividerCompact, short && s.dividerShort]}>
            <View style={s.line} />
            <Text style={s.dividerText}>간편 가입</Text>
            <View style={s.line} />
          </View>

          <View style={s.providerRow}>
            <TouchableOpacity
              testID="signup-google-button"
              style={[
                s.providerBtn,
                compact && s.providerBtnCompact,
                short && s.providerBtnShort,
                googleLoading && s.providerBtnDisabled,
              ]}
              onPress={handleGoogleSignup}
              activeOpacity={!googleLoading ? 0.75 : 1}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color={C.text} size="small" />
              ) : (
                <Ionicons name="logo-google" size={short ? 17 : 18} color={C.text} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              testID="signup-apple-button"
              style={[
                s.providerBtn,
                compact && s.providerBtnCompact,
                short && s.providerBtnShort,
                appleLoading && s.providerBtnDisabled,
              ]}
              onPress={handleAppleSignup}
              activeOpacity={!appleLoading ? 0.75 : 1}
              disabled={appleLoading}
            >
              {appleLoading ? (
                <ActivityIndicator color={C.text} size="small" />
              ) : (
                <Ionicons name="logo-apple" size={short ? 17 : 18} color={C.text} />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              testID="signup-kakao-button"
              style={[
                s.providerBtn,
                compact && s.providerBtnCompact,
                short && s.providerBtnShort,
                kakaoLoading && s.providerBtnDisabled,
              ]}
              onPress={handleKakaoSignup}
              activeOpacity={kakaoRequest && !kakaoLoading ? 0.75 : 1}
              disabled={!kakaoRequest || kakaoLoading}
            >
              {kakaoLoading ? (
                <ActivityIndicator color={C.text} size="small" />
              ) : (
                <Ionicons name="chatbubble" size={short ? 17 : 18} color={C.text} />
              )}
            </TouchableOpacity>
          </View>

          <View style={[s.loginRow, compact && s.loginRowCompact, short && s.loginRowShort]}>
            <Text style={s.loginText}>이미 계정이 있으신가요?</Text>
            <TouchableOpacity
              testID="signup-login-link"
              onPress={() => router.replace("/login")}
            >
              <Text style={s.loginLink}> 로그인</Text>
            </TouchableOpacity>
          </View>

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
  kav: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: SPACE.md,
    paddingBottom: 18,
    justifyContent: "center",
  },
  contentCompact: {
    paddingHorizontal: SPACE.xl,
    paddingTop: SPACE.sm,
    paddingBottom: 10,
  },
  contentVeryCompact: {
    paddingHorizontal: 22,
  },
  contentShort: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: SPACE.sm,
  },
  topBar: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  topBarCompact: {
    minHeight: 40,
    marginBottom: 10,
  },
  topBarShort: {
    minHeight: 34,
    marginBottom: 7,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: C.border,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 0,
  },
  backButtonCompact: {
    width: 38,
    height: 38,
    borderRadius: 11,
    marginBottom: 0,
  },
  backButtonShort: {
    width: 32,
    height: 32,
    borderRadius: 9,
    marginBottom: 0,
  },
  topTitle: {
    color: C.text,
    fontSize: TYPE_SIZE.titleSmall,
    fontWeight: TYPE_WEIGHT.heavy,
  },
  topTitleShort: {
    fontSize: TYPE_SIZE.bodyStrong,
  },
  topSpacer: {
    width: 42,
    height: 42,
  },
  topSpacerCompact: {
    width: 38,
    height: 38,
  },
  topSpacerShort: {
    width: 32,
    height: 32,
  },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderBottomWidth: 4,
    borderColor: C.border,
    borderRadius: RADIUS.card,
    padding: 18,
  },
  cardCompact: {
    borderRadius: RADIUS.lg,
    padding: 14,
  },
  cardShort: {
    borderRadius: RADIUS.control,
    padding: 10,
  },
  field: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    marginBottom: SPACE.md,
    backgroundColor: C.surface,
  },
  fieldCompact: {
    minHeight: 46,
    marginBottom: 9,
    borderRadius: 11,
    paddingHorizontal: SPACE.md,
  },
  fieldShort: {
    minHeight: 38,
    marginBottom: 6,
    borderRadius: 9,
    paddingHorizontal: 10,
    gap: SPACE.sm,
  },
  input: {
    flex: 1,
    minWidth: 0,
    color: C.text,
    fontSize: TYPE_SIZE.body,
    fontWeight: TYPE_WEIGHT.semibold,
  },
  eyeBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  eyeBtnShort: {
    width: 28,
    height: 28,
  },
  typeSection: {
    marginBottom: SPACE.md,
  },
  typeSectionShort: {
    marginBottom: 6,
  },
  typeLabel: {
    color: C.text,
    fontSize: TYPE_SIZE.label,
    fontWeight: TYPE_WEIGHT.heavy,
    marginBottom: SPACE.sm,
  },
  typeLabelShort: {
    fontSize: TYPE_SIZE.captionLarge,
    marginBottom: SPACE.xs,
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACE.sm,
  },
  typeGridShort: {
    gap: 6,
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
    borderRadius: RADIUS.compact,
    backgroundColor: C.surface,
    paddingHorizontal: SPACE.sm,
  },
  typeChipShort: {
    minHeight: 28,
    borderBottomWidth: 2,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACE.xs,
  },
  typeChipActive: {
    backgroundColor: C.primary,
  },
  typeChipText: {
    color: C.text,
    fontSize: TYPE_SIZE.label,
    fontWeight: TYPE_WEIGHT.strong,
    textAlign: "center",
  },
  typeChipTextShort: {
    fontSize: TYPE_SIZE.captionLarge,
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
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACE.md,
    marginBottom: SPACE.md,
    backgroundColor: C.surfaceAlt,
  },
  agreementRowShort: {
    minHeight: 34,
    borderBottomWidth: 2,
    borderRadius: 9,
    paddingHorizontal: 10,
    marginBottom: 6,
    gap: 7,
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
  checkBoxShort: {
    width: 20,
    height: 20,
    borderRadius: 6,
  },
  checkBoxActive: {
    backgroundColor: C.primary,
  },
  agreementText: {
    flex: 1,
    color: C.text,
    fontSize: TYPE_SIZE.label,
    fontWeight: TYPE_WEIGHT.strong,
  },
  policyLinkButton: {
    alignSelf: "flex-start",
    minHeight: 28,
    justifyContent: "center",
    marginTop: -6,
    marginBottom: SPACE.md,
    paddingHorizontal: 2,
  },
  policyLinkButtonShort: {
    minHeight: 22,
    marginTop: -4,
    marginBottom: 6,
  },
  policyLinkText: {
    color: C.primary,
    fontSize: TYPE_SIZE.label,
    fontWeight: TYPE_WEIGHT.heavy,
    textDecorationLine: "underline",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: RADIUS.compact,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: SPACE.md,
  },
  errorText: {
    flex: 1,
    color: C.danger,
    fontSize: TYPE_SIZE.label,
    lineHeight: 17,
  },
  submitBtn: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE.sm,
    borderWidth: 1,
    borderBottomWidth: 4,
    borderColor: C.primary,
    borderRadius: RADIUS.control,
    backgroundColor: C.primary,
  },
  submitBtnCompact: {
    height: 48,
    borderRadius: RADIUS.md,
  },
  submitBtnShort: {
    height: 38,
    borderBottomWidth: 2,
    borderRadius: RADIUS.compact,
  },
  submitBtnDisabled: {
    opacity: 0.42,
  },
  submitText: {
    color: C.inverse,
    fontSize: TYPE_SIZE.bodyStrong,
    fontWeight: TYPE_WEIGHT.heavy,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: SPACE.xl,
    marginBottom: 14,
  },
  dividerCompact: {
    marginTop: 14,
    marginBottom: 10,
  },
  dividerShort: {
    marginTop: SPACE.sm,
    marginBottom: 6,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: TYPE_SIZE.label,
    color: C.text,
    fontWeight: TYPE_WEIGHT.strong,
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
    borderRadius: RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: C.surface,
  },
  providerBtnCompact: {
    height: 42,
    borderRadius: 11,
  },
  providerBtnShort: {
    height: 36,
    borderBottomWidth: 2,
    borderRadius: 9,
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
  loginRowShort: {
    marginTop: SPACE.sm,
  },
  loginText: {
    color: C.text,
    fontSize: TYPE_SIZE.bodySmall,
  },
  loginLink: {
    color: C.text,
    fontSize: TYPE_SIZE.bodySmall,
    fontWeight: TYPE_WEIGHT.heavy,
  },
  notice: {
    marginTop: 20,
    fontSize: TYPE_SIZE.captionLarge,
    color: C.text,
    textAlign: "center",
    lineHeight: 18,
  },
});
