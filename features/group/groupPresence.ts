import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "firebase/auth";
import { get, onDisconnect, ref, update } from "firebase/database";

import { auth, db } from "../../utils/firebaseConfig";
import { MEMBER_KEY } from "./groupConstants";
import type { RoomMemberRecord, RoomRecord, StoredMember } from "./groupTypes";
import { getColorFromId, getCurrentStudySession } from "./groupUtils";

type StudyPresence = {
  status: string;
  studyStartEpoch: number | null;
};

type StoredProfile = {
  uid?: string;
  name?: string;
  email?: string;
  image?: string | null;
  userType?: string;
  bio?: string;
  color?: string;
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
  const raw = await AsyncStorage.getItem("userProfile");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as StoredProfile;
  } catch {
    return null;
  }
};

const memberFromUser = (
  user: User,
  profile: StoredProfile | null,
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

  const roomsSnapshot = await get(ref(db, "rooms"));
  const rooms = roomsSnapshot.val() as Record<string, RoomRecord> | null;
  if (!rooms) return;

  const nextSession = session ?? (await getCurrentStudySession());
  const now = Date.now();
  const updates: Record<string, RoomMemberRecord> = {};
  const disconnects: Promise<void>[] = [];

  for (const [roomId, room] of Object.entries(rooms)) {
    const previous = room.members?.[member.id];
    if (!previous) continue;

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
      speaking: previous.speaking ?? false,
      online,
      lastSeenAt: now,
      ...nextSession,
    };
  }

  if (Object.keys(updates).length > 0) {
    await Promise.all(disconnects);
    await update(ref(db), updates);
  }
};
