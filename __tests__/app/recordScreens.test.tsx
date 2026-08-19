import { fireEvent, render, waitFor } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import CalendarScreen from "../../app/calendar";
import StatisticsScreen from "../../app/statistics";
import {
  loadStudySessions,
  toDateKey,
  type StudySession,
} from "../../utils/studySessions";

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
  usePathname: jest.fn(() => "/calendar"),
  useRouter: () => mockRouter,
}));

jest.mock("../../components/BottomNav", () => ({
  __esModule: true,
  default: () => null,
  getBottomNavSpace: jest.fn((bottomInset: number) => 80 + bottomInset),
}));

jest.mock("../../utils/studySessions", () => {
  const actual = jest.requireActual("../../utils/studySessions");
  return {
    ...actual,
    loadStudySessions: jest.fn(),
  };
});

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

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(today.getDate() - 1);

const sessions: StudySession[] = [
  {
    subject: "Math",
    seconds: 3600,
    date: today.toISOString(),
  },
  {
    subject: "Physics",
    seconds: 1800,
    date: yesterday.toISOString(),
  },
];

describe("record screens", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(loadStudySessions).mockResolvedValue(sessions);
  });

  it("renders study statistics from stored sessions and handles back navigation", async () => {
    const { getByTestId, getByText } = await renderWithSafeArea(
      <StatisticsScreen />,
    );

    await waitFor(() => {
      expect(getByTestId("statistics-subject-row-Math")).toBeTruthy();
      expect(getByText("Physics")).toBeTruthy();
    });

    await fireEvent.press(getByTestId("statistics-back-button"));

    expect(loadStudySessions).toHaveBeenCalled();
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it("renders calendar sessions and wires month controls", async () => {
    const todayKey = toDateKey(today);
    const { getAllByText, getByTestId } = await renderWithSafeArea(
      <CalendarScreen />,
    );

    await waitFor(() => {
      expect(getByTestId(`calendar-day-${todayKey}`)).toBeTruthy();
      expect(getAllByText("Math").length).toBeGreaterThan(0);
    });

    await fireEvent.press(getByTestId("calendar-prev-month-button"));
    await fireEvent.press(getByTestId("calendar-next-month-button"));
    await fireEvent.press(getByTestId("calendar-month-picker-button"));

    await waitFor(() => {
      expect(getByTestId("calendar-picker-month-0")).toBeTruthy();
    });

    await fireEvent.press(getByTestId("calendar-today-button"));
    await fireEvent.press(getByTestId(`calendar-day-${todayKey}`));
    await fireEvent.press(getByTestId("calendar-back-button"));

    expect(getByTestId("calendar-session-row-0")).toBeTruthy();
    expect(loadStudySessions).toHaveBeenCalled();
    expect(mockRouter.back).toHaveBeenCalled();
  });
});
