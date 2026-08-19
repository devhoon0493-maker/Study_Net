import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { Alert } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import StudyScreen from "../../app/study";
import SubjectSelect from "../../app/subject-select";
import { syncCurrentMemberToJoinedRooms } from "../../features/group/groupPresence";

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(() => ({ subject: "Math" })),
  useRouter: () => mockRouter,
}));

jest.mock("../../features/group/groupPresence", () => ({
  syncCurrentMemberToJoinedRooms: jest.fn(() => Promise.resolve()),
}));

jest.mock("../../utils/userProfileStorage", () => ({
  loadStoredUserProfile: jest.fn(() => Promise.resolve(null)),
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

describe("study flow screens", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("adds a custom subject and starts a study session for it", async () => {
    const { getByTestId } = await renderWithSafeArea(<SubjectSelect />);

    await waitFor(() => {
      expect(getByTestId("subject-card-0")).toBeTruthy();
    });

    await fireEvent.press(getByTestId("subject-add-open-button"));
    await fireEvent.changeText(getByTestId("subject-custom-input"), "Physics");
    await fireEvent.press(getByTestId("subject-custom-add-button"));

    await waitFor(() => {
      expect(getByTestId("subject-card-4")).toBeTruthy();
    });
    await fireEvent.press(getByTestId("subject-card-4"));

    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: "/study",
      params: { subject: "Physics" },
    });
    await expect(AsyncStorage.getItem("custom_subjects_default")).resolves.toContain(
      "Physics",
    );
  });

  it("wires study timer pause, goal modal, finish, and minimize actions", async () => {
    const { getByTestId } = await renderWithSafeArea(<StudyScreen />);

    await waitFor(() => {
      expect(getByTestId("study-pause-toggle-button")).toBeTruthy();
    });

    await fireEvent.press(getByTestId("study-pause-toggle-button"));
    await fireEvent.press(getByTestId("study-goal-button"));
    await waitFor(() => {
      expect(getByTestId("study-goal-cancel-button")).toBeTruthy();
    });
    await fireEvent.press(getByTestId("study-goal-cancel-button"));
    await fireEvent.press(getByTestId("study-finish-button"));
    await fireEvent.press(getByTestId("study-minimize-button"));

    expect(Alert.alert).toHaveBeenCalled();
    await waitFor(() => {
      expect(syncCurrentMemberToJoinedRooms).toHaveBeenCalled();
      expect(mockRouter.replace).toHaveBeenCalledWith(
        expect.objectContaining({ pathname: "/main" }),
      );
    });
  });
});
