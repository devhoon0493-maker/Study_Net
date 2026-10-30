import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "firebase/auth";
import { get, onDisconnect, ref, update } from "firebase/database";

import { auth, db } from "../../utils/firebaseConfig";
import { loadStudyStatusPublic } from "../../utils/privacySettings";
import { loadStoredUserProfile, type StoredUserProfile } from "../../utils/userProfileStorage";
import { MEMBER_KEY } from "./groupConstants";
import type { RoomRecord, StoredMember } from "./groupTypes";
import { getColorFromId, getCurrentStudySession, getVisibleStudySession } from "./groupUtils";

type StudyPresence = {
  status: string;
  studyStartEpoch: number | null;
};

const loadStoredMember = async () => {
  const raw = await AsyncStorage.getItem(MEMBER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredMember;
  } catch {
    return null;
  }
};

const loadStoredProfile = async () => {
  return loadStoredUserProfile();
};

const memberFromUser = (
  user: User,
  profile: StoredUserProfile | null,
  storedMember: StoredMember | null,
): StoredMember => ({
  id: user.uid,
  name:
    profile?.name ||
    storedMember?.name ||
    user.displayName ||
    user.email?.split("@")[0] ||
    "학생",
  color: storedMember?.color || profile?.color || getColorFromId(user.uid),
  image: profile?.image ?? user.photoURL ?? storedMember?.image ?? null,
  userType: profile?.userType ?? storedMember?.userType ?? "",
  bio: profile?.bio ?? storedMember?.bio ?? "",
});

const loadCurrentMember = async () => {
  const [storedMember, profile] = await Promise.all([
    loadStoredMember(),
    loadStoredProfile(),
  ]);
  const user = auth.currentUser;

  if (!user) return storedMember;

  const member = memberFromUser(user, profile, storedMember);
  await AsyncStorage.setItem(MEMBER_KEY, JSON.stringify(member));
  return member;
};

export const syncCurrentMemberToJoinedRooms = async ({
  online = true,
  session,
}: {
  online?: boolean;
  session?: StudyPresence;
} = {}) => {
  const member = await loadCurrentMember();
  if (!member) return;

  const roomIndexSnapshot = await get(ref(db, `userRooms/${member.id}`));
  const roomIndex =
    (roomIndexSnapshot.val() as Record<string, boolean | RoomRecord> | null) ??
    {};
  const indexedRoomIds = Object.entries(roomIndex)
    .filter(([, value]) => value === true)
    .map(([roomId]) => roomId);
  const legacyRoomEntries = Object.entries(roomIndex).filter(
    ([, value]) => value && typeof value === "object",
  ) as Array<[string, RoomRecord]>;

  let roomEntries: Array<[string, RoomRecord | null]>;
  let recoveredRoomIds: string[] = [];
  if (legacyRoomEntries.length > 0) {
    roomEntries = legacyRoomEntries;
  } else if (indexedRoomIds.length > 0) {
    roomEntries = await Promise.all(
      indexedRoomIds.map(async (roomId) => {
        const snapshot = await get(ref(db, `rooms/${roomId}`));
        return [roomId, (snapshot.val() as RoomRecord | null) ?? null] as const;
      }),
    );
  } else {
    // Older memberships may predate the userRooms index. Recover them once
    // from the rooms the signed-in user can read, then repair the index below.
    const roomsSnapshot = await get(ref(db, "rooms"));
    const allRooms =
      (roomsSnapshot.val() as Record<string, RoomRecord> | null) ?? {};
    roomEntries = Object.entries(allRooms).filter(([, room]) =>
      Boolean(room.members?.[member.id]),
    );
    recoveredRoomIds = roomEntries.map(([roomId]) => roomId);
  }
  if (roomEntries.length === 0) return;

  const nextSession = session ?? (await getCurrentStudySession());
  const studyStatusPublic = await loadStudyStatusPublic();
  const now = Date.now();
  const updates: Record<string, unknown> = {};
  const disconnects: Promise<void>[] = [];

  for (const roomId of recoveredRoomIds) {
    updates[`userRooms/${member.id}/${roomId}`] = true;
  }

  for (const [roomId, room] of roomEntries) {
    if (!room) {
      updates[`userRooms/${member.id}/${roomId}`] = null;
      continue;
    }
    const previous = room.members?.[member.id];
    if (!previous) {
      updates[`userRooms/${member.id}/${roomId}`] = null;
      continue;
    }

    const memberRef = ref(db, `rooms/${roomId}/members/${member.id}`);
    disconnects.push(
      onDisconnect(memberRef).update({ online: false, lastSeenAt: now }),
    );

    updates[`rooms/${roomId}/members/${member.id}`] = {
      ...previous,
      name: member.name,
      color: member.color,
      image: member.image ?? null,
      userType: member.userType ?? "",
      bio: member.bio ?? "",
      studyStatusPublic,
      speaking: previous.speaking ?? false,
      online,
      lastSeenAt: now,
      ...getVisibleStudySession(nextSession, studyStatusPublic),
    };
  }

  if (Object.keys(updates).length > 0) {
    await Promise.all(disconnects);
    await update(ref(db), updates);
  }
};
