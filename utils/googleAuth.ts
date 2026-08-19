import {
  GoogleSignin,
  isCancelledResponse,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";
import { Platform } from "react-native";

export const androidPackageName = "com.parkhun.StudyNet";

export const googleWebClientId =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() ?? "";

let googleConfigured = false;

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
  GoogleSignin.configure({
    webClientId: requireGoogleWebClientId(),
    scopes: ["profile", "email"],
  });
  googleConfigured = true;
};

export const isGoogleAuthSupportedInCurrentRuntime = () =>
  !(Platform.OS === "android" && Constants.appOwnership === "expo");

export const getGoogleRuntimeErrorMessage = () =>
  "Google 로그인은 Expo Go가 아니라 Android 개발 빌드나 설치 빌드에서 테스트해주세요.";

export const getGoogleAuthErrorMessage = (error?: unknown) => {
  if (isErrorWithCode(error)) {
    switch (error.code) {
      case statusCodes.SIGN_IN_CANCELLED:
        return "Google 로그인이 취소되었어요.";
      case statusCodes.IN_PROGRESS:
        return "Google 로그인이 이미 진행 중이에요.";
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        return "Google Play 서비스를 사용할 수 없어요. 기기 설정을 확인해주세요.";
    }
  }

  return "Google 인증에 실패했어요. Firebase/Google OAuth의 Web client ID, Android package, SHA 설정을 확인해주세요.";
};

export const signInWithGoogle = async () => {
  configureGoogleSignIn();
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
