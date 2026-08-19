export type StoredSession = {
  subject: string;
  seconds: number;
  date: string | number | Date;
};

export type WeeklyDay = {
  key: string;
  label: string;
  seconds: number;
};

export type SubjectShare = {
  subject: string;
  seconds: number;
  color: string;
};

export type ActiveSessionData = {
  subject: string;
  startEpoch?: number;
  savedSeconds?: number;
  running?: boolean;
  goalSeconds: number;
};
