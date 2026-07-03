import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  updateProfile,
} from "firebase/auth";
import { ref, set } from "firebase/database";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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

import { auth, db } from "../utils/firebaseConfig";

WebBrowser.maybeCompleteAuthSession();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const googleWebClientId = "713632998369-g276ekeqbra47uag5lttt8i5fb766mft.apps.googleusercontent.com";
const googleAndroidClientId = "713632998369-kplb0uk05k8peh43s48l6guidgn27pl5.apps.googleusercontent.com";
const googleIosClientId = googleWebClientId;
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
  const [errorMsg, setErrorMsg] = useState("");

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: googleWebClientId,
    androidClientId: googleAndroidClientId,
    iosClientId: googleIosClientId,
  });

  const isValid = useMemo(
    () =>
      name.trim().length >= 2 &&
      emailRegex.test(email.trim()) &&
      password.length >= 6 &&
      password === confirmPassword &&
      !!userType,
    [confirmPassword, email, name, password, userType],
  );

  const saveUserProfile = async (profile: {
    uid: string;
    name: string;
    email: string;
    image: string | null;
    userType: string;
    createdAt: number;
  }) => {
    await Promise.all([
      set(ref(db, `users/${profile.uid}`), profile),
      AsyncStorage.setItem("userProfile", JSON.stringify(profile)),
    ]);
  };

  useEffect(() => {
    const handleGoogleResponse = async () => {
      if (response?.type === "success") {
        try {
          setGoogleLoading(true);
          setErrorMsg("");

          const { id_token } = response.params;
          if (!id_token) {
            setErrorMsg("Google 인증 정보를 가져오지 못했어요.");
            return;
          }

          const credential = GoogleAuthProvider.credential(id_token);
          const result = await signInWithCredential(auth, credential);
          const user = result.user;
          const fallbackName = user.email?.split("@")[0] || "Study User";

          await saveUserProfile({
            uid: user.uid,
            name: user.displayName || fallbackName,
            email: user.email || "",
            image: user.photoURL || null,
            userType,
            createdAt: Date.now(),
          });

          router.replace("/main");
        } catch (error) {
          console.warn("Google signup error:", error);
          setErrorMsg("Google 회원가입에 실패했어요. 다시 시도해주세요.");
        } finally {
          setGoogleLoading(false);
        }
      } else if (response?.type === "error") {
        setErrorMsg("Google 회원가입이 취소되었거나 실패했어요.");
        setGoogleLoading(false);
      }
    };

    handleGoogleResponse();
  }, [response, router, userType]);

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

    try {
      setLoading(true);
      setErrorMsg("");

      const credential = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
      await updateProfile(credential.user, { displayName: trimmedName });

      const profile = {
        uid: credential.user.uid,
        name: trimmedName,
        email: trimmedEmail,
        image: null,
        userType,
        createdAt: Date.now(),
      };

      await saveUserProfile(profile);

      router.replace("/main");
    } catch (error: any) {
      setErrorMsg(getSignupErrorMessage(error?.code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!request || googleLoading) return;
    try {
      setGoogleLoading(true);
      setErrorMsg("");
      await promptAsync();
    } catch (error) {
      console.warn("Google prompt error:", error);
      setErrorMsg("Google 회원가입을 시작하지 못했어요.");
      setGoogleLoading(false);
    }
  };

  const showProviderNotice = (provider: string) => {
    Alert.alert("준비중", `${provider} 회원가입은 나중에 연결할 예정이에요.`);
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.kav}
      >
        <View style={[s.content, compact && s.contentCompact, veryCompact && s.contentVeryCompact]}>
          <TouchableOpacity
            style={[s.backButton, compact && s.backButtonCompact]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>

          <View style={[s.header, compact && s.headerCompact]}>
            <Text style={s.title}>StudyNet 시작하기</Text>
            {!veryCompact && (
              <Text style={s.subtitle}>계정을 만들고 오늘의 공부를 기록해보세요.</Text>
            )}
          </View>

          <View style={[s.card, compact && s.cardCompact]}>
            <View style={[s.field, compact && s.fieldCompact]}>
              <Ionicons name="person-outline" size={18} color="#000" />
              <TextInput
                style={s.input}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setErrorMsg("");
                }}
                placeholder="이름"
                placeholderTextColor="#000"
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>

            <View style={[s.field, compact && s.fieldCompact]}>
              <Ionicons name="mail-outline" size={18} color="#000" />
              <TextInput
                style={s.input}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  setErrorMsg("");
                }}
                placeholder="이메일 주소"
                placeholderTextColor="#000"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={[s.field, compact && s.fieldCompact]}>
              <Ionicons name="lock-closed-outline" size={18} color="#000" />
              <TextInput
                style={s.input}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setErrorMsg("");
                }}
                placeholder="비밀번호 6자 이상"
                placeholderTextColor="#000"
                secureTextEntry={!showPassword}
                returnKeyType="next"
              />
              <TouchableOpacity onPress={() => setShowPassword((v) => !v)} style={s.eyeBtn}>
                <Ionicons name={showPassword ? "eye-outline" : "eye-off-outline"} size={18} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={[s.field, compact && s.fieldCompact]}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#000" />
              <TextInput
                style={s.input}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  setErrorMsg("");
                }}
                placeholder="비밀번호 확인"
                placeholderTextColor="#000"
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

            {errorMsg ? (
              <View style={s.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color="#000" />
                <Text style={s.errorText}>{errorMsg}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[s.submitBtn, compact && s.submitBtnCompact, !isValid && s.submitBtnDisabled]}
              activeOpacity={isValid ? 0.85 : 1}
              disabled={!isValid || loading}
              onPress={handleSignup}
            >
              {loading ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Text style={s.submitText}>회원가입</Text>
                  <Ionicons name="arrow-forward" size={18} color="#000" />
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
              style={[s.providerBtn, compact && s.providerBtnCompact, googleLoading && s.providerBtnDisabled]}
              onPress={handleGoogleSignup}
              activeOpacity={request && !googleLoading ? 0.75 : 1}
              disabled={!request || googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Ionicons name="logo-google" size={18} color="#000" />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={[s.providerBtn, compact && s.providerBtnCompact]} onPress={() => showProviderNotice("Apple")} activeOpacity={0.75}>
              <Ionicons name="logo-apple" size={18} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity style={[s.providerBtn, compact && s.providerBtnCompact]} onPress={() => showProviderNotice("Kakao")} activeOpacity={0.75}>
              <Ionicons name="chatbubble-ellipses-outline" size={18} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={[s.loginRow, compact && s.loginRowCompact]}>
            <Text style={s.loginText}>이미 계정이 있으신가요?</Text>
            <TouchableOpacity onPress={() => router.replace("/login")}>
              <Text style={s.loginLink}> 로그인</Text>
            </TouchableOpacity>
          </View>

          {!veryCompact && (
            <Text style={s.notice}>
              회원가입을 진행하면 이용약관 및 개인정보 처리방침에 동의한 것으로 간주됩니다.
            </Text>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
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
    borderColor: "#000",
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
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#000",
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderBottomWidth: 4,
    borderColor: "#000",
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
    borderColor: "#000",
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 12,
    backgroundColor: "#fff",
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
    color: "#000",
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
    color: "#000",
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
    borderColor: "#000",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 8,
  },
  typeChipActive: {
    backgroundColor: "#000",
  },
  typeChipText: {
    color: "#000",
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  typeChipTextActive: {
    color: "#fff",
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    color: "#000",
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
    borderColor: "#000",
    borderRadius: 14,
    backgroundColor: "#fff",
  },
  submitBtnCompact: {
    height: 48,
    borderRadius: 12,
  },
  submitBtnDisabled: {
    opacity: 0.42,
  },
  submitText: {
    color: "#000",
    fontSize: 15,
    fontWeight: "900",
  },
  divider: {
    display: "none",
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
    backgroundColor: "#000",
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    color: "#000",
    fontWeight: "800",
  },
  providerRow: {
    display: "none",
    flexDirection: "row",
    gap: 10,
  },
  providerBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderBottomWidth: 3,
    borderColor: "#000",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
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
    color: "#000",
    fontSize: 13,
  },
  loginLink: {
    color: "#000",
    fontSize: 13,
    fontWeight: "900",
  },
  notice: {
    marginTop: 20,
    fontSize: 11,
    color: "#000",
    textAlign: "center",
    lineHeight: 18,
  },
});
