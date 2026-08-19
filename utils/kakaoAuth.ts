import * as AuthSession from "expo-auth-session";
import { OAuthProvider, signInWithCredential, type User } from "firebase/auth";

import { auth } from "./firebaseConfig";

const kakaoDiscovery = {
  authorizationEndpoint: "https://kauth.kakao.com/oauth/authorize",
  tokenEndpoint: "https://kauth.kakao.com/oauth/token",
};

export const kakaoRedirectUri = AuthSession.makeRedirectUri({
  scheme: "studynet",
  path: "oauth/kakao",
});

export const kakaoClientId =
  process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY?.trim() ?? "";

export const kakaoAuthRequestConfig: AuthSession.AuthRequestConfig = {
  clientId: kakaoClientId || "missing-kakao-rest-api-key",
  redirectUri: kakaoRedirectUri,
  responseType: AuthSession.ResponseType.Code,
  scopes: ["openid", "profile_nickname", "profile_image", "account_email"],
  usePKCE: true,
};

export const isKakaoConfigured = () => kakaoClientId.length > 0;

export const getKakaoConfigErrorMessage = () =>
  "Kakao REST API 키가 설정되지 않았어요. EXPO_PUBLIC_KAKAO_REST_API_KEY를 설정한 뒤 다시 실행해주세요.";

export async function signInWithKakaoCode(
  code: string,
  codeVerifier: string | undefined,
): Promise<User> {
  if (!isKakaoConfigured()) throw new Error("kakao/not-configured");

  const tokenResponse = await AuthSession.exchangeCodeAsync(
    {
      clientId: kakaoClientId,
      code,
      redirectUri: kakaoRedirectUri,
      extraParams: codeVerifier ? { code_verifier: codeVerifier } : undefined,
    },
    kakaoDiscovery,
  );

  if (!tokenResponse.idToken) {
    throw new Error("kakao/missing-id-token");
  }

  const provider = new OAuthProvider("oidc.kakao");
  const credential = provider.credential({ idToken: tokenResponse.idToken });
  const result = await signInWithCredential(auth, credential);

  return result.user;
}

export function getKakaoAuthErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";

  if (message === "kakao/not-configured") return getKakaoConfigErrorMessage();
  if (message === "kakao/missing-id-token") {
    return "Kakao OpenID Connect 응답을 받지 못했어요. Kakao Developers에서 OpenID Connect를 활성화했는지 확인해주세요.";
  }
  if (code === "auth/invalid-credential" || code === "auth/operation-not-allowed") {
    return "Firebase Auth에 Kakao OIDC 제공업체(oidc.kakao)가 설정되어 있는지 확인해주세요.";
  }

  return "Kakao 인증에 실패했어요. 잠시 후 다시 시도해주세요.";
}
