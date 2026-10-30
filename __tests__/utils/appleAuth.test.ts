const mockDigestStringAsync = jest.fn();
const mockGetRandomBytes = jest.fn();
const mockSignInAsync = jest.fn();
const mockIsAvailableAsync = jest.fn();
const mockCredential = jest.fn((params) => params);
const mockSignInWithCredential = jest.fn();

jest.mock("expo-crypto", () => ({
  CryptoDigestAlgorithm: {
    SHA256: "SHA-256",
  },
  digestStringAsync: mockDigestStringAsync,
  getRandomBytes: mockGetRandomBytes,
}));

jest.mock("expo-apple-authentication", () => ({
  AppleAuthenticationScope: {
    EMAIL: "EMAIL",
    FULL_NAME: "FULL_NAME",
  },
  isAvailableAsync: mockIsAvailableAsync,
  signInAsync: mockSignInAsync,
}));

jest.mock("firebase/auth", () => ({
  OAuthProvider: jest.fn().mockImplementation((providerId) => ({
    credential: mockCredential,
    providerId,
  })),
  getAuth: jest.fn(() => ({ currentUser: null })),
  getReactNativePersistence: jest.fn(() => ({})),
  initializeAuth: jest.fn(() => ({ currentUser: null })),
  signInWithCredential: mockSignInWithCredential,
}));

const {
  getAppleAuthErrorMessage,
  getAppleRuntimeErrorMessage,
  isAppleAuthAvailable,
  signInWithApple,
} = require("../../utils/appleAuth") as typeof import("../../utils/appleAuth");

describe("apple auth helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDigestStringAsync.mockResolvedValue("hashed-nonce");
    mockGetRandomBytes.mockReturnValue(new Uint8Array(Array.from({ length: 32 }, (_, index) => index)));
    mockIsAvailableAsync.mockResolvedValue(true);
    mockSignInAsync.mockResolvedValue({
      email: "apple@example.com",
      fullName: { familyName: "김", givenName: "민수", middleName: null },
      identityToken: "apple-id-token",
    });
    mockSignInWithCredential.mockResolvedValue({
      user: { uid: "apple-user" },
    });
  });

  it("checks Apple auth availability", async () => {
    await expect(isAppleAuthAvailable()).resolves.toBe(true);
    expect(mockIsAvailableAsync).toHaveBeenCalled();
    expect(getAppleRuntimeErrorMessage()).toContain("Apple 로그인");
  });

  it("signs in with Firebase using an Apple identity token and nonce", async () => {
    await expect(signInWithApple()).resolves.toEqual({
      email: "apple@example.com",
      fullName: "김민수",
      user: { uid: "apple-user" },
    });

    expect(mockDigestStringAsync).toHaveBeenCalledWith("SHA-256", expect.any(String));
    expect(mockSignInAsync).toHaveBeenCalledWith({
      requestedScopes: ["FULL_NAME", "EMAIL"],
      nonce: "hashed-nonce",
    });
    expect(mockCredential).toHaveBeenCalledWith({
      idToken: "apple-id-token",
      rawNonce: expect.any(String),
    });
    expect(mockSignInWithCredential).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ idToken: "apple-id-token" }),
    );
  });

  it("rejects when Apple does not return an identity token", async () => {
    mockSignInAsync.mockResolvedValueOnce({});

    await expect(signInWithApple()).rejects.toThrow("apple/missing-identity-token");
    expect(mockSignInWithCredential).not.toHaveBeenCalled();
  });

  it("maps Apple auth errors to user-facing messages", () => {
    expect(getAppleAuthErrorMessage({ code: "ERR_REQUEST_CANCELED" })).toMatch(
      /취소/,
    );
    expect(getAppleAuthErrorMessage({ code: "auth/invalid-credential" })).toMatch(
      /Apple 제공업체/,
    );
    expect(getAppleAuthErrorMessage(new Error("Other"))).toContain(
      "Apple 인증에 실패",
    );
  });
});
