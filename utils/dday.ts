import AsyncStorage from "@react-native-async-storage/async-storage";

export const PRIMARY_DDAY_KEY = "primary_dday_goal";

export type DdayGoal = {
  title: string;
  targetDate: string;
};

export const DEFAULT_DDAY_GOAL: DdayGoal = {
  title: "수능",
  targetDate: "2026-11-19",
};

export const isValidDdayDate = (value: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(new Date(`${value}T00:00:00`).getTime());

export const getDdayCount = (targetDate: string) => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const target = new Date(`${targetDate}T00:00:00`).getTime();
  return Math.ceil((target - start) / (1000 * 60 * 60 * 24));
};

export const formatDdayDate = (targetDate: string) => targetDate.replaceAll("-", ".");

export const formatDdayCount = (count: number) =>
  count >= 0 ? `D-${count}` : `D+${Math.abs(count)}`;

export const loadPrimaryDdayGoal = async (): Promise<DdayGoal> => {
  try {
    const raw = await AsyncStorage.getItem(PRIMARY_DDAY_KEY);
    if (!raw) return DEFAULT_DDAY_GOAL;

    const parsed: Partial<DdayGoal> = JSON.parse(raw);
    if (!parsed.title || !parsed.targetDate || !isValidDdayDate(parsed.targetDate)) {
      return DEFAULT_DDAY_GOAL;
    }

    return {
      title: parsed.title,
      targetDate: parsed.targetDate,
    };
  } catch {
    return DEFAULT_DDAY_GOAL;
  }
};

export const savePrimaryDdayGoal = async (goal: DdayGoal) => {
  await AsyncStorage.setItem(PRIMARY_DDAY_KEY, JSON.stringify(goal));
};
