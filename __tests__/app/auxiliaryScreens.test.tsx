import { fireEvent, render, waitFor } from "@testing-library/react-native";
import {
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import NotificationsScreen from "../../app/notifications";
import PasswordResetScreen from "../../app/password";
import VerifyEmailScreen from "../../app/verify-email";
import { auth } from "../../utils/firebaseConfig";
import {
  buildCommunityNotifications,
  saveCommunityNotificationsReadAt,
  subscribeCommunityNotificationSources,
} from "../../utils/communityNotifications";

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(() => ({ email: "user@example.com" })),
  useRouter: () => mockRouter,
}));

jest.mock("../../utils/communityNotifications", () => ({
  buildCommunityNotifications: jest.fn(),
  saveCommunityNotificationsReadAt: jest.fn(() => Promise.resolve()),
  subscribeCommunityNotificationSources: jest.fn(),
}));

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 24, right: 0, bottom: 24, left: 0 },
};

const renderWithSafeArea = (screen: ReactElement) =>
  render(
    <SafeAreaProvider initialMetrics={safeAreaMetrics}>
      {screen}
    </SafeAreaProvider>,
  );

const setCurrentUser = (user: unknown) => {
  Object.defineProperty(auth, "currentUser", {
    configurable: true,
    value: user,
    writable: true,
  });
};

const verifiedUser = {
  uid: "user-1",
  email: "user@example.com",
  emailVerified: true,
};

describe("auxiliary app screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setCurrentUser(null);
    jest.mocked(subscribeCommunityNotificationSources).mockImplementation(
      (onChange) => {
        onChange({
          posts: null,
          cheers: null,
          comments: null,
          users: null,
        });
        return jest.fn();
      },
    );
    jest.mocked(buildCommunityNotifications).mockReturnValue([]);
  });

  it("sends password reset emails only after a valid email is entered", async () => {
    const { getByTestId } = await renderWithSafeArea(<PasswordResetScreen />);

    await fireEvent.press(getByTestId("password-submit-button"));
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();

    await fireEvent.changeText(
      getByTestId("password-email-input"),
      "USER@EXAMPLE.COM",
    );
    await fireEvent.press(getByTestId("password-submit-button"));

    await waitFor(() => {
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.anything(),
        "user@example.com",
      );
    });
  });

  it("wires password recovery navigation controls", async () => {
    const { getByTestId } = await renderWithSafeArea(<PasswordResetScreen />);

    await fireEvent.press(getByTestId("password-back-button"));
    await fireEvent.press(getByTestId("password-login-back-button"));

    expect(mockRouter.back).toHaveBeenCalledTimes(2);
  });

  it("routes verified users from email verification to main", async () => {
    setCurrentUser(verifiedUser);
    const { getByTestId } = await renderWithSafeArea(<VerifyEmailScreen />);

    await fireEvent.press(getByTestId("verify-check-button"));

    await waitFor(() => {
      expect(reload).toHaveBeenCalledWith(verifiedUser);
      expect(mockRouter.replace).toHaveBeenCalledWith("/main");
    });
  });

  it("resends verification email and can return to login", async () => {
    setCurrentUser(verifiedUser);
    const { getByTestId } = await renderWithSafeArea(<VerifyEmailScreen />);

    await fireEvent.press(getByTestId("verify-resend-button"));
    await fireEvent.press(getByTestId("verify-other-account-button"));

    await waitFor(() => {
      expect(sendEmailVerification).toHaveBeenCalledWith(verifiedUser);
      expect(signOut).toHaveBeenCalledWith(expect.anything());
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });
  });

  it("routes anonymous email verification checks back to login", async () => {
    const { getByTestId } = await renderWithSafeArea(<VerifyEmailScreen />);

    await fireEvent.press(getByTestId("verify-check-button"));

    expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    expect(reload).not.toHaveBeenCalled();
  });

  it("wires notification header actions", async () => {
    const { getByTestId } = await renderWithSafeArea(<NotificationsScreen />);

    await fireEvent.press(getByTestId("notifications-back-button"));
    await fireEvent.press(getByTestId("notifications-community-button"));

    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith("/community");
    expect(subscribeCommunityNotificationSources).not.toHaveBeenCalled();
  });

  it("opens the related community post when a notification is pressed", async () => {
    setCurrentUser(verifiedUser);
    jest.mocked(buildCommunityNotifications).mockReturnValue([
      {
        id: "comment-post-1-comment-1",
        type: "comment",
        actorId: "user-2",
        actorName: "Alice",
        actorImage: null,
        postId: "post-1",
        postCategory: "question" as never,
        postTitle: "My post",
        postBody: "Post body",
        body: "Nice work",
        createdAt: 1_700_000_000_000,
      },
    ]);
    const { getByTestId } = await renderWithSafeArea(<NotificationsScreen />);

    await waitFor(() => {
      expect(getByTestId("notification-card-comment-post-1-comment-1")).toBeTruthy();
    });
    await fireEvent.press(getByTestId("notification-card-comment-post-1-comment-1"));

    expect(subscribeCommunityNotificationSources).toHaveBeenCalled();
    expect(saveCommunityNotificationsReadAt).toHaveBeenCalledWith("user-1");
    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: "/community",
      params: {
        postId: "post-1",
        openComments: "1",
      },
    });
  });
});
