import AsyncStorage from "@react-native-async-storage/async-storage";

export type StudySession = {
  seconds: number;
  subject: string;
  date: string;
};

export const STUDY_SESSIONS_KEY = "study_sessions";

const pad = (value: number) => String(value).padStart(2, "0");

const isStudySession = (item: unknown): item is StudySession => {
  if (!item || typeof item !== "object") return false;

  const session = item as Partial<StudySession>;
  return (
    typeof session.seconds === "number" &&
    Number.isFinite(session.seconds) &&
    typeof session.subject === "string" &&
    session.subject.length > 0 &&
    typeof session.date === "string" &&
    session.date.length > 0
  );
};

export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const formatStudyDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0 && minutes > 0) return `${hours}시간 ${minutes}분`;
  if (hours > 0) return `${hours}시간`;
  if (minutes > 0) return `${minutes}분`;
  return "0분";
};

export const loadStudySessions = async (): Promise<StudySession[]> => {
  try {
    const raw = await AsyncStorage.getItem(STUDY_SESSIONS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isStudySession) : [];
  } catch {
    return [];
  }
};
