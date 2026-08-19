import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  DEFAULT_DDAY_GOAL,
  PRIMARY_DDAY_KEY,
  formatDdayCount,
  formatDdayDate,
  getDdayCount,
  isValidDdayDate,
  loadPrimaryDdayGoal,
  savePrimaryDdayGoal,
} from "../../utils/dday";

describe("dday utils", () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-07-28T09:00:00+09:00"));
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("validates YYYY-MM-DD dates", () => {
    expect(isValidDdayDate("2026-11-19")).toBe(true);
    expect(isValidDdayDate("2026-02-29")).toBe(false);
    expect(isValidDdayDate("2028-02-29")).toBe(true);
    expect(isValidDdayDate("2026-02-31")).toBe(false);
    expect(isValidDdayDate("2026-2-1")).toBe(false);
    expect(isValidDdayDate("not-a-date")).toBe(false);
  });

  it("formats d-day dates and counts", () => {
    expect(formatDdayDate("2026-11-19")).toBe("2026.11.19");
    expect(formatDdayCount(10)).toBe("D-10");
    expect(formatDdayCount(0)).toBe("D-0");
    expect(formatDdayCount(-3)).toBe("D+3");
  });

  it("calculates days from today", () => {
    expect(getDdayCount("2026-07-28")).toBe(0);
    expect(getDdayCount("2026-07-29")).toBe(1);
    expect(getDdayCount("2026-07-27")).toBe(-1);
  });

  it("loads the default goal when storage is empty or invalid", async () => {
    await expect(loadPrimaryDdayGoal()).resolves.toEqual(DEFAULT_DDAY_GOAL);

    await AsyncStorage.setItem(PRIMARY_DDAY_KEY, "{bad json");
    await expect(loadPrimaryDdayGoal()).resolves.toEqual(DEFAULT_DDAY_GOAL);

    await AsyncStorage.setItem(
      PRIMARY_DDAY_KEY,
      JSON.stringify({ title: "Exam", targetDate: "bad-date" }),
    );
    await expect(loadPrimaryDdayGoal()).resolves.toEqual(DEFAULT_DDAY_GOAL);
  });

  it("saves and loads a valid goal", async () => {
    const goal = { title: "Final", targetDate: "2026-12-01" };

    await savePrimaryDdayGoal(goal);

    await expect(loadPrimaryDdayGoal()).resolves.toEqual(goal);
  });
});
