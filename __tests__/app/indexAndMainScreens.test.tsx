import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { onAuthStateChanged } from "firebase/auth";
import { SafeAreaProvider } from "react-native-safe-area-context";

import Index from "../../app/index";
import MainScreen from "../../app/main";
import { auth } from "../../utils/firebaseConfig";

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};

jest.mock("expo-router", () => ({
  useFocusEffect: jest.fn((effect: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(effect, [effect]);
  }),
  useLocalSearchParams: jest.fn(() => ({})),
  usePathname: jest.fn(() => "/main"),
  useRouter: () => mockRouter,
}));

const setCurrentUser = (user: unknown) => {
  Object.defineProperty(auth, "currentUser", {
    configurable: true,
    value: user,
    writable: true,
  });
};

const passwordUser = {
  uid: "user-1",
  email: "user@example.com",
  emailVerified: true,
  providerData: [{ providerId: "password" }],
};

const safeAreaMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 24, right: 0, bottom: 24, left: 0 },
};

const mockAuthState = (user: unknown) => {
  jest.mocked(onAuthStateChanged).mockImplementationOnce((auth, observer) => {
    (observer as (nextUser: unknown) => void)(user);
    return jest.fn();
  });
};

describe("index and main screens", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    setCurrentUser(null);
  });

  it("routes anonymous users from index to login", async () => {
    mockAuthState(null);

    await render(<Index />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/login");
    });
  });

  it("routes verified users from index to main", async () => {
    mockAuthState(passwordUser);

    await render(<Index />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/main");
    });
  });

  it("routes unverified password users from index to email verification", async () => {
    mockAuthState({ ...passwordUser, emailVerified: false });

    await render(<Index />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith("/verify-email");
    });
  });

  it("renders main screen and navigates through primary actions", async () => {
    await AsyncStorage.multiSet([
      ["daily_goal_seconds", "3600"],
      [
        "study_sessions",
        JSON.stringify([
          {
            id: "session-1",
            subject: "Math",
            seconds: 1800,
            date: new Date().toISOString(),
          },
        ]),
      ],
    ]);

    const { getByTestId, getByText } = await render(
      <SafeAreaProvider initialMetrics={safeAreaMetrics}>
        <MainScreen />
      </SafeAreaProvider>,
    );

    await waitFor(() => {
      expect(getByText("StudyNet")).toBeTruthy();
    });

    await fireEvent.press(getByTestId("home-notifications-button"));
    await fireEvent.press(getByTestId("home-settings-button"));
    await fireEvent.press(getByTestId("home-dday-goal-button"));
    await fireEvent.press(getByTestId("home-start-study-button"));

    expect(mockRouter.push).toHaveBeenCalledWith("/notifications");
    expect(mockRouter.push).toHaveBeenCalledWith("/setting");
    expect(mockRouter.push).toHaveBeenCalledWith("/setting/goals");
    expect(mockRouter.push).toHaveBeenCalledWith("/subject-select");
  });
});
