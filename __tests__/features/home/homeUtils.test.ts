import {
  formatClock,
  formatCompactDuration,
  formatStatDuration,
  getWeekStart,
  toDateKey,
} from "../../../features/home/homeUtils";

describe("home utils", () => {
  it("formats date keys with zero padding", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("formats timer clocks safely", () => {
    expect(formatClock(0)).toBe("00:00:00");
    expect(formatClock(3661)).toBe("01:01:01");
    expect(formatClock(-10)).toBe("00:00:00");
    expect(formatClock(3.9)).toBe("00:00:03");
  });

  it("formats durations with meaningful non-empty labels", () => {
    expect(formatCompactDuration(0)).toMatch(/\S+/);
    expect(formatCompactDuration(60)).toMatch(/1/);
    expect(formatCompactDuration(3660)).toMatch(/1/);
    expect(formatStatDuration(3600)).toMatch(/1/);
    expect(formatStatDuration(3660)).toContain("1h");
  });

  it("finds Monday as the start of the week", () => {
    expect(toDateKey(getWeekStart(new Date(2026, 6, 29)))).toBe("2026-07-27");
    expect(toDateKey(getWeekStart(new Date(2026, 6, 26)))).toBe("2026-07-20");
  });
});
