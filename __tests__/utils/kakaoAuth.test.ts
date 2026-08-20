const mockExchangeCodeAsync = jest.fn();
const mockMakeRedirectUri = jest.fn(() => "studynet://oauth/kakao");
const mockCredential = jest.fn((params) => params);
const mockSignInWithCredential = jest.fn();

jest.mock("expo-auth-session", () => ({
  ResponseType: {
    Code: "code",
  },
  exchangeCodeAsync: mockExchangeCodeAsync,
  makeRedirectUri: mockMakeRedirectUri,
}));

jest.mock("firebase/auth", () => ({
  OAuthProvider: jest.fn().mockImplementation((providerId) => ({
    credential: mockCredential,
    providerId,
  })),
  getAuth: jest.fn(() => ({ currentUser: null })),
  signInWithCredential: mockSignInWithCredential,
}));

const {
  getKakaoAuthErrorMessage,
  getKakaoConfigErrorMessage,
  isKakaoConfigured,
  kakaoAuthRequestConfig,
  kakaoRedirectUri,
  signInWithKakaoCode,
} = require("../../utils/kakaoAuth") as typeof import("../../utils/kakaoAuth");

describe("kakao auth helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExchangeCodeAsync.mockResolvedValue({ idToken: "kakao-id-token" });
    mockSignInWithCredential.mockResolvedValue({
      user: { uid: "kakao-user" },
    });
  });

  it("builds Kakao auth configuration from the current environment", () => {
    expect(kakaoRedirectUri).toBe("studynet://oauth/kakao");
    expect(kakaoAuthRequestConfig).toMatchObject({
      clientId: "missing-kakao-rest-api-key",
      redirectUri: "studynet://oauth/kakao",
      responseType: "code",
      scopes: [
        "openid",
        "profile_nickname",
        "profile_image",
        "account_email",
      ],
      usePKCE: true,
    });
    expect(isKakaoConfigured()).toBe(false);
  });

  it("blocks Kakao sign-in when the REST API key is missing", async () => {
    await expect(signInWithKakaoCode("code", "verifier")).rejects.toThrow(
      "kakao/not-configured",
    );
    expect(mockExchangeCodeAsync).not.toHaveBeenCalled();
  });

  it("exchanges Kakao auth codes when the REST API key is configured", async () => {
    const originalKey = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY;
    process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY = " kakao-client-id ";
    let configured: typeof import("../../utils/kakaoAuth");

    jest.isolateModules(() => {
      configured = require("../../utils/kakaoAuth") as typeof import("../../utils/kakaoAuth");
    });

    expect(configured!.isKakaoConfigured()).toBe(true);
    await expect(
      configured!.signInWithKakaoCode("auth-code", "verifier"),
    ).resolves.toEqual({ uid: "kakao-user" });

    expect(mockExchangeCodeAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: "kakao-client-id",
        code: "auth-code",
        extraParams: { code_verifier: "verifier" },
        redirectUri: "studynet://oauth/kakao",
      }),
      expect.objectContaining({
        tokenEndpoint: expect.stringContaining("kakao.com"),
      }),
    );
    expect(mockCredential).toHaveBeenCalledWith({
      idToken: "kakao-id-token",
    });
    expect(mockSignInWithCredential).toHaveBeenCalledWith(
      expect.anything(),
      { idToken: "kakao-id-token" },
    );

    if (originalKey === undefined) {
      delete process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY;
    } else {
      process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY = originalKey;
    }
  });

  it("rejects configured Kakao sign-in when the id token is missing", async () => {
    const originalKey = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY;
    process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY = "kakao-client-id";
    mockExchangeCodeAsync.mockResolvedValueOnce({});
    let configured: typeof import("../../utils/kakaoAuth");

    jest.isolateModules(() => {
      configured = require("../../utils/kakaoAuth") as typeof import("../../utils/kakaoAuth");
    });

    await expect(
      configured!.signInWithKakaoCode("auth-code", undefined),
    ).rejects.toThrow("kakao/missing-id-token");
    expect(mockSignInWithCredential).not.toHaveBeenCalled();

    if (originalKey === undefined) {
      delete process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY;
    } else {
      process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY = originalKey;
    }
  });

  it("maps Kakao auth errors to user-facing messages", () => {
    expect(getKakaoConfigErrorMessage()).toContain("Kakao REST API 키");
    expect(getKakaoAuthErrorMessage(new Error("kakao/not-configured"))).toBe(
      getKakaoConfigErrorMessage(),
    );
    expect(getKakaoAuthErrorMessage(new Error("kakao/missing-id-token"))).toMatch(
      /OpenID Connect 응답/,
    );
    expect(
      getKakaoAuthErrorMessage({ code: "auth/invalid-credential" }),
    ).toMatch(/oidc\.kakao/);
    expect(
      getKakaoAuthErrorMessage({ code: "auth/operation-not-allowed" }),
    ).toMatch(/oidc\.kakao/);
    expect(getKakaoAuthErrorMessage(new Error("Other"))).toContain(
      "Kakao 인증에 실패",
    );
  });
});
