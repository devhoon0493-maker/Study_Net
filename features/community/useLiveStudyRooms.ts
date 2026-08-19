import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";

import { db } from "../../utils/firebaseConfig";
import type { LiveStudyRoom } from "./communityTypes";
import { snapshotToRooms } from "./communityUtils";

export function useLiveStudyRooms() {
  const [liveRooms, setLiveRooms] = useState<LiveStudyRoom[]>([]);

  useEffect(() => {
    const unsubscribeRooms = onValue(ref(db, "rooms"), (snapshot) => {
      setLiveRooms(snapshotToRooms(snapshot.val()));
    });

    return unsubscribeRooms;
  }, []);

  return liveRooms;
}
