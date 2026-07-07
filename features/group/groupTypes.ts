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
  speaking?: boolean;
  status?: string;
  joinedAt?: number;
  studyStartEpoch?: number | null;
};

export type Room = {
  id: string;
  ownerId: string;
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
  goalSeconds?: number;
};

export type RoomMemberRecord = Partial<Member>;

export type RoomRecord = {
  ownerId?: string;
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
