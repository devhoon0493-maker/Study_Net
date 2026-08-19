import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Alert } from "react-native";

import {
  DEFAULT_DDAY_GOAL,
  isValidDdayDate,
  loadPrimaryDdayGoal,
  savePrimaryDdayGoal,
} from "../../utils/dday";

const DAILY_GOAL_KEY = "daily_goal_seconds";
const WEEKLY_GOAL_KEY = "weekly_goal_seconds";
const STREAK_GOAL_KEY = "streak_goal_days";

export const DAILY_GOAL_OPTIONS = [
  { label: "1시간", value: 60 * 60 },
  { label: "2시간", value: 60 * 60 * 2 },
  { label: "3시간", value: 60 * 60 * 3 },
  { label: "5시간", value: 60 * 60 * 5 },
];

export const WEEKLY_GOAL_OPTIONS = [
  { label: "5시간", value: 60 * 60 * 5 },
  { label: "10시간", value: 60 * 60 * 10 },
  { label: "20시간", value: 60 * 60 * 20 },
  { label: "30시간", value: 60 * 60 * 30 },
];

export const STREAK_GOAL_OPTIONS = [
  { label: "3일", value: 3 },
  { label: "7일", value: 7 },
  { label: "14일", value: 14 },
  { label: "30일", value: 30 },
];

const parseStoredPositiveNumber = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export function useGoalSettingsForm() {
  const [dailyGoal, setDailyGoal] = useState(DAILY_GOAL_OPTIONS[2].value);
  const [weeklyGoal, setWeeklyGoal] = useState(WEEKLY_GOAL_OPTIONS[1].value);
  const [streakGoal, setStreakGoal] = useState(STREAK_GOAL_OPTIONS[1].value);
  const [ddayTitle, setDdayTitle] = useState(DEFAULT_DDAY_GOAL.title);
  const [ddayDate, setDdayDate] = useState(DEFAULT_DDAY_GOAL.targetDate);

  useEffect(() => {
    const load = async () => {
      const [daily, weekly, streak, dday] = await Promise.all([
        AsyncStorage.getItem(DAILY_GOAL_KEY),
        AsyncStorage.getItem(WEEKLY_GOAL_KEY),
        AsyncStorage.getItem(STREAK_GOAL_KEY),
        loadPrimaryDdayGoal(),
      ]);

      setDailyGoal(parseStoredPositiveNumber(daily, DAILY_GOAL_OPTIONS[2].value));
      setWeeklyGoal(parseStoredPositiveNumber(weekly, WEEKLY_GOAL_OPTIONS[1].value));
      setStreakGoal(parseStoredPositiveNumber(streak, STREAK_GOAL_OPTIONS[1].value));
      setDdayTitle(dday.title);
      setDdayDate(dday.targetDate);
    };

    load();
  }, []);

  const saveDailyGoal = (value: number) =>
    saveNumber(DAILY_GOAL_KEY, value, setDailyGoal);

  const saveWeeklyGoal = (value: number) =>
    saveNumber(WEEKLY_GOAL_KEY, value, setWeeklyGoal);

  const saveStreakGoal = (value: number) =>
    saveNumber(STREAK_GOAL_KEY, value, setStreakGoal);

  const saveDday = async () => {
    const title = ddayTitle.trim();
    const targetDate = ddayDate.trim();

    if (title.length < 1) {
      Alert.alert("입력 확인", "D-Day 목표 이름을 입력해주세요.");
      return;
    }

    if (!isValidDdayDate(targetDate)) {
      Alert.alert("날짜 확인", "날짜는 YYYY-MM-DD 형식으로 입력해주세요.");
      return;
    }

    await savePrimaryDdayGoal({ title, targetDate });
    setDdayTitle(title);
    setDdayDate(targetDate);
    Alert.alert("저장 완료", "메인 화면 D-Day가 변경됐어요.");
  };

  return {
    dailyGoal,
    weeklyGoal,
    streakGoal,
    ddayTitle,
    setDdayTitle,
    ddayDate,
    setDdayDate,
    saveDailyGoal,
    saveWeeklyGoal,
    saveStreakGoal,
    saveDday,
  };
}

const saveNumber = async (
  key: string,
  value: number,
  setter: (value: number) => void,
) => {
  setter(value);
  await AsyncStorage.setItem(key, String(value));
};
