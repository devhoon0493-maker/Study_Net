import { onValue, ref, set } from "firebase/database";
import { useEffect, useState } from "react";

import { db } from "../../utils/firebaseConfig";

export type GroupAnnouncement = {
  text: string;
  authorId: string;
  authorName: string;
  updatedAt: number;
};

export function useGroupAnnouncement(roomId?: string) {
  const [announcement, setAnnouncement] = useState<GroupAnnouncement | null>(null);

  useEffect(() => {
    if (!roomId) {
      setAnnouncement(null);
      return;
    }

    return onValue(ref(db, `roomAnnouncements/${roomId}`), (snapshot) => {
      const value = snapshot.val() as GroupAnnouncement | null;
      setAnnouncement(value?.text ? value : null);
    });
  }, [roomId]);

  return announcement;
}

export async function saveGroupAnnouncement(
  roomId: string,
  announcement: GroupAnnouncement | null,
) {
  await set(ref(db, `roomAnnouncements/${roomId}`), announcement);
}
