import type { VISIBILITY_OPTIONS } from "./groupConstants";

export type Screen = "lobby" | "room";

export type RoomVisibility = (typeof VISIBILITY_OPTIONS)[number]["value"];

export type Member = {
  id: string;
  name: string;
  color: string;
  image?: string | null;
  userType?: string;
  bio?: string;
  studyStatusPublic?: boolean;
  speaking?: boolean;
  status?: string;
  joinedAt?: number;
  studyStartEpoch?: number | null;
  online?: boolean;
  lastSeenAt?: number;
};

export type Room = {
  id: string;
  ownerId: string;
  deputy1Id?: string;
  deputy2Id?: string;
  name: string;
  emoji: string;
  subjects: string;
  color: string;
  max: number;
  code: string;
  visibility: RoomVisibility;
  createdAt?: number;
  members: Member[];
};

export type StoredMember = {
  id: string;
  name: string;
  color: string;
  image?: string | null;
  userType?: string;
  bio?: string;
};

export type ActiveSessionData = {
  subject?: string;
  startEpoch?: number;
  savedSeconds?: number;
  running?: boolean;
  goalSeconds?: number;
};

export type RoomMemberRecord = Partial<Member>;

export type RoomRecord = {
  ownerId?: string;
  deputy1Id?: string;
  deputy2Id?: string;
  name?: string;
  emoji?: string;
  subjects?: string;
  color?: string;
  max?: number;
  code?: string;
  visibility?: RoomVisibility;
  createdAt?: number;
  members?: Record<string, RoomMemberRecord>;
};
