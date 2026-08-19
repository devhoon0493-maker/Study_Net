import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  STUDY_SESSIONS_KEY,
  formatStudyDuration,
  loadStudySessions,
  toDateKey,
} from "../../utils/studySessions";

describe("study session helpers", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("formats date keys with zero padding", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(toDateKey(new Date(2026, 10, 19))).toBe("2026-11-19");
  });

  it("formats study durations from safe whole minutes", () => {
    expect(formatStudyDuration(-1)).toMatch(/\S+/);
    expect(formatStudyDuration(59)).toMatch(/\S+/);
    expect(formatStudyDuration(60)).toMatch(/1/);
    expect(formatStudyDuration(3600)).toMatch(/1/);
    expect(formatStudyDuration(3660)).toMatch(/1/);
    expect(formatStudyDuration(3660.9)).toBe(formatStudyDuration(3660));
  });

  it("loads an empty list when storage is empty or malformed", async () => {
    await expect(loadStudySessions()).resolves.toEqual([]);

    await AsyncStorage.setItem(STUDY_SESSIONS_KEY, "{bad json");
    await expect(loadStudySessions()).resolves.toEqual([]);

    await AsyncStorage.setItem(
      STUDY_SESSIONS_KEY,
      JSON.stringify({ seconds: 60, subject: "Math", date: "2026-07-28" }),
    );
    await expect(loadStudySessions()).resolves.toEqual([]);
  });

  it("filters invalid persisted sessions", async () => {
    const valid = { seconds: 120, subject: "Math", date: "2026-07-28" };
    await AsyncStorage.setItem(
      STUDY_SESSIONS_KEY,
      JSON.stringify([
        valid,
        { seconds: Number.NaN, subject: "Math", date: "2026-07-28" },
        { seconds: 60, subject: "", date: "2026-07-28" },
        { seconds: 60, subject: "Math", date: "" },
        null,
      ]),
    );

    await expect(loadStudySessions()).resolves.toEqual([valid]);
  });
});
