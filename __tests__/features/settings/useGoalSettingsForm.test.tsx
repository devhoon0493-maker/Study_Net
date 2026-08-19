import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import {
  DAILY_GOAL_OPTIONS,
  STREAK_GOAL_OPTIONS,
  WEEKLY_GOAL_OPTIONS,
  useGoalSettingsForm,
} from "../../../features/settings/useGoalSettingsForm";
import { PRIMARY_DDAY_KEY } from "../../../utils/dday";

describe("useGoalSettingsForm", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads stored goal values and d-day goal", async () => {
    await AsyncStorage.multiSet([
      ["daily_goal_seconds", "3600"],
      ["weekly_goal_seconds", "18000"],
      ["streak_goal_days", "14"],
      [
        PRIMARY_DDAY_KEY,
        JSON.stringify({ title: "Exam", targetDate: "2026-12-01" }),
      ],
    ]);

    const { result } = await renderHook(() => useGoalSettingsForm());

    await waitFor(() => {
      expect(result.current.dailyGoal).toBe(3600);
      expect(result.current.weeklyGoal).toBe(18000);
      expect(result.current.streakGoal).toBe(14);
      expect(result.current.ddayTitle).toBe("Exam");
      expect(result.current.ddayDate).toBe("2026-12-01");
    });
  });

  it("uses defaults before stored values are changed", async () => {
    const { result } = await renderHook(() => useGoalSettingsForm());

    expect(result.current.dailyGoal).toBe(DAILY_GOAL_OPTIONS[2].value);
    expect(result.current.weeklyGoal).toBe(WEEKLY_GOAL_OPTIONS[1].value);
    expect(result.current.streakGoal).toBe(STREAK_GOAL_OPTIONS[1].value);
  });

  it("ignores invalid stored numeric goals", async () => {
    await AsyncStorage.multiSet([
      ["daily_goal_seconds", "bad"],
      ["weekly_goal_seconds", "0"],
      ["streak_goal_days", "-3"],
    ]);

    const { result } = await renderHook(() => useGoalSettingsForm());

    await waitFor(() => {
      expect(result.current.dailyGoal).toBe(DAILY_GOAL_OPTIONS[2].value);
      expect(result.current.weeklyGoal).toBe(WEEKLY_GOAL_OPTIONS[1].value);
      expect(result.current.streakGoal).toBe(STREAK_GOAL_OPTIONS[1].value);
    });
  });

  it("saves numeric goals to AsyncStorage", async () => {
    const { result } = await renderHook(() => useGoalSettingsForm());

    await act(async () => {
      await result.current.saveDailyGoal(7200);
      await result.current.saveWeeklyGoal(36000);
      await result.current.saveStreakGoal(30);
    });

    expect(result.current.dailyGoal).toBe(7200);
    await expect(AsyncStorage.getItem("daily_goal_seconds")).resolves.toBe(
      "7200",
    );
    await expect(AsyncStorage.getItem("weekly_goal_seconds")).resolves.toBe(
      "36000",
    );
    await expect(AsyncStorage.getItem("streak_goal_days")).resolves.toBe("30");
  });

  it("validates and saves d-day settings", async () => {
    const { result } = await renderHook(() => useGoalSettingsForm());

    await act(async () => {
      result.current.setDdayTitle("");
      result.current.setDdayDate("2026-12-01");
    });
    await act(async () => {
      await result.current.saveDday();
    });
    expect(Alert.alert).toHaveBeenCalled();

    jest.mocked(Alert.alert).mockClear();

    await act(async () => {
      result.current.setDdayTitle("Final");
      result.current.setDdayDate("bad-date");
    });
    await act(async () => {
      await result.current.saveDday();
    });
    expect(Alert.alert).toHaveBeenCalled();

    jest.mocked(Alert.alert).mockClear();

    await act(async () => {
      result.current.setDdayTitle(" Final ");
      result.current.setDdayDate("2026-12-01");
    });
    await act(async () => {
      await result.current.saveDday();
    });

    await expect(AsyncStorage.getItem(PRIMARY_DDAY_KEY)).resolves.toBe(
      JSON.stringify({ title: "Final", targetDate: "2026-12-01" }),
    );
    expect(result.current.ddayTitle).toBe("Final");
    expect(Alert.alert).toHaveBeenCalled();
  });
});
