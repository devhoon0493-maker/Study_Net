import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { OAuthProvider, signInWithCredential, type User } from "firebase/auth";

import { auth } from "./firebaseConfig";

export type AppleAuthResult = {
  user: User;
  fullName: string | null;
  email: string | null;
};

const nonceCharset =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-._";

const createNonce = (length = 32) => {
  const randomBytes = Crypto.getRandomBytes(length);
  return Array.from(randomBytes, (byte) => nonceCharset[byte % nonceCharset.length]).join("");
};

export const isAppleAuthAvailable = () => AppleAuthentication.isAvailableAsync();

export const getAppleRuntimeErrorMessage = () =>
  "Apple 로그인은 iOS 기기 또는 Apple 로그인을 지원하는 빌드에서 테스트해주세요.";

export const getAppleAuthErrorMessage = (error?: unknown) => {
  const code =
    typeof error === "object" && error && "code" in error
      ? String(error.code)
      : "";

  if (code === "ERR_REQUEST_CANCELED") {
    return "Apple 로그인이 취소되었어요.";
  }
  if (code === "auth/invalid-credential" || code === "auth/operation-not-allowed") {
    return "Firebase Auth에 Apple 제공업체가 설정되어 있는지 확인해주세요.";
  }

  return "Apple 인증에 실패했어요. Apple Developer/Firebase 설정을 확인해주세요.";
};

const formatAppleFullName = (
  fullName: AppleAuthentication.AppleAuthenticationFullName | null,
) => {
  const parts = [
    fullName?.familyName,
    fullName?.givenName,
    fullName?.middleName,
  ].filter(Boolean);

  return parts.length ? parts.join("") : null;
};

export async function signInWithApple(): Promise<AppleAuthResult> {
  const rawNonce = createNonce();
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    rawNonce,
  );

  const appleCredential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!appleCredential.identityToken) {
    throw new Error("apple/missing-identity-token");
  }

  const provider = new OAuthProvider("apple.com");
  const credential = provider.credential({
    idToken: appleCredential.identityToken,
    rawNonce,
  });
  const result = await signInWithCredential(auth, credential);

  return {
    user: result.user,
    fullName: formatAppleFullName(appleCredential.fullName),
    email: appleCredential.email,
  };
}
