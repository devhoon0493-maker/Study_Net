import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { get, set } from "firebase/database";

import LoginScreen from "../../app/login";
import SignupScreen from "../../app/signup";
import * as appleAuth from "../../utils/appleAuth";
import * as googleAuth from "../../utils/googleAuth";
import * as kakaoAuth from "../../utils/kakaoAuth";
import { USER_PROFILE_KEY } from "../../utils/userProfileStorage";

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};
const mockPromptKakaoAsync = jest.fn(() => Promise.resolve());

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
}));

jest.mock("expo-auth-session", () => ({
  ResponseType: { Code: "code" },
  makeRedirectUri: jest.fn(() => "studynet://oauth/kakao"),
  useAuthRequest: jest.fn(() => [
    { codeVerifier: "test-code-verifier" },
    null,
    mockPromptKakaoAsync,
  ]),
}));

jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock("../../utils/googleAuth", () => ({
  getGoogleAuthErrorMessage: jest.fn(() => "Google auth failed"),
  getGoogleRuntimeErrorMessage: jest.fn(() => "Google runtime unsupported"),
  isGoogleAuthSupportedInCurrentRuntime: jest.fn(() => false),
  signInWithGoogle: jest.fn(() => Promise.resolve("google-id-token")),
}));

jest.mock("../../utils/appleAuth", () => ({
  getAppleAuthErrorMessage: jest.fn(() => "Apple auth failed"),
  getAppleRuntimeErrorMessage: jest.fn(() => "Apple runtime unsupported"),
  isAppleAuthAvailable: jest.fn(() => Promise.resolve(false)),
  signInWithApple: jest.fn(() =>
    Promise.resolve({
      user: {
        uid: "apple-user",
        email: "apple@example.com",
        displayName: "Apple User",
        photoURL: null,
      },
      email: "apple@example.com",
      fullName: "Apple User",
    }),
  ),
}));

jest.mock("../../utils/kakaoAuth", () => ({
  getKakaoAuthErrorMessage: jest.fn(() => "Kakao auth failed"),
  getKakaoConfigErrorMessage: jest.fn(() => "Kakao is not configured"),
  isKakaoConfigured: jest.fn(() => false),
  kakaoAuthRequestConfig: {
    clientId: "test-kakao-client",
    redirectUri: "studynet://oauth/kakao",
    responseType: "code",
    scopes: [],
    usePKCE: true,
  },
  signInWithKakaoCode: jest.fn(),
}));

const verifiedPasswordUser = {
  uid: "email-user",
  email: "user@example.com",
  displayName: "Email User",
  photoURL: null,
  emailVerified: true,
  providerData: [{ providerId: "password" }],
};

const unverifiedPasswordUser = {
  ...verifiedPasswordUser,
  emailVerified: false,
};

const createdUser = {
  uid: "created-user",
  email: "new@example.com",
  displayName: null,
  photoURL: null,
  emailVerified: false,
  providerData: [{ providerId: "password" }],
};

describe("auth screens", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.mocked(get).mockResolvedValue({
      exists: () => false,
      val: () => null,
    } as never);
    jest.mocked(signInWithEmailAndPassword).mockResolvedValue({
      user: verifiedPasswordUser,
    } as never);
    jest.mocked(createUserWithEmailAndPassword).mockResolvedValue({
      user: createdUser,
    } as never);
  });

  it("renders login fields and ignores submit until credentials are valid", async () => {
    const { getByTestId, getByText } = await render(<LoginScreen />);

    expect(getByText("StudyNet")).toBeTruthy();
    await fireEvent.press(getByTestId("login-submit-button"));
    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();

    await fireEvent.changeText(getByTestId("login-email-input"), "bad-email");
    await fireEvent.changeText(getByTestId("login-password-input"), "12345");
    await fireEvent.press(getByTestId("login-submit-button"));
    expect(signInWithEmailAndPassword).not.toHaveBeenCalled();

    await fireEvent.changeText(
      getByTestId("login-email-input"),
      "USER@EXAMPLE.COM",
    );
    await fireEvent.changeText(
      getByTestId("login-password-input"),
      "password1",
    );
    await fireEvent.press(getByTestId("login-submit-button"));
    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalled();
    });
  });

  it("navigates from login to password recovery and signup", async () => {
    const { getByTestId } = await render(<LoginScreen />);

    await fireEvent.press(getByTestId("login-forgot-password-button"));
    await fireEvent.press(getByTestId("login-signup-link"));

    expect(mockRouter.push).toHaveBeenCalledWith("/password");
    expect(mockRouter.push).toHaveBeenCalledWith("/signup");
  });

  it("logs in with email and routes verified users to main", async () => {
    const { getByTestId } = await render(<LoginScreen />);

    await fireEvent.changeText(
      getByTestId("login-email-input"),
      "USER@EXAMPLE.COM",
    );
    await fireEvent.changeText(
      getByTestId("login-password-input"),
      "password1",
    );
    await fireEvent.press(getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/main");
    });
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "user@example.com",
      "password1",
    );
    await expect(AsyncStorage.getItem(USER_PROFILE_KEY)).resolves.toContain(
      "email-user",
    );
  });

  it("routes unverified email users to email verification", async () => {
    jest.mocked(signInWithEmailAndPassword).mockResolvedValueOnce({
      user: unverifiedPasswordUser,
    } as never);
    const { getByTestId } = await render(<LoginScreen />);

    await fireEvent.changeText(
      getByTestId("login-email-input"),
      "user@example.com",
    );
    await fireEvent.changeText(
      getByTestId("login-password-input"),
      "password1",
    );
    await fireEvent.press(getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/verify-email",
          params: { email: "user@example.com" },
        }),
      );
    });
  });

  it("shows an error when Google login is unsupported in the current runtime", async () => {
    const { getByTestId, getByText } = await render(<LoginScreen />);

    await fireEvent.press(getByTestId("login-google-button"));

    expect(getByText("Google runtime unsupported")).toBeTruthy();
    expect(googleAuth.signInWithGoogle).not.toHaveBeenCalled();
  });

  it("shows an error when Apple login is unsupported in the current runtime", async () => {
    const { getByTestId, getByText } = await render(<LoginScreen />);

    await fireEvent.press(getByTestId("login-apple-button"));

    await waitFor(() => {
      expect(getByText("Apple runtime unsupported")).toBeTruthy();
    });
    expect(appleAuth.signInWithApple).not.toHaveBeenCalled();
  });

  it("shows an error when Kakao login is not configured", async () => {
    const { getByTestId, getByText } = await render(<LoginScreen />);

    await fireEvent.press(getByTestId("login-kakao-button"));

    expect(getByText("Kakao is not configured")).toBeTruthy();
    expect(mockPromptKakaoAsync).not.toHaveBeenCalled();
  });

  it("renders signup fields and ignores submit until valid input and agreement", async () => {
    const { getByTestId, getByText } = await render(<SignupScreen />);

    expect(getByTestId("signup-screen-title")).toBeTruthy();
    await fireEvent.press(getByTestId("signup-submit-button"));
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();

    await fireEvent.changeText(getByTestId("signup-name-input"), "New User");
    await fireEvent.changeText(
      getByTestId("signup-email-input"),
      "new@example.com",
    );
    await fireEvent.changeText(
      getByTestId("signup-password-input"),
      "password1",
    );
    await fireEvent.changeText(
      getByTestId("signup-confirm-password-input"),
      "password1",
    );
    await fireEvent.press(getByTestId("signup-submit-button"));
    expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();

    await fireEvent.press(getByTestId("signup-privacy-agreement-button"));
    await fireEvent.press(getByTestId("signup-submit-button"));
    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalled();
    });
  });

  it("navigates from signup secondary controls", async () => {
    const { getByTestId } = await render(<SignupScreen />);

    await fireEvent.press(getByTestId("signup-back-button"));
    await fireEvent.press(getByTestId("signup-privacy-link"));
    await fireEvent.press(getByTestId("signup-login-link"));

    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith("/setting/privacy");
    expect(mockRouter.replace).toHaveBeenCalledWith("/login");
  });

  it("creates an email account and routes to email verification", async () => {
    const { getByTestId } = await render(<SignupScreen />);

    await fireEvent.changeText(getByTestId("signup-name-input"), "New User");
    await fireEvent.changeText(
      getByTestId("signup-email-input"),
      "NEW@EXAMPLE.COM",
    );
    await fireEvent.changeText(
      getByTestId("signup-password-input"),
      "password1",
    );
    await fireEvent.changeText(
      getByTestId("signup-confirm-password-input"),
      "password1",
    );
    await fireEvent.press(getByTestId("signup-privacy-agreement-button"));
    await fireEvent.press(getByTestId("signup-submit-button"));

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.objectContaining({
          pathname: "/verify-email",
          params: { email: "new@example.com" },
        }),
      );
    });
    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      "new@example.com",
      "password1",
    );
    expect(updateProfile).toHaveBeenCalledWith(createdUser, {
      displayName: "New User",
    });
    expect(set).toHaveBeenCalled();
    expect(sendEmailVerification).toHaveBeenCalledWith(createdUser);
  });

  it("blocks social signup before privacy agreement", async () => {
    const { getByTestId } = await render(<SignupScreen />);

    await fireEvent.press(getByTestId("signup-google-button"));
    await fireEvent.press(getByTestId("signup-apple-button"));
    await fireEvent.press(getByTestId("signup-kakao-button"));

    expect(googleAuth.signInWithGoogle).not.toHaveBeenCalled();
    expect(appleAuth.signInWithApple).not.toHaveBeenCalled();
    expect(mockPromptKakaoAsync).not.toHaveBeenCalled();
  });

  it("shows an error when Google signup is unsupported after agreement", async () => {
    const { getByTestId, getByText } = await render(<SignupScreen />);

    await fireEvent.press(getByTestId("signup-privacy-agreement-button"));
    await fireEvent.press(getByTestId("signup-google-button"));

    expect(getByText("Google runtime unsupported")).toBeTruthy();
    expect(googleAuth.signInWithGoogle).not.toHaveBeenCalled();
  });

  it("shows an error when Apple signup is unsupported after agreement", async () => {
    const { getByTestId, getByText } = await render(<SignupScreen />);

    await fireEvent.press(getByTestId("signup-privacy-agreement-button"));
    await fireEvent.press(getByTestId("signup-apple-button"));

    await waitFor(() => {
      expect(getByText("Apple runtime unsupported")).toBeTruthy();
    });
    expect(appleAuth.signInWithApple).not.toHaveBeenCalled();
  });

  it("shows an error when Kakao signup is not configured after agreement", async () => {
    const { getByTestId, getByText } = await render(<SignupScreen />);

    await fireEvent.press(getByTestId("signup-privacy-agreement-button"));
    await fireEvent.press(getByTestId("signup-kakao-button"));

    expect(getByText("Kakao is not configured")).toBeTruthy();
    expect(kakaoAuth.signInWithKakaoCode).not.toHaveBeenCalled();
    expect(mockPromptKakaoAsync).not.toHaveBeenCalled();
  });
});
