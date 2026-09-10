import Constants from "expo-constants";
import { Platform } from "react-native";

export const androidPackageName = "com.parkhun.StudyNet";

export const googleWebClientId =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? "";

let googleConfigured = false;
let googleSignInModule:
  | typeof import("@react-native-google-signin/google-signin")
  | null = null;

const getGoogleSignInModule = () => {
  if (!googleSignInModule) {
    googleSignInModule = require("@react-native-google-signin/google-signin") as typeof import("@react-native-google-signin/google-signin");
  }

  return googleSignInModule;
};

const requireGoogleWebClientId = () => {
  if (!googleWebClientId) {
    throw new Error(
      "Missing required environment variable: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
    );
  }
  return googleWebClientId;
};

export const configureGoogleSignIn = () => {
  if (googleConfigured) return;
  const { GoogleSignin } = getGoogleSignInModule();

  GoogleSignin.configure({
    webClientId: requireGoogleWebClientId(),
    scopes: ["profile", "email"],
  });
  googleConfigured = true;
};

export const isGoogleAuthSupportedInCurrentRuntime = () =>
  !(Platform.OS === "android" && Constants.appOwnership === "expo");

export const getGoogleRuntimeErrorMessage = () =>
  "Google 로그인은 Expo Go가 아닌 Android 개발 빌드나 설치 빌드에서 테스트해주세요.";

export const getGoogleAuthErrorMessage = (error?: unknown) => {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";
  const message = error instanceof Error ? error.message : "";

  if (code) {
    switch (code) {
      case "SIGN_IN_CANCELLED":
        return "Google 로그인이 취소되었어요.";
      case "IN_PROGRESS":
        return "Google 로그인이 이미 진행 중이에요.";
      case "PLAY_SERVICES_NOT_AVAILABLE":
        return "Google Play 서비스를 사용할 수 없어요. 기기 설정을 확인해주세요.";
      case "10":
      case "DEVELOPER_ERROR":
        return "Google 로그인 설정이 현재 앱 서명과 맞지 않아요. Firebase Android 앱의 패키지 이름과 SHA-1/SHA-256을 확인해주세요.";
    }
  }

  if (/DEVELOPER_ERROR|ApiException:\s*10|status code:\s*10/i.test(message)) {
    return "Google 로그인 설정이 현재 앱 서명과 맞지 않아요. Firebase Android 앱의 패키지 이름과 SHA-1/SHA-256을 확인해주세요.";
  }

  return "Google 인증에 실패했어요. Firebase/Google OAuth의 Web client ID, Android package, SHA 설정을 확인해주세요.";
};

export const signInWithGoogle = async () => {
  configureGoogleSignIn();
  const {
    GoogleSignin,
    isCancelledResponse,
    isSuccessResponse,
  } = getGoogleSignInModule();

  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  const response = await GoogleSignin.signIn();
  if (isCancelledResponse(response)) {
    return null;
  }
  if (!isSuccessResponse(response)) {
    throw new Error("Google sign-in did not return a successful response.");
  }

  const idToken = response.data.idToken ?? (await GoogleSignin.getTokens()).idToken;
  if (!idToken) {
    throw new Error("Google sign-in did not return an ID token.");
  }

  return idToken;
};
