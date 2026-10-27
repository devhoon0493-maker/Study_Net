import { useEffect, useState } from "react";
import { onValue, push, ref, remove, set } from "firebase/database";

import { auth, db } from "../../utils/firebaseConfig";

export type BlockedUser = {
  uid: string;
  name: string;
  image?: string | null;
  createdAt: number;
};

export function useCommunityModeration() {
  const uid = auth.currentUser?.uid;
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!uid) {
      setBlockedUsers([]);
      setBlockedUserIds(new Set());
      return;
    }
    return onValue(ref(db, `blockedUsers/${uid}`), (snapshot) => {
      const records = snapshot.val() ?? {};
      const users = Object.entries(records).map(([blockedUid, value]) => {
        const record = (value ?? {}) as Partial<BlockedUser>;
        return {
          uid: blockedUid,
          name: record.name || "사용자",
          image: record.image ?? null,
          createdAt: record.createdAt ?? 0,
        };
      });
      setBlockedUsers(users.sort((a, b) => b.createdAt - a.createdAt));
      setBlockedUserIds(new Set(users.map((user) => user.uid)));
    });
  }, [uid]);

  const blockUser = async (user: { uid: string; name: string; image?: string | null }) => {
    if (!uid || !user.uid || uid === user.uid) return;
    await set(ref(db, `blockedUsers/${uid}/${user.uid}`), {
      uid: user.uid,
      name: user.name.slice(0, 40) || "사용자",
      image: user.image ?? null,
      createdAt: Date.now(),
    });
  };

  const unblockUser = async (blockedUid: string) => {
    if (!uid || !blockedUid) return;
    await remove(ref(db, `blockedUsers/${uid}/${blockedUid}`));
  };

  const reportUser = async (target: {
    uid: string;
    type: "user" | "post" | "comment";
    targetId?: string;
  }) => {
    if (!uid || !target.uid || uid === target.uid) return;
    const reportRef = push(ref(db, `userReports/${uid}`));
    await set(reportRef, {
      reporterId: uid,
      targetUid: target.uid,
      targetType: target.type,
      ...(target.targetId ? { targetId: target.targetId } : {}),
      reason: "사용자 신고",
      createdAt: Date.now(),
    });
  };

  return { blockedUsers, blockedUserIds, blockUser, unblockUser, reportUser };
}
