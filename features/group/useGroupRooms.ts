import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";

import { db } from "../../utils/firebaseConfig";
import type { Room, RoomRecord } from "./groupTypes";
import { snapshotToRoom } from "./groupUtils";

export function useGroupRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    const unsubscribe = onValue(ref(db, "rooms"), (snapshot) => {
      const rawRooms = snapshot.val() as Record<string, RoomRecord> | null;

      if (!rawRooms) {
        setRooms([]);
        return;
      }

      const nextRooms = Object.entries(rawRooms)
        .map(([id, raw]) => snapshotToRoom(id, raw))
        .sort((a, b) => (b.createdAt as number) - (a.createdAt as number));

      setRooms(nextRooms);
    });

    return unsubscribe;
  }, []);

  return rooms;
}
