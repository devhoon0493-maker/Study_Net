import { onValue, ref } from "firebase/database";
import { useEffect, useState } from "react";

import { db } from "../../utils/firebaseConfig";
import type { Room } from "./groupTypes";
import { snapshotToRoom } from "./groupUtils";

type UseSelectedGroupRoomParams = {
  selectedRoomId: string | null;
  onRoomMissing: () => void;
  onRoomLoaded?: () => void;
};

export function useSelectedGroupRoom({
  selectedRoomId,
  onRoomMissing,
  onRoomLoaded,
}: UseSelectedGroupRoomParams) {
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  useEffect(() => {
    if (!selectedRoomId) {
      setSelectedRoom(null);
      return;
    }

    const roomRef = ref(db, `rooms/${selectedRoomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      if (!snapshot.exists()) {
        setSelectedRoom(null);
        onRoomMissing();
        return;
      }

      setSelectedRoom(snapshotToRoom(selectedRoomId, snapshot.val()));
      onRoomLoaded?.();
    });

    return unsubscribe;
  }, [onRoomLoaded, onRoomMissing, selectedRoomId]);

  return selectedRoom;
}
