import { fireEvent, render, waitFor } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import ContactScreen from "../../app/setting/contact";
import SettingsScreen from "../../app/setting";
import PrivacyPolicyScreen from "../../app/setting/privacy";
import { auth } from "../../utils/firebaseConfig";

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};
const mockLoadOverview = jest.fn();
const mockUpdateNotificationSetting = jest.fn();
const mockUpdateStudyStatusPublic = jest.fn();
const mockUpdateCommunityActivityPublic = jest.fn();
const mockHandleLogout = jest.fn();
const mockHandleDeleteAccount = jest.fn();
const mockCanOpenURL = jest.fn<Promise<boolean>, [string]>(() =>
  Promise.resolve(true),
);
const mockOpenURL = jest.fn<Promise<void>, [string]>(() => Promise.resolve());

jest.mock("expo-router", () => ({
  useFocusEffect: jest.fn((effect: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(effect, [effect]);
  }),
  usePathname: jest.fn(() => "/setting"),
  useRouter: () => mockRouter,
}));

jest.mock("expo-linking", () => ({
  canOpenURL: (url: string) => mockCanOpenURL(url),
  openURL: (url: string) => mockOpenURL(url),
}));

jest.mock("../../components/BottomNav", () => ({
  __esModule: true,
  default: () => null,
  getBottomNavSpace: jest.fn((bottomInset: number) => 80 + bottomInset),
}));

jest.mock("../../features/settings/useSettingsOverview", () => ({
  useSettingsOverview: () => ({
    profile: {
      name: "Test User",
      email: "test@example.com",
      image: null,
      userType: "Student",
    },
    notifications: true,
    notificationSummary: "Every day 20:00",
    studyStatusPublic: true,
    communityActivityPublic: false,
    loadOverview: mockLoadOverview,
    updateNotificationSetting: mockUpdateNotificationSetting,
    updateStudyStatusPublic: mockUpdateStudyStatusPublic,
    updateCommunityActivityPublic: mockUpdateCommunityActivityPublic,
  }),
}));

jest.mock("../../features/settings/useSettingsAccountActions", () => ({
  useSettingsAccountActions: () => ({
    accountBusy: false,
    handleLogout: mockHandleLogout,
    handleDeleteAccount: mockHandleDeleteAccount,
  }),
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

describe("settings screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setCurrentUser({
      uid: "user-1",
      email: "test@example.com",
    });
  });

  it("renders settings overview and wires account actions", async () => {
    const { getByTestId, getByText } = await renderWithSafeArea(
      <SettingsScreen />,
    );

    await waitFor(() => {
      expect(mockLoadOverview).toHaveBeenCalled();
      expect(getByText("Test User")).toBeTruthy();
    });

    await fireEvent.press(getByTestId("settings-back-button"));
    await fireEvent.press(getByTestId("settings-profile-edit-button"));
    await fireEvent.press(getByTestId("settings-logout-button"));
    await fireEvent.press(getByTestId("settings-delete-account-button"));

    expect(mockRouter.back).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith("/setting/profile");
    expect(mockHandleLogout).toHaveBeenCalled();
    expect(mockHandleDeleteAccount).toHaveBeenCalled();
  });

  it("renders privacy policy and uses the shared settings back button", async () => {
    const { getByTestId, getAllByText } = await renderWithSafeArea(
      <PrivacyPolicyScreen />,
    );

    expect(getAllByText(/StudyNet/).length).toBeGreaterThan(0);
    await fireEvent.press(getByTestId("settings-header-back-button"));

    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("fills the contact form and opens a mailto link", async () => {
    const { getByTestId } = await renderWithSafeArea(<ContactScreen />);

    await fireEvent.press(getByTestId("contact-category-1"));
    await fireEvent.changeText(
      getByTestId("contact-reply-email-input"),
      "reply@example.com",
    );
    await fireEvent.changeText(
      getByTestId("contact-message-input"),
      "Please check this issue.",
    );
    await fireEvent.press(getByTestId("contact-send-button"));

    await waitFor(() => {
      expect(mockCanOpenURL).toHaveBeenCalledWith(expect.stringContaining("mailto:"));
      expect(mockOpenURL).toHaveBeenCalledWith(expect.stringContaining("reply%40example.com"));
    });
  });
});
