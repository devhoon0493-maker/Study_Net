import { Platform } from "react-native";

const mockConfigure = jest.fn();
const mockGetTokens = jest.fn();
const mockHasPlayServices = jest.fn();
const mockSignIn = jest.fn();
const mockConstants = { appOwnership: "standalone" };

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: mockConfigure,
    getTokens: mockGetTokens,
    hasPlayServices: mockHasPlayServices,
    signIn: mockSignIn,
  },
  isCancelledResponse: jest.fn((response) => response?.type === "cancelled"),
  isErrorWithCode: jest.fn((error) => Boolean(error?.code)),
  isSuccessResponse: jest.fn((response) => response?.type === "success"),
  statusCodes: {
    IN_PROGRESS: "IN_PROGRESS",
    PLAY_SERVICES_NOT_AVAILABLE: "PLAY_SERVICES_NOT_AVAILABLE",
    SIGN_IN_CANCELLED: "SIGN_IN_CANCELLED",
  },
}));

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: mockConstants,
}));

const {
  configureGoogleSignIn,
  getGoogleAuthErrorMessage,
  getGoogleRuntimeErrorMessage,
  googleWebClientId,
  isGoogleAuthSupportedInCurrentRuntime,
  signInWithGoogle,
} = require("../../utils/googleAuth") as typeof import("../../utils/googleAuth");

describe("google auth helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConstants.appOwnership = "standalone";
    mockGetTokens.mockResolvedValue({ idToken: "fallback-token" });
    mockHasPlayServices.mockResolvedValue(true);
  });

  it("configures Google sign-in once", () => {
    configureGoogleSignIn();
    configureGoogleSignIn();

    expect(mockConfigure).toHaveBeenCalledTimes(1);
    expect(mockConfigure).toHaveBeenCalledWith({
      webClientId: googleWebClientId,
      scopes: ["profile", "email"],
    });
  });

  it("detects the unsupported Android Expo Go runtime", () => {
    const originalOS = Platform.OS;

    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "android",
    });
    mockConstants.appOwnership = "expo";
    expect(isGoogleAuthSupportedInCurrentRuntime()).toBe(false);

    mockConstants.appOwnership = "standalone";
    expect(isGoogleAuthSupportedInCurrentRuntime()).toBe(true);

    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: "ios",
    });
    mockConstants.appOwnership = "expo";
    expect(isGoogleAuthSupportedInCurrentRuntime()).toBe(true);

    Object.defineProperty(Platform, "OS", {
      configurable: true,
      value: originalOS,
    });
    expect(getGoogleRuntimeErrorMessage()).toContain("Android 개발 빌드");
  });

  it("maps known Google auth errors to user-facing messages", () => {
    expect(getGoogleAuthErrorMessage({ code: "SIGN_IN_CANCELLED" })).toMatch(
      /취소/,
    );
    expect(getGoogleAuthErrorMessage({ code: "IN_PROGRESS" })).toMatch(
      /진행 중/,
    );
    expect(
      getGoogleAuthErrorMessage({ code: "PLAY_SERVICES_NOT_AVAILABLE" }),
    ).toMatch(/Google Play 서비스/);
    expect(getGoogleAuthErrorMessage({ code: "10" })).toMatch(/SHA-1/);
    expect(
      getGoogleAuthErrorMessage(new Error("DEVELOPER_ERROR")),
    ).toMatch(/앱 서명/);
    expect(getGoogleAuthErrorMessage(new Error("Other"))).toContain(
      "Google 인증에 실패",
    );
  });

  it("returns null when Google sign-in is cancelled", async () => {
    mockSignIn.mockResolvedValue({ type: "cancelled" });

    await expect(signInWithGoogle()).resolves.toBeNull();
    expect(mockHasPlayServices).toHaveBeenCalledWith({
      showPlayServicesUpdateDialog: true,
    });
  });

  it("returns the direct or fallback id token from successful Google sign-in", async () => {
    mockSignIn.mockResolvedValue({
      type: "success",
      data: { idToken: "direct-token" },
    });

    await expect(signInWithGoogle()).resolves.toBe("direct-token");
    expect(mockGetTokens).not.toHaveBeenCalled();

    mockSignIn.mockResolvedValue({
      type: "success",
      data: { idToken: null },
    });

    await expect(signInWithGoogle()).resolves.toBe("fallback-token");
  });

  it("throws when Google sign-in has no successful token response", async () => {
    mockSignIn.mockResolvedValue({ type: "unknown" });
    await expect(signInWithGoogle()).rejects.toThrow(/successful response/);

    mockSignIn.mockResolvedValue({
      type: "success",
      data: { idToken: null },
    });
    mockGetTokens.mockResolvedValue({ idToken: null });

    await expect(signInWithGoogle()).rejects.toThrow(/ID token/);
  });

  it("throws a clear configuration error when the web client id is missing", () => {
    const originalWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = " ";

    try {
      jest.isolateModules(() => {
        const { configureGoogleSignIn: configureWithMissingEnv } = require("../../utils/googleAuth") as typeof import("../../utils/googleAuth");

        expect(() => configureWithMissingEnv()).toThrow(
          /EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID/,
        );
      });
      expect(mockConfigure).not.toHaveBeenCalled();
    } finally {
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = originalWebClientId;
    }
  });

  it("throws the same configuration error when the web client id is undefined", () => {
    const originalWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

    try {
      jest.isolateModules(() => {
        const { configureGoogleSignIn: configureWithMissingEnv } = require("../../utils/googleAuth") as typeof import("../../utils/googleAuth");

        expect(() => configureWithMissingEnv()).toThrow(
          /EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID/,
        );
      });
      expect(mockConfigure).not.toHaveBeenCalled();
    } finally {
      process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = originalWebClientId;
    }
  });
});
