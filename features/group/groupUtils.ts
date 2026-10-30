import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  ACTIVE_SESSION_KEY,
  CODE_LENGTH,
  COLORS,
  MAX_GROUP_MEMBERS,
  MIN_GROUP_MEMBERS,
} from "./groupConstants";
import type { ActiveSessionData, Member, Room, RoomRecord } from "./groupTypes";

export const withAlpha = (color: string, alpha: string) => {
  if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
    const [, r, g, b] = color;
    return `#${r}${r}${g}${g}${b}${b}${alpha}`;
  }

  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return `${color}${alpha}`;

  return color;
};

export const getMemberSliderRatio = (value: number) =>
  (value - MIN_GROUP_MEMBERS) / (MAX_GROUP_MEMBERS - MIN_GROUP_MEMBERS);

export const makeCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: CODE_LENGTH },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
};

export const getInitial = (name: string) => name.trim().slice(0, 1) || "?";

export const getColorFromId = (id: string) => {
  const total = Array.from(id).reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  return COLORS[total % COLORS.length];
};

export const formatTimer = (joinedAt?: number, now = Date.now()) => {
  if (!joinedAt) return "00:00:00";
  const total = Math.max(0, Math.floor((now - joinedAt) / 1000));
  const h = String(Math.floor(total / 3600)).padStart(2, "0");
  const m = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
};

export const isMemberStudying = (member: Member) =>
  member.studyStatusPublic === false
    ? member.isStudying ?? !!member.studyStartEpoch
    : !!member.studyStartEpoch;

export const getVisibleStudySession = <
  T extends { status: string; studyStartEpoch: number | null },
>(
  session: T,
  isPublic: boolean,
): T & { isStudying: boolean } =>
  {
    const isStudying = !!session.studyStartEpoch;
    return {
      ...session,
      status: isPublic
        ? session.status
        : isStudying
          ? "공부 중"
          : "아직 공부를 시작하지 않았어요",
      studyStartEpoch: isPublic ? session.studyStartEpoch : null,
      isStudying,
    };
  };

export const isMemberOnline = (member: Member, now = Date.now()) => {
  if (member.online === false) return false;
  if (member.online === true) return true;
  if (!member.lastSeenAt) return member.online === true || !!member.studyStartEpoch;

  return now - member.lastSeenAt < 30_000;
};

export const getCurrentStudySession = async () => {
  const raw = await AsyncStorage.getItem(ACTIVE_SESSION_KEY);
  if (!raw) return { status: "접속중", studyStartEpoch: null };

  try {
    const session: ActiveSessionData = JSON.parse(raw);
    if (session.running === false) {
      return { status: "접속중", studyStartEpoch: null };
    }

    return {
      status: session.subject?.trim() || "공부 중",
      studyStartEpoch: session.startEpoch ?? null,
    };
  } catch {
    return { status: "공부 중", studyStartEpoch: null };
  }
};

export const snapshotToRoom = (id: string, raw: RoomRecord): Room => ({
  id,
  ownerId: raw.ownerId ?? "",
  deputy1Id: raw.deputy1Id,
  deputy2Id: raw.deputy2Id,
  name: raw.name ?? "스터디 그룹",
  emoji: raw.emoji ?? "📚",
  subjects: raw.subjects ?? "자유 공부",
  color: raw.color ?? COLORS[0],
  max: Math.min(raw.max ?? MAX_GROUP_MEMBERS, MAX_GROUP_MEMBERS),
  code: raw.code ?? "",
  visibility: raw.visibility ?? "public",
  createdAt: raw.createdAt ?? 0,
  members: Object.entries(raw.members ?? {}).map(
    ([memberId, m]) => ({
      id: memberId,
      name: m.name ?? "학생",
      color: m.color ?? COLORS[0],
      image: m.image ?? null,
      userType: m.userType ?? "",
      bio: m.bio ?? "",
      speaking: m.speaking ?? false,
      status: m.status ?? "공부 중",
      joinedAt: m.joinedAt,
      studyStartEpoch: m.studyStartEpoch ?? null,
      isStudying: m.isStudying ?? undefined,
      studyStatusPublic: m.studyStatusPublic ?? true,
      online: m.online ?? false,
      lastSeenAt:
        typeof m.lastSeenAt === "number" ? m.lastSeenAt : undefined,
    }),
  ),
});
